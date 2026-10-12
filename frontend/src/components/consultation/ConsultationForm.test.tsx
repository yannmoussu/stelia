import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConsultationForm } from './ConsultationForm';
import { deferred } from '../../test/fixtures';

async function fillForm() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Nom du patient *'), ' Martin ');
  await user.type(screen.getByLabelText('Prénom du patient'), 'Alice');
  fireEvent.change(screen.getByLabelText('Date de naissance'), { target: { value: '1990-01-02' } });
  fireEvent.change(screen.getByLabelText('Date de consultation *'), { target: { value: '2026-10-12' } });
  await user.selectOptions(screen.getByLabelText('Type de consultation *'), 'assessment');
  await user.type(screen.getByLabelText('Notes initiales'), 'À conserver');
  return user;
}
describe('consultation creation form', () => {
  it('submits a complete shared contract and prevents duplicate submissions while awaiting creation', async () => {
    const pending = deferred<void>(); const submit = vi.fn().mockReturnValue(pending.promise);
    render(<ConsultationForm onSubmit={submit} />);
    const user = await fillForm(); await user.dblClick(screen.getByRole('button', { name: 'Créer la consultation' }));
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith({ patient: { nom: 'Martin', prenom: 'Alice', date_naissance: '1990-01-02' }, consultationDate: '2026-10-12', consultationType: 'assessment', notes: 'À conserver', transcript: '' });
    expect(screen.getByRole('button', { name: 'Création…' }).hasAttribute('disabled')).toBe(true);
    pending.resolve();
    expect(await screen.findByRole('button', { name: 'Créer la consultation' })).toBeTruthy();
  });
  it('preserves entered fields and makes submission errors visible', async () => {
    render(<ConsultationForm onSubmit={vi.fn().mockRejectedValue(new Error('Serveur indisponible'))} />);
    const user = await fillForm(); await user.click(screen.getByRole('button', { name: 'Créer la consultation' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Serveur indisponible');
    expect((screen.getByLabelText('Notes initiales') as HTMLTextAreaElement).value).toBe('À conserver');
  });
  it('rejects whitespace names and inconsistent birth dates', async () => {
    const submit = vi.fn(); render(<ConsultationForm onSubmit={submit} />);
    const user = await fillForm(); await user.clear(screen.getByLabelText('Nom du patient *')); await user.type(screen.getByLabelText('Nom du patient *'), '   ');
    await user.click(screen.getByRole('button', { name: 'Créer la consultation' }));
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByText('Le nom du patient est obligatoire')).toBeTruthy();
  });
});
