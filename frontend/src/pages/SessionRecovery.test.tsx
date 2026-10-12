import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from './Dashboard';
import { NewConsultation } from './NewConsultation';
import { ConsultationWorkspace } from './ConsultationWorkspace';
import { consultationService } from '../services/consultationService';
import { ApiError } from '../services/http';
import { consultationFixture } from '../test/fixtures';

const auth = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock('../auth/context', () => ({ useAuth: () => ({ session: { user: { id: '123e4567-e89b-42d3-a456-426614174002', username: 'alice' } }, login: auth.login }) }));
vi.mock('../services/consultationService', () => ({ consultationService: { getConsultations: vi.fn(), createConsultation: vi.fn(), getConsultation: vi.fn(), saveTranscript: vi.fn(), structure: vi.fn(), review: vi.fn() } }));

beforeEach(() => { vi.clearAllMocks(); auth.login.mockResolvedValue(undefined); });
function mount(path: string) {
  const router = createMemoryRouter([
    { path: '/', element: <Dashboard /> },
    { path: '/consultation/new', element: <NewConsultation /> },
    { path: '/consultation/:id', element: <ConsultationWorkspace /> },
  ], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}
async function reconnect() {
  const login = await screen.findByLabelText('Identifiant') as HTMLInputElement;
  expect(login.readOnly).toBe(true); expect(login.value).toBe('alice');
  await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret');
  await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
  await waitFor(() => expect(auth.login).toHaveBeenCalledWith('alice', 'secret'));
}
describe('session recovery outside the editor', () => {
  it('reconnects and retries the dashboard after 401 instead of presenting an empty list', async () => {
    vi.mocked(consultationService.getConsultations).mockRejectedValueOnce(new ApiError('Session expirée', 401)).mockResolvedValueOnce([]);
    mount('/'); await reconnect();
    expect(await screen.findByText('Aucune consultation. Créez votre première consultation pour commencer.')).toBeTruthy();
    expect(consultationService.getConsultations).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('preserves creation fields across expiry and displays the complete created dossier after retry', async () => {
    vi.mocked(consultationService.createConsultation).mockRejectedValueOnce(new ApiError('Session expirée', 401)).mockImplementationOnce(async (input) => consultationFixture({ patient: input.patient, consultationDate: input.consultationDate, consultationType: input.consultationType, notes: input.notes || '' }));
    vi.mocked(consultationService.getConsultation).mockResolvedValue(consultationFixture({ patient: { nom: 'Durand', prenom: 'Bob', date_naissance: '1980-04-05' }, consultationType: 'follow_up', notes: 'Notes préservées' }));
    mount('/consultation/new');
    await userEvent.type(screen.getByLabelText('Nom du patient *'), 'Durand');
    await userEvent.type(screen.getByLabelText('Prénom du patient'), 'Bob');
    fireEvent.change(screen.getByLabelText('Date de naissance'), { target: { value: '1980-04-05' } });
    fireEvent.change(screen.getByLabelText('Date de consultation *'), { target: { value: '2026-10-12' } });
    await userEvent.selectOptions(screen.getByLabelText('Type de consultation *'), 'follow_up');
    await userEvent.type(screen.getByLabelText('Notes initiales'), 'Notes préservées');
    await userEvent.click(screen.getByRole('button', { name: 'Créer la consultation' }));
    await reconnect();
    expect((screen.getByLabelText('Notes initiales') as HTMLTextAreaElement).value).toBe('Notes préservées');
    expect((screen.getByLabelText('Nom du patient *') as HTMLInputElement).value).toBe('Durand');
    await userEvent.click(screen.getByRole('button', { name: 'Créer la consultation' }));
    expect(await screen.findByRole('heading', { name: 'Consultation — Bob Durand' })).toBeTruthy();
    expect(screen.getByText('1980-04-05')).toBeTruthy();
    expect(screen.getByText('Notes préservées')).toBeTruthy();
    expect(consultationService.createConsultation).toHaveBeenCalledTimes(2);
    expect(vi.mocked(consultationService.createConsultation).mock.calls[1]?.[0]).toMatchObject({ patient: { nom: 'Durand', prenom: 'Bob', date_naissance: '1980-04-05' }, consultationType: 'follow_up', notes: 'Notes préservées' });
  });
});
