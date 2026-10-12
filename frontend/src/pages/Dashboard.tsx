import { useEffect, useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { PageHeader } from '../components/layout/PageHeader';
import { ConsultationList } from '../components/consultation/ConsultationList';
import { consultationService } from '../services/consultationService';
import { ApiError, errorMessage, isAbortError } from '../services/http';
import { Link } from 'react-router-dom';
import { SessionRecovery } from '../auth/SessionRecovery';
import { useAuth } from '../auth/context';
import type { ConsultationSummary } from '@stelia/contracts';

export function Dashboard() {
  const { session } = useAuth();
  const [initialUsername] = useState(() => session!.user.username);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [consultations, setConsultations] = useState<ConsultationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    consultationService.getConsultations(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setConsultations(data); })
      .catch((cause: unknown) => { if (!controller.signal.aborted && !isAbortError(cause)) { setError(errorMessage(cause)); if (cause instanceof ApiError && cause.status === 401) setNeedsLogin(true); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  return <div className="min-h-screen flex flex-col"><Navbar /><main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
    <PageHeader title="Mes consultations" subtitle="Assistant de rédaction de comptes rendus pour orthoptistes."><Link to="/consultation/new" className="px-4 py-2 bg-brand-blue text-white text-sm rounded-md">Nouvelle consultation</Link></PageHeader>
    {loading ? <p role="status">Chargement des consultations…</p> : error ? <div><p role="alert" className="text-red-600">{error}</p><button type="button" onClick={() => { setLoading(true); setError(null); setAttempt((value) => value + 1); }} className="mt-3 text-brand-blue">Réessayer</button></div> : consultations.length === 0 ? <p className="text-gray-500">Aucune consultation. Créez votre première consultation pour commencer.</p> : <ConsultationList consultations={consultations} />}
    {needsLogin && <SessionRecovery username={initialUsername} onSuccess={() => { setNeedsLogin(false); setLoading(true); setError(null); setAttempt((value) => value + 1); }} />}
  </main></div>;
}
