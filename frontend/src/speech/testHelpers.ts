import { vi } from 'vitest';
import type { RecognitionAdapter, RecognitionErrorEvent, RecognitionResultEvent } from './recognition';

export class FakeRecognition implements RecognitionAdapter {
  continuous = false;
  interimResults = false;
  lang = '';
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: RecognitionErrorEvent) => void) | null = null;
  onresult: ((event: RecognitionResultEvent) => void) | null = null;
  start = vi.fn<() => void>();
  stop = vi.fn<() => void>();
  abort = vi.fn<() => void>();

  result(pieces: ReadonlyArray<readonly [string, boolean]>, resultIndex = 0): void {
    this.onresult?.(resultEvent(pieces, resultIndex));
  }
}

export function resultEvent(
  pieces: ReadonlyArray<readonly [string, boolean]>,
  resultIndex = 0,
): RecognitionResultEvent {
  return {
    resultIndex,
    results: pieces.map(([transcript, isFinal]) => ({ isFinal, 0: { transcript } })),
  };
}
