import { speechErrorMessage } from './recognition';
import type { RecognitionAdapter, RecognitionFactory } from './recognition';
import { createSessionResults, readRecognitionResults } from './results';
import type { SessionResults } from './results';

export type RecognitionState = 'idle' | 'starting' | 'listening' | 'stopping' | 'error';
export interface RecognitionSnapshot {
  readonly state: RecognitionState;
  readonly isListening: boolean;
  readonly isSupported: boolean;
  readonly interimTranscript: string;
  readonly error: string | null;
}
interface Session {
  id: number;
  recognition: RecognitionAdapter;
  results: SessionResults;
  completion: Promise<void> | null;
  resolveCompletion: (() => void) | null;
  rejectCompletion: ((error: Error) => void) | null;
  stopTimeout: ReturnType<typeof setTimeout> | null;
}
export interface SpeechControllerOptions {
  factory: RecognitionFactory | null;
  onFinalSegment?: (text: string) => void;
  enabled?: boolean;
  /** Injectable for deterministic tests; bounds a stalled browser shutdown. */
  stopTimeoutMs?: number;
}

/** One controller per recorder. It never owns or resets a consultation draft. */
export class SpeechRecognitionController {
  private readonly factory: RecognitionFactory | null;
  private onFinalSegment: (text: string) => void;
  private readonly stopTimeoutMs: number;
  private enabled: boolean;
  private session: Session | null = null;
  private nextSessionId = 0;
  private readonly listeners = new Set<() => void>();
  private snapshot: RecognitionSnapshot;

  constructor(options: SpeechControllerOptions) {
    this.factory = options.factory;
    this.onFinalSegment = options.onFinalSegment ?? (() => undefined);
    this.stopTimeoutMs = options.stopTimeoutMs ?? 8_000;
    this.enabled = options.enabled ?? true;
    this.snapshot = {
      state: 'idle', isListening: false, isSupported: this.factory !== null,
      interimTranscript: '', error: null,
    };
  }
  getSnapshot = (): RecognitionSnapshot => this.snapshot;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  setOnFinalSegment(callback?: (text: string) => void): void {
    this.onFinalSegment = callback ?? (() => undefined);
  }
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.releaseSession('idle');
  }

  start = (): void => {
    if (!this.enabled || this.session !== null || this.snapshot.state === 'starting') return;
    if (!this.factory) {
      this.update({ state: 'error', error: "La transcription vocale n'est pas prise en charge par ce navigateur." });
      return;
    }
    // Guard synchronously, before the permission prompt or any render.
    this.update({ state: 'starting', error: null });
    let recognition: RecognitionAdapter;
    try { recognition = this.factory(); }
    catch (error: unknown) {
      this.update({ state: 'error', error: this.messageFromException(error) });
      return;
    }
    const session: Session = {
      id: ++this.nextSessionId, recognition, results: createSessionResults(),
      completion: null, resolveCompletion: null, rejectCompletion: null, stopTimeout: null,
    };
    this.session = session;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';
    recognition.onstart = () => {
      if (!this.isCurrent(session)) return;
      if (this.snapshot.state === 'starting') {
        this.update({ state: 'listening', error: null, interimTranscript: '' });
      }
    };
    recognition.onresult = (event) => {
      if (!this.isCurrent(session)) return;
      const { session: results, finalSegment } = readRecognitionResults(session.results, event.results);
      session.results = results;
      this.update({ interimTranscript: results.interimTranscript });
      if (finalSegment) this.onFinalSegment(finalSegment);
    };
    recognition.onerror = (event) => {
      if (!this.isCurrent(session)) return;
      const message = speechErrorMessage(event.error);
      this.releaseSession('error', message, new Error(message));
    };
    recognition.onend = () => {
      if (this.isCurrent(session)) this.releaseSession('idle');
    };
    try { recognition.start(); }
    catch (error: unknown) {
      // Already-emitted final segments remain owned by the caller.
      this.releaseSession('error', this.messageFromException(error));
    }
  };

  /** Final results can still arrive between stop() and the end event. */
  stop = (): Promise<void> => {
    const session = this.session;
    if (!session) return Promise.resolve();
    if (session.completion) return session.completion;
    session.completion = new Promise<void>((resolve, reject) => {
      session.resolveCompletion = resolve;
      session.rejectCompletion = reject;
    });
    const completion = session.completion;
    this.update({ state: 'stopping' });
    session.stopTimeout = setTimeout(() => {
      if (!this.isCurrent(session)) return;
      const message = 'La finalisation de la dictée a échoué. Vérifiez le texte avant de continuer.';
      this.releaseSession('error', message, new Error(message));
    }, this.stopTimeoutMs);
    try { session.recognition.stop(); }
    catch (error: unknown) {
      const message = this.messageFromException(error);
      this.releaseSession('error', message, new Error(message));
    }
    return completion;
  };

  /** Invalidates callbacks before aborting; safe during StrictMode cleanup. */
  dispose = (): void => {
    this.enabled = false;
    this.releaseSession('idle');
  };
  private isCurrent(session: Session): boolean {
    return this.enabled && this.session?.id === session.id;
  }
  private releaseSession(state: RecognitionState, error: string | null = null, failure?: Error): void {
    const session = this.session;
    this.session = null;
    if (session) {
      if (session.stopTimeout !== null) clearTimeout(session.stopTimeout);
      const recognition = session.recognition;
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      try { recognition.abort(); }
      catch { /* Browser may already have ended; all callbacks are invalidated. */ }
      if (failure) session.rejectCompletion?.(failure);
      else session.resolveCompletion?.();
    }
    this.update({ state, error, interimTranscript: '' });
  }
  private messageFromException(error: unknown): string {
    // DOMException and Error can come from a different browser realm.
    const name = typeof error === 'object' && error !== null && 'name' in error
      && typeof error.name === 'string' ? error.name : 'unknown';
    return speechErrorMessage(name);
  }
  private update(changes: Partial<RecognitionSnapshot>): void {
    const state = changes.state ?? this.snapshot.state;
    const next = {
      ...this.snapshot, ...changes, state,
      isListening: state === 'starting' || state === 'listening' || state === 'stopping',
    };
    if (next.state === this.snapshot.state && next.error === this.snapshot.error
      && next.interimTranscript === this.snapshot.interimTranscript) return;
    this.snapshot = next;
    this.listeners.forEach((listener) => listener());
  }
}
