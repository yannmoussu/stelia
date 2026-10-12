import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';

describe('dialog keyboard navigation', () => {
  it('focuses the selected control, wraps Tab and Shift+Tab, then restores the invoking control', async () => {
    const invoking = document.createElement('button'); document.body.append(invoking); invoking.focus();
    const { unmount } = render(<StrictMode><Dialog labelledBy="dialog-title"><h2 id="dialog-title">Dialogue</h2><input aria-label="Identifiant" readOnly /><input aria-label="Mot de passe" data-dialog-initial-focus /><button type="button">Confirmer</button></Dialog></StrictMode>);
    expect(document.activeElement).toBe(screen.getByLabelText('Mot de passe'));
    const user = userEvent.setup();
    await user.tab(); expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Confirmer' }));
    await user.tab(); expect(document.activeElement).toBe(screen.getByLabelText('Identifiant'));
    await user.tab({ shift: true }); expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Confirmer' }));
    unmount(); expect(document.activeElement).toBe(invoking); invoking.remove();
  });
  it('focuses the container while finalization has no available control and keeps Tab inside', () => {
    render(<Dialog labelledBy="waiting-title"><h2 id="waiting-title">Sauvegarde…</h2></Dialog>);
    const dialog = screen.getByRole('dialog'); expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(dialog, { key: 'Tab' }); expect(document.activeElement).toBe(dialog);
  });
  it('calls the explicit Escape action without changing another dialog', () => {
    const escape = vi.fn(); render(<Dialog labelledBy="title" onEscape={escape}><h2 id="title">Dialogue</h2><button type="button">Rester</button></Dialog>);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Escape' }); expect(escape).toHaveBeenCalledTimes(1);
  });
});
