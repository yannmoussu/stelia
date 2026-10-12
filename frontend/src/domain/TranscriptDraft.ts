import type { Consultation, SaveTranscriptInput } from '@stelia/contracts';
import { ApiError, errorMessage } from '../services/http';

export interface DraftSnapshot {
  consultation: Consultation;
  text: string;
  dirty: boolean;
  status: 'idle' | 'saving' | 'error' | 'conflict';
  error: string | null;
  failureStatus: number | null;
}
type Save = (id: string, input: SaveTranscriptInput, signal?: AbortSignal) => Promise<Consultation>;

/** One consultation, one serial writer. A failed write keeps the local text. */
export class TranscriptDraft {
  private snapshot: DraftSnapshot;
  private listeners = new Set<() => void>();
  private inFlight: Promise<void> | null = null;
  private controller = new AbortController();

  private readonly persist: Save;

  constructor(consultation: Consultation, persist: Save) {
    this.persist = persist;
    this.snapshot = { consultation, text: consultation.transcript, dirty: false, status: 'idle', error: null, failureStatus: null };
  }
  getSnapshot = (): DraftSnapshot => this.snapshot;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private publish(next: DraftSnapshot) {
    this.snapshot = next;
    this.listeners.forEach((listener) => listener());
  }
  edit = (text: string) => {
    this.publish({ ...this.snapshot, text, dirty: text !== this.snapshot.consultation.transcript });
  };
  append = (segment: string) => {
    const text = segment.trim();
    if (text) this.edit(`${this.snapshot.text}${this.snapshot.text && !/\s$/.test(this.snapshot.text) ? ' ' : ''}${text}`);
  };
  save = (): Promise<void> => {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.write().finally(() => { this.inFlight = null; });
    return this.inFlight;
  };
  private async write(): Promise<void> {
    const signal = this.controller.signal;
    while (this.snapshot.dirty) {
      const text = this.snapshot.text;
      const consultation = this.snapshot.consultation;
      this.publish({ ...this.snapshot, status: 'saving', error: null, failureStatus: null });
      try {
        const result = await this.persist(consultation.id, { expectedRevision: consultation.revision, transcript: text }, signal);
        if (signal.aborted) return;
        if (result.id !== consultation.id || result.transcript !== text || result.revision <= consultation.revision) throw new Error('La sauvegarde retournée par le serveur ne correspond pas au texte envoyé.');
        this.publish({ ...this.snapshot, consultation: result, dirty: this.snapshot.text !== result.transcript, status: 'idle', error: null, failureStatus: null });
      } catch (cause) {
        if (signal.aborted) return;
        this.publish({ ...this.snapshot, status: cause instanceof ApiError && cause.status === 409 ? 'conflict' : 'error', error: errorMessage(cause), failureStatus: cause instanceof ApiError ? cause.status : null });
        throw cause;
      }
    }
  }
  markConflict = (cause: ApiError) => {
    this.publish({ ...this.snapshot, status: 'conflict', error: cause.message, failureStatus: 409 });
  };
  acceptServerResult = (consultation: Consultation) => {
    if (this.snapshot.dirty || this.inFlight) throw new Error('Le brouillon doit être sauvegardé avant cette opération.');
    if (consultation.id !== this.snapshot.consultation.id) throw new Error('La consultation retournée est incorrecte.');
    this.publish({ consultation, text: consultation.transcript, dirty: false, status: 'idle', error: null, failureStatus: null });
  };
  /** Called only after the user compares revisions and explicitly confirms. */
  rebaseForConfirmedSave = (consultation: Consultation) => {
    if (this.inFlight) throw new Error('Une sauvegarde est en cours.');
    if (consultation.id !== this.snapshot.consultation.id) throw new Error('La consultation retournée est incorrecte.');
    this.publish({ ...this.snapshot, consultation, dirty: this.snapshot.text !== consultation.transcript, status: 'idle', error: null, failureStatus: null });
  };
  replaceWithServer = (consultation: Consultation) => {
    if (this.inFlight) throw new Error('Une sauvegarde est en cours.');
    if (consultation.id !== this.snapshot.consultation.id) throw new Error('La consultation retournée est incorrecte.');
    this.publish({ consultation, text: consultation.transcript, dirty: false, status: 'idle', error: null, failureStatus: null });
  };
  dispose = () => { this.controller.abort(); this.listeners.clear(); };
}
