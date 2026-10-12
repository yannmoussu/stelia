import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Consultation } from '@stelia/contracts';
import { TranscriptDraft } from '../domain/TranscriptDraft';
import { consultationService } from '../services/consultationService';

export function useConsultationDraft(initial: Consultation) {
  const [draft] = useState(() => new TranscriptDraft(initial, consultationService.saveTranscript));
  const lifecycleRef = useRef({ version: 0 });
  useEffect(() => {
    const lifecycle = lifecycleRef.current;
    const version = ++lifecycle.version;
    return () => { queueMicrotask(() => { if (lifecycle.version === version) draft.dispose(); }); };
  }, [draft]);
  const state = useSyncExternalStore(draft.subscribe, draft.getSnapshot, draft.getSnapshot);
  useEffect(() => {
    if (!state.dirty || state.status !== 'idle') return;
    const timer = window.setTimeout(() => { void draft.save().catch(() => undefined); }, 600);
    return () => window.clearTimeout(timer);
  }, [draft, state.dirty, state.status, state.text]);
  return { ...state, draft };
}
