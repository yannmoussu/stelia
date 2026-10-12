import { describe, expect, it } from 'vitest';
import { createSessionResults, readRecognitionResults } from './results';
import { resultEvent } from './testHelpers';

describe('complete recognition result snapshots', () => {
  it('retains unchanged interim results before resultIndex', () => {
    const initial = readRecognitionResults(createSessionResults(), resultEvent([
      ['Alpha', true], ['Bravo', false], ['Charlie', false],
    ]).results);
    const revised = readRecognitionResults(initial.session, resultEvent([
      ['Alpha', true], ['Bravo', false], ['Delta', false],
    ], 2).results);
    expect(initial.finalSegment).toBe('Alpha');
    expect(initial.session.interimTranscript).toBe('Bravo Charlie');
    expect(revised.finalSegment).toBe('');
    expect(revised.session.interimTranscript).toBe('Bravo Delta');
  });

  it('removes hypotheses when the results list shrinks', () => {
    const initial = readRecognitionResults(createSessionResults(), resultEvent([
      ['Alpha', true], ['Bravo', false], ['Charlie', false],
    ]).results);
    const reduced = readRecognitionResults(initial.session, resultEvent([
      ['Alpha', true], ['Bravo', false],
    ], 2).results);
    expect(reduced.session.interimTranscript).toBe('Bravo');
    const finalOnly = readRecognitionResults(reduced.session, resultEvent([['Alpha', true]], 1).results);
    expect(finalOnly.session.interimTranscript).toBe('');
  });

  it('delivers each final index once, including identical words at different indices', () => {
    const first = readRecognitionResults(createSessionResults(), resultEvent([['Oui', true]]).results);
    const second = readRecognitionResults(first.session, resultEvent([['Oui', true], ['Oui', true]], 1).results);
    const repeated = readRecognitionResults(second.session, resultEvent([['Oui', true], ['Oui', true]], 1).results);
    expect(first.finalSegment).toBe('Oui');
    expect(second.finalSegment).toBe('Oui');
    expect(repeated.finalSegment).toBe('');
  });

  it('changes an interim into one final segment and normalizes boundaries', () => {
    const initial = readRecognitionResults(createSessionResults(), resultEvent([['Vision ', false]]).results);
    const final = readRecognitionResults(initial.session, resultEvent([[' Vision ', true], [' stable. ', true]]).results);
    expect(final.finalSegment).toBe('Vision stable.');
    expect(final.session.interimTranscript).toBe('');
    expect(initial.session.deliveredFinalIndices.size).toBe(0);
  });
});
