import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyMedicalReport, type Consultation, type Session } from '@stelia/contracts';
import { ConsultationWorkspace } from './ConsultationWorkspace';
import { consultationService } from '../services/consultationService';
import { ApiError } from '../services/http';
import { consultationFixture, consultationId, deferred, secondConsultationId, userId } from '../test/fixtures';
import { FakeRecognition } from '../speech/testHelpers';

const auth = vi.hoisted(() => ({
  session: { user: { id: '123e4567-e89b-42d3-a456-426614174002', username: 'alice' } },
  listeners: new Set<() => void>(), login: vi.fn(),
}));
vi.mock('../auth/context', async () => {
  const { useSyncExternalStore } = await import('react');
  return { useAuth: () => {
    const session = useSyncExternalStore((listener) => { auth.listeners.add(listener); return () => { auth.listeners.delete(listener); }; }, () => auth.session);
    return { session, login: auth.login, logout: vi.fn(), loading: false, error: null, retry: vi.fn() };
  } };
});
vi.mock('../services/consultationService', () => ({ consultationService: {
  getConsultation: vi.fn(), saveTranscript: vi.fn(), structure: vi.fn(), review: vi.fn(),
} }));

const recognitions: FakeRecognition[] = [];
let server: Consultation;
function renderWorkspace(path = `/consultation/${consultationId}`, strict = false) {
  const router = createMemoryRouter([
    { path: '/consultation/:id', element: <ConsultationWorkspace /> },
    { path: '/', element: <h1>Consultations destination</h1> },
    { path: '/logout', element: <h1>Déconnexion destination</h1> },
  ], { initialEntries: [path] });
  const tree = <RouterProvider router={router} />;
  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  return router;
}
function textInput() { return screen.getByLabelText('Observations et transcription') as HTMLTextAreaElement; }
async function startSpeech() {
  await userEvent.click(await screen.findByRole('button', { name: 'Commencer la dictée' }));
  const recognition = recognitions.at(-1)!;
  act(() => { recognition.onstart?.(); });
  return recognition;
}
function setSession(session: Session) { act(() => { auth.session = session; auth.listeners.forEach((listener) => listener()); }); }

beforeEach(() => {
  vi.clearAllMocks(); recognitions.length = 0;
  auth.session = { user: { id: userId, username: 'alice' } };
  server = consultationFixture();
  vi.mocked(consultationService.getConsultation).mockImplementation(async (id) => id === secondConsultationId ? consultationFixture({ id, patient: { nom: 'Durand', prenom: 'Bob', date_naissance: null }, transcript: 'Dossier B' }) : server);
  vi.mocked(consultationService.saveTranscript).mockImplementation(async (_id, input) => { server = { ...server, transcript: input.transcript, revision: input.expectedRevision + 1 }; return server; });
  vi.stubGlobal('SpeechRecognition', class extends FakeRecognition { constructor() { super(); recognitions.push(this); } });
});
afterEach(() => vi.unstubAllGlobals());

