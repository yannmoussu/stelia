import { describe, expect, it, vi } from 'vitest';
import type { Consultation, SaveTranscriptInput } from '@stelia/contracts';
import { TranscriptDraft } from './TranscriptDraft';
import { ApiError } from '../services/http';
import { consultationFixture, deferred } from '../test/fixtures';

describe('transcript persistence', () => {
  it('appends confirmed segments across sessions without replacing acquired or edited text', () => {
    const draft = new TranscriptDraft(consultationFixture(), vi.fn());
    draft.append(' première séance '); draft.append('deuxième séance');
    expect(draft.getSnapshot().text).toBe('Observations existantes première séance deuxième séance');
    draft.edit('Correction humaine'); draft.append('suite');
    expect(draft.getSnapshot().text).toBe('Correction humaine suite');
  });
  it('serializes writes and saves edits made during a pending request with the next revision', async () => {
    const first = deferred<Consultation>();
    const persist = vi.fn<(id: string, input: SaveTranscriptInput) => Promise<Consultation>>()
      .mockReturnValueOnce(first.promise)
      .mockImplementationOnce(async (_id, input) => consultationFixture({ transcript: input.transcript, revision: 3 }));
    const draft = new TranscriptDraft(consultationFixture(), persist);
    draft.edit('A'); const saving = draft.save(); draft.edit('A B');
    expect(draft.save()).toBe(saving);
    expect(persist).toHaveBeenCalledTimes(1);
    first.resolve(consultationFixture({ transcript: 'A', revision: 2 })); await saving;
    expect(persist.mock.calls.map(([, input]) => input)).toEqual([{ transcript: 'A', expectedRevision: 1 }, { transcript: 'A B', expectedRevision: 2 }]);
    expect(draft.getSnapshot()).toMatchObject({ text: 'A B', dirty: false, status: 'idle', consultation: { revision: 3 } });
  });
  it('keeps a failed draft and exposes the failure without automatic overwrite', async () => {
    const persist = vi.fn().mockRejectedValue(new ApiError('Session expirée', 401));
    const draft = new TranscriptDraft(consultationFixture(), persist); draft.edit('À conserver');
    await expect(draft.save()).rejects.toThrow('Session expirée');
    expect(draft.getSnapshot()).toMatchObject({ text: 'À conserver', dirty: true, status: 'error', failureStatus: 401 });
    expect(persist).toHaveBeenCalledTimes(1);
  });
  it('requires explicit conflict comparison before using a newer server revision', async () => {
    const persist = vi.fn().mockRejectedValueOnce(new ApiError('Conflit', 409)).mockResolvedValueOnce(consultationFixture({ transcript: 'Mon texte', revision: 8 }));
    const draft = new TranscriptDraft(consultationFixture(), persist); draft.edit('Mon texte');
    await expect(draft.save()).rejects.toThrow('Conflit');
    expect(draft.getSnapshot()).toMatchObject({ status: 'conflict', text: 'Mon texte', dirty: true });
    expect(persist).toHaveBeenCalledTimes(1);
    draft.rebaseForConfirmedSave(consultationFixture({ transcript: 'Texte distant', revision: 7 }));
    await draft.save();
    expect(persist.mock.calls[1]?.[1]).toEqual({ expectedRevision: 7, transcript: 'Mon texte' });
  });
  it('does not mark mismatched server responses saved', async () => {
    const draft = new TranscriptDraft(consultationFixture(), vi.fn().mockResolvedValue(consultationFixture({ transcript: 'Autre texte', revision: 2 })));
    draft.edit('Mon texte'); await expect(draft.save()).rejects.toThrow('ne correspond pas');
    expect(draft.getSnapshot()).toMatchObject({ dirty: true, text: 'Mon texte', status: 'error' });
  });
  it('aborts pending saves and ignores their result after disposal', async () => {
    const pending = deferred<Consultation>(); let signal: AbortSignal | undefined;
    const persist = vi.fn((_id: string, _input: SaveTranscriptInput, requestSignal?: AbortSignal) => { signal = requestSignal; return pending.promise; });
    const draft = new TranscriptDraft(consultationFixture(), persist); draft.edit('A'); const saving = draft.save();
    draft.dispose(); expect(signal?.aborted).toBe(true);
    pending.resolve(consultationFixture({ transcript: 'A', revision: 2 })); await saving;
    expect(draft.getSnapshot().consultation.revision).toBe(1);
  });
});
