import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/context';
import { errorMessage } from '../services/http';

export function Logout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    logout().then(() => navigate('/login', { replace: true })).catch((cause: unknown) => setError(errorMessage(cause)));
  }, [logout, navigate]);
  return <main className="p-8"><p role={error ? 'alert' : 'status'}>{error || 'Déconnexion…'}</p>{error && <button type="button" onClick={() => navigate(-1)} className="text-brand-blue mt-4">Retour</button>}</main>;
}
