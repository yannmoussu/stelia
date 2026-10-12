import { Dialog } from '../components/common/Dialog';
import { LoginForm } from '../pages/Login';
export function SessionRecovery({ username, onSuccess }: { username: string; onSuccess: () => void }) {
  return <Dialog labelledBy="session-expired-title">
    <h2 id="session-expired-title" className="font-bold text-lg mb-3">Votre session a expiré</h2>
    <p className="text-sm text-gray-600 mb-4">Vos saisies restent ouvertes. Reconnectez-vous au compte {username} pour continuer.</p>
    <LoginForm requiredUsername={username} onSuccess={onSuccess} />
  </Dialog>;
}
