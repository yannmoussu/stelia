import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { SessionSchema, type Session } from '@stelia/contracts';
import { AuthContext } from './context';
import { ApiError, errorMessage, isAbortError, request, requestWithoutResponse } from '../services/http';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    request('/auth/session', SessionSchema, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setSession(result); })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) return;
        if (cause instanceof ApiError && cause.status === 401) setSession(null);
        else setError(errorMessage(cause));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await request('/auth/login', SessionSchema, { method: 'POST', body: JSON.stringify({ username, password }) });
    if (mounted.current) { setSession(result); setError(null); }
  }, []);
  const logout = useCallback(async () => {
    await requestWithoutResponse('/auth/logout', { method: 'POST' });
    if (mounted.current) setSession(null);
  }, []);

  return <AuthContext.Provider value={{ session, loading, error, retry: () => { setLoading(true); setError(null); setAttempt((value) => value + 1); }, login, logout }}>{children}</AuthContext.Provider>;
}
