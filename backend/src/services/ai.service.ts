import { medicalReportJsonSchema } from '@stelia/contracts';
import { AppError } from '../api/errors.js';

export interface AIService {
  readonly provider: string;
  readonly model: string;
  /** Untrusted until validated by the consultation service. */
  structureTranscript(transcript: string): Promise<unknown>;
}

export class DisabledAIService implements AIService {
  readonly provider = 'disabled';
  readonly model = 'disabled';
  async structureTranscript(): Promise<never> {
    throw new AppError(503, 'AI_NOT_CONFIGURED', 'Le service IA n’est pas configuré.');
  }
}

/** An explicit JSON HTTP provider contract keeps the clinical model vendor-independent. */
export class HttpAIService implements AIService {
  readonly provider: string;
  constructor(
    private readonly endpoint: string,
    private readonly apiKey: string,
    readonly model: string,
    private readonly timeoutMs = 30_000,
  ) {
    const url = new URL(endpoint);
    if (url.username || url.password || url.hash) throw new Error('AI_ENDPOINT ne peut pas contenir d’identifiants ou de fragment.');
    if (!model.trim() || model.length > 200 || url.hostname.length > 100) throw new Error('Configuration du fournisseur IA invalide.');
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
      throw new Error('AI_ENDPOINT doit utiliser HTTPS (HTTP autorisé uniquement sur localhost).');
    }
    this.provider = url.hostname;
  }
  async structureTranscript(transcript: string): Promise<unknown> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ transcript, model: this.model, schema: medicalReportJsonSchema }),
        signal: AbortSignal.timeout(this.timeoutMs),
        redirect: 'error',
      });
      if (!response.ok) throw new AppError(502, 'AI_UNAVAILABLE', 'Le service IA n’a pas pu générer la proposition.');
      if (!response.body) throw new AppError(502, 'AI_INVALID_RESPONSE', 'Le service IA a retourné une réponse vide.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      let bytes = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > 1_000_000) {
            await reader.cancel();
            throw new AppError(502, 'AI_INVALID_RESPONSE', 'La réponse IA est trop volumineuse.');
          }
          text += decoder.decode(chunk.value, { stream: true });
        }
        text += decoder.decode();
      } finally {
        reader.releaseLock();
      }
      return JSON.parse(text) as unknown;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new AppError(504, 'AI_TIMEOUT', 'Le service IA a dépassé le délai autorisé.');
      }
      throw new AppError(502, 'AI_UNAVAILABLE', 'Le service IA est indisponible ou a retourné une réponse invalide.');
    }
  }
}