describe('workspace data safety', () => {
  it('retains acquired text across successive dictation sessions and saves the complete draft', async () => {
    renderWorkspace(); const first = await startSpeech();
    act(() => { first.result([['Première dictée', true]]); first.onend?.(); });
    const second = await startSpeech();
    act(() => { second.result([['Deuxième dictée', true]]); second.onend?.(); });
    expect(textInput().value).toBe('Observations existantes Première dictée Deuxième dictée');
    await userEvent.click(screen.getByRole('button', { name: 'Sauvegarder' }));
    await waitFor(() => expect(server.transcript).toBe('Observations existantes Première dictée Deuxième dictée'));
  });
  it('waits for late final results when Save is clicked during dictation', async () => {
    renderWorkspace(); const recognition = await startSpeech();
    await userEvent.click(screen.getByRole('button', { name: 'Sauvegarder' }));
    expect(recognition.stop).toHaveBeenCalledTimes(1);
    expect(recognition.abort).not.toHaveBeenCalled();
    expect(consultationService.saveTranscript).not.toHaveBeenCalled();
    act(() => { recognition.result([['Derniers mots', true]]); recognition.onend?.(); });
    await waitFor(() => expect(server.transcript).toBe('Observations existantes Derniers mots'));
  });
  it('stops and flushes late finals before leaving through a navigation link', async () => {
    renderWorkspace(); const recognition = await startSpeech();
    await userEvent.click(screen.getByRole('link', { name: 'Retour aux consultations' }));
    expect(recognition.stop).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Consultations destination')).toBeNull();
    act(() => { recognition.result([['Final tardif', true]]); recognition.onend?.(); });
    expect(await screen.findByText('Consultations destination')).toBeTruthy();
    expect(server.transcript).toBe('Observations existantes Final tardif');
  });
  it('keeps failed observations visible and blocks leaving until the user resolves the failure', async () => {
    vi.mocked(consultationService.saveTranscript).mockRejectedValue(new ApiError('Sauvegarde impossible', 503));
    renderWorkspace(); await screen.findByLabelText('Observations et transcription');
    fireEvent.change(textInput(), { target: { value: 'Texte précieux' } });
    await userEvent.click(screen.getByRole('link', { name: 'Retour aux consultations' }));
    await screen.findByRole('dialog');
    await waitFor(() => expect(screen.getAllByText('Sauvegarde impossible').length).toBeGreaterThan(0));
    expect(textInput().value).toBe('Texte précieux');
    expect(screen.queryByText('Consultations destination')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Rester sur la consultation' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('isolates route changes and ignores an old fetch that resolves after the next consultation', async () => {
    const delayed = deferred<Consultation>();
    vi.mocked(consultationService.getConsultation).mockImplementation((id) => id === consultationId ? delayed.promise : Promise.resolve(consultationFixture({ id: secondConsultationId, transcript: 'Dossier B' })));
    const router = renderWorkspace();
    await act(async () => { await router.navigate(`/consultation/${secondConsultationId}`); });
    expect((await screen.findByLabelText('Observations et transcription') as HTMLTextAreaElement).value).toBe('Dossier B');
    await act(async () => { delayed.resolve(consultationFixture({ transcript: 'Dossier A tardif' })); await delayed.promise; });
    expect(textInput().value).toBe('Dossier B');
    expect(consultationService.saveTranscript).not.toHaveBeenCalled();
  });
  it('distinguishes not-found dossiers from network failures and offers retry', async () => {
    vi.mocked(consultationService.getConsultation).mockRejectedValueOnce(new ApiError('Connexion impossible', 0));
    renderWorkspace(); expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Connexion impossible');
    expect(screen.queryByText('Consultation introuvable')).toBeNull();
    vi.mocked(consultationService.getConsultation).mockRejectedValueOnce(new ApiError('Introuvable', 404));
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByText('Consultation introuvable')).toBeTruthy();
  });
  it('keeps a previously validated report unchanged when IA generation fails', async () => {
    const data = createEmptyMedicalReport(); data.conclusion.synthese_clinique = 'Conclusion déjà validée';
    server = consultationFixture({ validatedReport: { schemaVersion: '1.0', data, sourceTranscript: 'Observations existantes', sourceRevision: 1, generatedAt: '2026-10-12T10:00:00.000Z', reviewedAt: '2026-10-12T10:01:00.000Z', provider: 'manual', model: 'human' }, status: 'completed' });
    vi.mocked(consultationService.structure).mockRejectedValue(new ApiError('Service IA non configuré', 503));
    renderWorkspace(); await screen.findByLabelText('Observations et transcription');
    await userEvent.click(screen.getByRole('button', { name: 'Générer une proposition' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Service IA non configuré');
    expect(screen.getByText('Conclusion déjà validée')).toBeTruthy();
    expect(server.validatedReport?.data.conclusion.synthese_clinique).toBe('Conclusion déjà validée');
  });
  it('writes a manual report only after explicit review and a clinical synthesis', async () => {
    vi.mocked(consultationService.review).mockImplementation(async () => { const result = { ...server, revision: server.revision + 1 }; return result; });
    renderWorkspace(); await screen.findByLabelText('Observations et transcription');
    await userEvent.click(screen.getByRole('button', { name: 'Rédiger manuellement' }));
    const button = screen.getByRole('button', { name: 'Valider le compte rendu' }); expect(button.hasAttribute('disabled')).toBe(true);
    await userEvent.type(screen.getByLabelText('Synthèse clinique'), 'Synthèse relue');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(button);
    await waitFor(() => expect(consultationService.review).toHaveBeenCalledTimes(1));
    expect(vi.mocked(consultationService.review).mock.calls[0]?.[1]).toMatchObject({ source: 'manual', expectedRevision: 1, data: { conclusion: { synthese_clinique: 'Synthèse relue' } } });
  });
  it('does not expose or save an old draft when the signed-in identity changes', async () => {
    renderWorkspace(); await screen.findByLabelText('Observations et transcription');
    fireEvent.change(textInput(), { target: { value: 'Secret du compte Alice' } });
    vi.mocked(consultationService.getConsultation).mockResolvedValue(consultationFixture({ patient: { nom: 'Nouveau compte', prenom: null, date_naissance: null }, transcript: 'Texte autre compte' }));
    setSession({ user: { id: secondConsultationId, username: 'bob' } });
    expect((await screen.findByLabelText('Observations et transcription') as HTMLTextAreaElement).value).toBe('Texte autre compte');
    expect(screen.queryByText('Secret du compte Alice')).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 650));
    expect(consultationService.saveTranscript).not.toHaveBeenCalled();
  });
  it('requires a new medical review after observations are edited', async () => {
    renderWorkspace(); await screen.findByLabelText('Observations et transcription');
    await userEvent.click(screen.getByRole('button', { name: 'Rédiger manuellement' }));
    await userEvent.type(screen.getByLabelText('Synthèse clinique'), 'Synthèse relue');
    await userEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Valider le compte rendu' }).hasAttribute('disabled')).toBe(false);
    fireEvent.change(textInput(), { target: { value: 'Observations modifiées' } });
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    expect(screen.getByRole('button', { name: 'Valider le compte rendu' }).hasAttribute('disabled')).toBe(true);
    expect(consultationService.review).not.toHaveBeenCalled();
  });
  it('refuses medical validation when stop produces final words after the review checkbox was checked', async () => {
    renderWorkspace(); await screen.findByLabelText('Observations et transcription');
    await userEvent.click(screen.getByRole('button', { name: 'Rédiger manuellement' }));
    await userEvent.type(screen.getByLabelText('Synthèse clinique'), 'Synthèse relue');
    const recognition = await startSpeech();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Valider le compte rendu' }));
    expect(recognition.stop).toHaveBeenCalledTimes(1);
    act(() => { recognition.result([['Mots arrivés après relecture', true]]); recognition.onend?.(); });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('changé depuis votre relecture'));
    expect(consultationService.review).not.toHaveBeenCalled();
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    expect(server.transcript).toContain('Mots arrivés après relecture');
  });
  it('recovers an IA generation revision conflict through explicit server comparison', async () => {
    vi.mocked(consultationService.structure).mockRejectedValueOnce(new ApiError('Révision modifiée', 409)).mockResolvedValueOnce(consultationFixture({ revision: 5 }));
    renderWorkspace(); await screen.findByLabelText('Observations et transcription');
    await userEvent.click(screen.getByRole('button', { name: 'Générer une proposition' }));
    expect(await screen.findByRole('button', { name: 'Comparer la version serveur' })).toBeTruthy();
    vi.mocked(consultationService.getConsultation).mockResolvedValue(consultationFixture({ revision: 4 }));
    await userEvent.click(screen.getByRole('button', { name: 'Comparer la version serveur' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Utiliser cette révision et sauvegarder mon texte' }));
    await userEvent.click(screen.getByRole('button', { name: 'Générer une proposition' }));
    await waitFor(() => expect(consultationService.structure).toHaveBeenCalledTimes(2));
    expect(vi.mocked(consultationService.structure).mock.calls[1]?.[1]).toBe(4);
  });
  it('preserves report corrections after a medical validation conflict and requires another review', async () => {
    vi.mocked(consultationService.review).mockRejectedValueOnce(new ApiError('Révision modifiée', 409)).mockResolvedValueOnce(consultationFixture({ revision: 8 }));
    renderWorkspace(); await screen.findByLabelText('Observations et transcription');
    await userEvent.click(screen.getByRole('button', { name: 'Rédiger manuellement' }));
    await userEvent.type(screen.getByLabelText('Synthèse clinique'), 'Correction locale');
    await userEvent.click(screen.getByRole('checkbox')); await userEvent.click(screen.getByRole('button', { name: 'Valider le compte rendu' }));
    await screen.findByRole('button', { name: 'Comparer la version serveur' });
    vi.mocked(consultationService.getConsultation).mockResolvedValue(consultationFixture({ revision: 7 }));
    await userEvent.click(screen.getByRole('button', { name: 'Comparer la version serveur' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Utiliser cette révision et sauvegarder mon texte' }));
    expect((screen.getByLabelText('Synthèse clinique') as HTMLTextAreaElement).value).toBe('Correction locale');
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    await userEvent.click(screen.getByRole('checkbox')); await userEvent.click(screen.getByRole('button', { name: 'Valider le compte rendu' }));
    await waitFor(() => expect(consultationService.review).toHaveBeenCalledTimes(2));
    expect(vi.mocked(consultationService.review).mock.calls[1]?.[1]).toMatchObject({ expectedRevision: 7, data: { conclusion: { synthese_clinique: 'Correction locale' } } });
  });
  it('locks session recovery to the original account and keeps the draft until its save succeeds', async () => {
    vi.mocked(consultationService.saveTranscript).mockRejectedValueOnce(new ApiError('Session expirée', 401));
    auth.login.mockResolvedValue(undefined);
    renderWorkspace(); await screen.findByLabelText('Observations et transcription');
    fireEvent.change(textInput(), { target: { value: 'Mon brouillon' } });
    await userEvent.click(screen.getByRole('button', { name: 'Sauvegarder' }));
    const login = await screen.findByLabelText('Identifiant') as HTMLInputElement;
    expect(login.readOnly).toBe(true);
    fireEvent.change(login, { target: { value: 'bob' } });
    expect(login.value).toBe('alice');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith('alice', 'secret'));
    await waitFor(() => expect(server.transcript).toBe('Mon brouillon'));
    expect(textInput().value).toBe('Mon brouillon');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('continues to save after StrictMode mount cleanup', async () => {
    renderWorkspace(`/consultation/${consultationId}`, true); await screen.findByLabelText('Observations et transcription');
    fireEvent.change(textInput(), { target: { value: 'StrictMode observations' } });
    await userEvent.click(screen.getByRole('button', { name: 'Sauvegarder' }));
    await waitFor(() => expect(server.transcript).toBe('StrictMode observations'));
    expect(vi.mocked(consultationService.saveTranscript).mock.calls[0]?.[2]?.aborted).toBe(false);
  });
});
