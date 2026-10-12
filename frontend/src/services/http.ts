import type { ZodType } from 'zod';
import { ErrorResponseSchema } from '@stelia/contracts';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const configuredTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS || 30_000);
const defaultTimeout = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 30_000;
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  constructor(message: string, status: number, code?: string) {
    super(message); this.name = 'ApiError'; this.status = status; this.code = code;
  }
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
}
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
interface RequestOptions extends RequestInit { timeoutMs?: number; }

/** The timeout covers both response headers and the full response body. */
async function withResponse<T>(path: string, options: RequestOptions, consume: (response: Response) => Promise<T>): Promise<T> {
  const { timeoutMs = defaultTimeout, signal: callerSignal, ...init } = options;
  const controller = new AbortController();
  const abort = () => controller.abort(callerSignal?.reason);
  callerSignal?.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  let rejectAbort!: () => void;
  const cancelled = new Promise<never>((_resolve, reject) => {
    rejectAbort = () => reject(controller.signal.reason || new DOMException('Requête annulée', 'AbortError'));
    controller.signal.addEventListener('abort', rejectAbort, { once: true });
  });
  if (callerSignal?.aborted) abort();
  try {
    const operation = (async () => {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        ...init, credentials: 'include', signal: controller.signal,
        headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
      });
      return consume(response);
    })();
    return await Promise.race([operation, cancelled]);
  } catch (cause) {
    if (callerSignal?.aborted) throw cause;
    if (timedOut) throw new ApiError('Le serveur met trop de temps à répondre. Votre brouillon est conservé ; vérifiez la sauvegarde avant de quitter.', 0, 'TIMEOUT');
    if (cause instanceof ApiError) throw cause;
    throw new ApiError('Connexion au serveur impossible. Vérifiez votre connexion puis réessayez.', 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', abort);
    controller.signal.removeEventListener('abort', rejectAbort);
  }
}
async function throwResponseError(response: Response): Promise<never> {
  const body: unknown = await response.json().catch(() => null);
  const result = ErrorResponseSchema.safeParse(body);
  throw new ApiError(result.success ? result.data.error.message : `La requête a échoué (${response.status}).`, response.status, result.success ? result.data.error.code : undefined);
}
export async function request<T>(path: string, schema: ZodType<T>, options: RequestOptions = {}): Promise<T> {
  return withResponse(path, options, async (response) => {
    if (!response.ok) return throwResponseError(response);
    const body: unknown = await response.json().catch(() => null);
    const result = schema.safeParse(body);
    if (!result.success) throw new ApiError('La réponse du serveur est invalide. Vérifiez la sauvegarde avant de quitter.', response.status, 'INVALID_RESPONSE');
    return result.data;
  });
}
export async function requestWithoutResponse(path: string, options: RequestOptions = {}): Promise<void> {
  return withResponse(path, options, async (response) => {
    if (!response.ok) await throwResponseError(response);
  });
}
