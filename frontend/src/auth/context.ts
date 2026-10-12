import { createContext, useContext } from 'react';
import type { Session } from '@stelia/contracts';

export interface AuthState {
  session: Session | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
export const AuthContext = createContext<AuthState | null>(null);
export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider absent');
  return value;
}
