import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useBlocker, useParams } from 'react-router-dom';
import { createEmptyMedicalReport, patientDisplayName, CONSULTATION_TYPE_LABELS, type Consultation, type MedicalReport } from '@stelia/contracts';
import { Dialog } from '../components/common/Dialog';
import { Navbar } from '../components/layout/Navbar';
import { PageHeader } from '../components/layout/PageHeader';
import { RecorderPanel, type RecorderHandle } from '../components/recorder/RecorderPanel';
import { TranscriptBox } from '../components/recorder/TranscriptBox';
import { PatientPanel } from '../components/consultation/PatientPanel';
import { MedicalReportEditor } from '../components/consultation/MedicalReportEditor';
import { consultationService } from '../services/consultationService';
import { ApiError, errorMessage, isAbortError } from '../services/http';
import { useConsultationDraft } from '../hooks/useConsultationDraft';
import { useAuth } from '../auth/context';
import { SessionRecovery } from '../auth/SessionRecovery';

export function ConsultationWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  if (!id) return <main>Identifiant de consultation manquant.</main>;
  return <WorkspaceLoader key={`${session?.user.id}:${id}`} id={id} />;
}

function WorkspaceLoader({ id }: { id: string }) {
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    consultationService.getConsultation(id, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setConsultation(data); })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) return;
        if (cause instanceof ApiError && cause.status === 404) setNotFound(true);
        else setError(errorMessage(cause));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, attempt]);
  if (!loading && consultation && !error && !notFound) return <Workspace initial={consultation} />;
  return <div className="min-h-screen"><Navbar /><main className="p-8 max-w-4xl mx-auto">
    {loading ? <p role="status">Chargement de la consultation…</p> : notFound ? <h1 className="text-xl font-bold">Consultation introuvable</h1> : <p role="alert" className="text-red-600">{error}</p>}
    {!loading && error && <button type="button" onClick={() => { setLoading(true); setError(null); setNotFound(false); setAttempt((value) => value + 1); }} className="mt-4 text-brand-blue">Réessayer</button>}
    <Link to="/" className="block mt-6 text-brand-blue">Retour aux consultations</Link>
  </main></div>;
}

