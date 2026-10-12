import type { RecognitionResults } from './recognition';

export interface SessionResults {
  readonly deliveredFinalIndices: ReadonlySet<number>;
  readonly interimTranscript: string;
}
export const createSessionResults = (): SessionResults => ({
  deliveredFinalIndices: new Set<number>(),
  interimTranscript: '',
});

/**
 * Results is a full session snapshot. resultIndex marks the first changed
 * entry; earlier interim hypotheses remain part of the current transcript.
 * See https://webaudio.github.io/web-speech-api/#speechrecognitionevent
 */
export function readRecognitionResults(
  previous: SessionResults,
  results: RecognitionResults,
): { session: SessionResults; finalSegment: string } {
  const deliveredFinalIndices = new Set(previous.deliveredFinalIndices);
  const finalPieces: string[] = [];
  const interimPieces: string[] = [];
  for (let index = 0; index < results.length; index += 1) {
    const result = results[index];
    if (!result) continue;
    const text = result[0]?.transcript.trim() ?? '';
    if (result.isFinal) {
      if (!deliveredFinalIndices.has(index)) {
        deliveredFinalIndices.add(index);
        if (text) finalPieces.push(text);
      }
    } else if (text) interimPieces.push(text);
  }
  return {
    session: { deliveredFinalIndices, interimTranscript: interimPieces.join(' ') },
    finalSegment: finalPieces.join(' '),
  };
}
