import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/context';
import { errorMessage } from '../services/http';

export function LoginForm({ onSuccess, requiredUsername }: { onSuccess?: () => void; requiredUsername?: string }) {
  const { login } = useAuth();
  const [username, setUsername] = useState(requiredUsername || '');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError(null);
    try { await login(requiredUsername || username.trim(), password); setPassword(''); onSuccess?.(); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { submitting.current = false; setPending(false); }
  };
  return (
    <form onSubmit={(event) => { void submit(event); }} className="flex flex-col gap-4">
      <label htmlFor="login-username" className="text-sm font-medium">Identifiant</label>
      <input id="login-username" autoComplete="username" required readOnly={Boolean(requiredUsername)} value={requiredUsername || username} onChange={(event) => { if (!requiredUsername) setUsername(event.target.value); }} className="border rounded-md px-3 py-2" disabled={pending} />
      <label htmlFor="login-password" className="text-sm font-medium">Mot de passe</label>
      <input id="login-password" data-dialog-initial-focus autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="border rounded-md px-3 py-2" disabled={pending} />
      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={pending || !username.trim() || !password} className="bg-brand-blue text-white rounded-md px-4 py-2 disabled:opacity-50">{pending ? 'Connexion…' : 'Se connecter'}</button>
    </form>
  );
}

export function Login() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = typeof location.state === 'object' && location.state !== null && 'from' in location.state && typeof location.state.from === 'string' && location.state.from.startsWith('/') && !location.state.from.startsWith('//') ? location.state.from : '/';
  if (session) return <Navigate to={from} replace />;
  return <main className="min-h-screen flex items-center justify-center p-6"><div className="bg-white border rounded-xl p-8 w-full max-w-md"><h1 className="text-2xl font-bold mb-6">Connexion à Stelia</h1><LoginForm onSuccess={() => navigate(from, { replace: true })} /></div></main>;
}