function Workspace({ initial }: { initial: Consultation }) {
  const { consultation, text, dirty, status, error, failureStatus, draft } = useConsultationDraft(initial);
  const { session } = useAuth();
  const [initialUsername] = useState(() => session!.user.username);
  const recorder = useRef<RecorderHandle>(null);
  const [speechActive, setSpeechActive] = useState(false);
  const [pending, setPending] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [remoteConflict, setRemoteConflict] = useState<Consultation | null>(null);
  const [reportData, setReportData] = useState<MedicalReport | null>(initial.reportProposal?.data || null);
  const [reportMode, setReportMode] = useState<'proposal' | 'manual'>('proposal');
  const [reportDirty, setReportDirty] = useState(false);
  const [reviewedTranscript, setReviewedTranscript] = useState<string | null>(null);
  const reviewed = reviewedTranscript !== null && reviewedTranscript === text;
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const action = useRef<Promise<void> | null>(null);
  const reportDirtyRef = useRef(reportDirty);
  const markReportDirty = (value: boolean) => { reportDirtyRef.current = value; setReportDirty(value); };
  const blocker = useBlocker(dirty || speechActive || pending || reportDirty);
  const transitionStarted = useRef(false);

  const flush = useCallback(async () => {
    let speechError: unknown;
    try { await recorder.current?.stop(); } catch (cause) { speechError = cause; }
    await draft.save();
    if (speechError) throw speechError;
  }, [draft]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty && !speechActive && !pending && !reportDirty) return;
      event.preventDefault(); event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty, speechActive, pending, reportDirty]);

  useEffect(() => {
    if (blocker.state !== 'blocked') { transitionStarted.current = false; return; }
    if (transitionStarted.current) return;
    transitionStarted.current = true;
    const proceed = blocker.proceed;
    if (reportDirtyRef.current) { setLeaveError('Les modifications du compte rendu ne sont pas encore validées.'); return; }
    void (async () => {
      try {
        await action.current;
        await flush();
        if (reportDirtyRef.current) { setLeaveError('Les modifications du compte rendu ne sont pas encore validées.'); return; }
        proceed();
      } catch (cause) { setLeaveError(errorMessage(cause)); }
    })();
  }, [blocker, flush]);

  const run = (task: () => Promise<void>) => {
    if (action.current) return;
    setPending(true); setOperationError(null);
    action.current = task().catch((cause: unknown) => {
      setOperationError(errorMessage(cause));
      if (cause instanceof ApiError && cause.status === 401) setNeedsLogin(true);
      if (cause instanceof ApiError && cause.status === 409) draft.markConflict(cause);
    }).finally(() => { action.current = null; setPending(false); });
  };
  const generate = () => run(async () => {
    await flush();
    const current = draft.getSnapshot().consultation;
    const result = await consultationService.structure(current.id, current.revision);
    draft.acceptServerResult(result);
    setReportData(result.reportProposal?.data || null); setReportMode('proposal'); markReportDirty(false); setReviewedTranscript(null);
  });
  const validate = () => run(async () => {
    if (!reportData || !reviewed || !reportData.conclusion.synthese_clinique?.trim()) throw new Error('Renseignez une synthèse clinique et confirmez la relecture avant de valider.');
    await flush();
    const current = draft.getSnapshot().consultation;
    if (reviewedTranscript !== draft.getSnapshot().text) { setReviewedTranscript(null); throw new Error('Les observations ont changé depuis votre relecture. Relisez-les avant de valider le compte rendu.'); }
    const result = await consultationService.review(current.id, { expectedRevision: current.revision, data: reportData, source: reportMode });
    draft.acceptServerResult(result);
    setReportData(null); markReportDirty(false); setReviewedTranscript(null);
  });
  const staleProposal = reportMode === 'proposal' && consultation.reportProposal?.sourceTranscript !== text;
  const validatedIsOld = consultation.validatedReport !== null && consultation.validatedReport.sourceTranscript !== text;
  const buttonStyle = 'px-4 py-2 bg-brand-blue text-white text-sm rounded-md disabled:opacity-50';

  return <div className="min-h-screen flex flex-col bg-gray-50"><Navbar /><main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
    <Link to="/" className="inline-flex text-sm text-gray-500 hover:text-brand-blue mb-4">Retour aux consultations</Link>
    <PageHeader title={`Consultation — ${patientDisplayName(consultation.patient)}`} subtitle={CONSULTATION_TYPE_LABELS[consultation.consultationType]} />
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <section className="lg:col-span-5 bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col gap-5 self-start" aria-labelledby="observations-title">
        <h2 id="observations-title" className="text-lg font-bold">Observations</h2>
        <RecorderPanel ref={recorder} onFinalSegment={draft.append} onActivityChange={setSpeechActive} disabled={pending} />
        <TranscriptBox text={text} onChange={draft.edit} disabled={pending} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className={`text-sm ${error ? 'text-red-600' : 'text-gray-500'}`}>{status === 'saving' ? 'Sauvegarde en cours…' : error ? 'Brouillon non sauvegardé' : dirty ? 'Modifications à sauvegarder' : 'Toutes les observations sont sauvegardées'}</p>
          <button type="button" onClick={() => run(flush)} disabled={pending || status === 'saving' || (!dirty && !speechActive)} className={buttonStyle}>Sauvegarder</button>
        </div>
        {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
        {status === 'conflict' && <div className="border border-amber-300 bg-amber-50 p-3 rounded-md text-sm">
          <p>Le dossier a changé sur le serveur. Votre texte est conservé ici. Comparez les versions avant de sauvegarder.</p>
          <button type="button" onClick={() => run(async () => { setRemoteConflict(await consultationService.getConsultation(consultation.id)); })} disabled={pending} className="text-brand-blue mt-2">Comparer la version serveur</button>
          {remoteConflict && <div className="mt-3"><p className="font-semibold">Observations enregistrées sur le serveur</p><pre className="whitespace-pre-wrap text-sm max-h-60 overflow-auto mt-2">{remoteConflict.transcript || 'Aucune observation'}</pre>
            <p className="mt-3">Les corrections locales du compte rendu sont conservées et devront être relues avant validation.</p>{remoteConflict.validatedReport && <details className="mt-3"><summary className="font-medium cursor-pointer">Compte rendu validé sur le serveur</summary><MedicalReportEditor data={remoteConflict.validatedReport.data} idPrefix="conflict-report" /></details>}
            <div className="flex flex-col gap-2 mt-3">
              <button type="button" onClick={() => run(async () => { draft.rebaseForConfirmedSave(remoteConflict); setRemoteConflict(null); setReviewedTranscript(null); await draft.save(); })} disabled={pending} className={buttonStyle}>Utiliser cette révision et sauvegarder mon texte</button>
              <button type="button" onClick={() => { if (window.confirm('Abandonner votre texte local et récupérer la version serveur ?')) { draft.replaceWithServer(remoteConflict); setRemoteConflict(null); setReviewedTranscript(null); } }} disabled={pending} className="text-gray-600">Abandonner mon texte local</button>
            </div>
          </div>}
        </div>}
      </section>
      <div className="lg:col-span-7 flex flex-col gap-6">
        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"><h2 className="text-lg font-bold mb-5">Informations patient</h2><PatientPanel consultation={consultation} /></section>
        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm" aria-labelledby="report-title">
          <h2 id="report-title" className="text-lg font-bold mb-4">Compte rendu médical</h2>
          <p className="text-sm text-gray-500 mb-4">La proposition doit être relue et corrigée par le professionnel avant validation.</p>
          <div className="flex flex-wrap gap-3 mb-5">
            <button type="button" onClick={generate} disabled={pending || reportDirty || status === 'conflict' || !text.trim()} className={buttonStyle}>{pending ? 'Traitement en cours…' : 'Générer une proposition'}</button>
            <button type="button" onClick={() => { if (reportDirty && !window.confirm('Abandonner les corrections en cours et commencer un compte rendu manuel ?')) return; setReportData(createEmptyMedicalReport()); setReportMode('manual'); markReportDirty(true); setReviewedTranscript(null); }} disabled={pending || status === 'conflict'} className="text-brand-blue text-sm">Rédiger manuellement</button>
            {reportDirty && <button type="button" onClick={() => { if (window.confirm('Abandonner les modifications non validées du compte rendu ?')) { setReportData(reportMode === 'proposal' ? consultation.reportProposal?.data || null : null); markReportDirty(false); setReviewedTranscript(null); } }} disabled={pending} className="text-gray-600 text-sm">{reportMode === 'proposal' ? 'Abandonner les corrections' : 'Abandonner la rédaction'}</button>}
          </div>
          {operationError && <p role="alert" className="text-red-600 text-sm mb-4">{operationError}</p>}
          {reportData && <div className="space-y-4">
            <h3 className="font-semibold">{reportMode === 'manual' ? 'Rédaction manuelle' : 'Proposition à relire'}</h3>
            {staleProposal && <p role="alert" className="text-amber-800 text-sm">Les observations ont changé depuis cette proposition. Générez une nouvelle proposition avant de la valider.</p>}
            <MedicalReportEditor data={reportData} disabled={pending} idPrefix="draft-report" onChange={(data) => { setReportData(data); markReportDirty(true); setReviewedTranscript(null); }} />
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewedTranscript(event.target.checked ? text : null)} disabled={pending} /><span>J’ai relu les observations et vérifié les données, les unités et la conclusion du compte rendu.</span></label>
            <button type="button" onClick={validate} disabled={pending || !reviewed || staleProposal || status === 'conflict' || !reportData.conclusion.synthese_clinique?.trim()} className={buttonStyle}>Valider le compte rendu</button>
            {!reportData.conclusion.synthese_clinique?.trim() && <p className="text-xs text-gray-500">Une synthèse clinique est nécessaire pour valider.</p>}
          </div>}
          {consultation.validatedReport && <div className="mt-6 pt-5 border-t border-gray-200">
            <h3 className="font-semibold mb-2">{validatedIsOld ? 'Compte rendu précédemment validé' : 'Compte rendu validé'}</h3>
            <p className="text-xs text-gray-500 mb-3">Validé le {new Date(consultation.validatedReport.reviewedAt).toLocaleString('fr-FR')}.{validatedIsOld ? ' Les observations ont changé ; ce compte rendu reste associé à leur version précédente.' : ''}</p>
            <MedicalReportEditor data={consultation.validatedReport.data} idPrefix="validated-report" />
          </div>}
          {!reportData && !consultation.validatedReport && <p className="text-sm text-gray-500">Aucun compte rendu. Vous pouvez demander une proposition ou rédiger manuellement.</p>}
        </section>
      </div>
    </div>
    {(needsLogin || failureStatus === 401) && <SessionRecovery username={initialUsername} onSuccess={() => { setNeedsLogin(false); setOperationError(null); if (draft.getSnapshot().failureStatus === 401) run(flush); }} />}
    {blocker.state === 'blocked' && <Dialog labelledBy="leave-title" onEscape={() => { setLeaveError(null); blocker.reset(); }}>
      <h2 id="leave-title" className="font-bold text-lg mb-3">Quitter la consultation</h2>
      <p role={leaveError ? 'alert' : 'status'} className="text-sm mb-4">{leaveError || 'Finalisation de la dictée et sauvegarde des observations…'}</p>
      {leaveError && <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => { setLeaveError(null); blocker.reset(); }} className={buttonStyle}>Rester sur la consultation</button>
        <button type="button" onClick={() => { const proceed = blocker.proceed; void flush().then(() => proceed()).catch((cause: unknown) => setLeaveError(errorMessage(cause))); }} className="text-brand-blue text-sm">{reportDirty ? 'Sauvegarder les observations et abandonner les corrections' : 'Réessayer la sauvegarde et quitter'}</button>
        <button type="button" onClick={() => { if (window.confirm('Quitter et perdre toutes les modifications non sauvegardées ?')) { draft.dispose(); blocker.proceed(); } }} className="text-red-600 text-sm">Quitter sans sauvegarder</button>
      </div>}
    </Dialog>}
  </main></div>;
}
