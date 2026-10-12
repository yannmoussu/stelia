// @vitest-environment jsdom
import { createElement, StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { FakeRecognition, resultEvent } from './testHelpers';

describe('React speech recorder', () => {
  it('survives StrictMode effect replay and detaches events on unmount', () => {
    const recognition = new FakeRecognition();
    const factory = vi.fn(() => recognition);
    const onFinalSegment = vi.fn<(text: string) => void>();
    const { result, unmount } = renderHook(() => useSpeechRecognition({ factory, onFinalSegment }), {
      wrapper: ({ children }) => createElement(StrictMode, null, children),
    });
    // Render/effect setup do not request microphone access.
    expect(factory).not.toHaveBeenCalled();
    act(() => result.current.start());
    act(() => recognition.onstart?.());
    expect(result.current.state).toBe('listening');
    act(() => recognition.result([['Conservé.', true]]));
    expect(onFinalSegment).toHaveBeenCalledWith('Conservé.');
    const lateResult = recognition.onresult;
    unmount();
    expect(recognition.abort).toHaveBeenCalledOnce();
    expect(recognition.onresult).toBeNull();
    lateResult?.(resultEvent([['Conservé.', true], ['Trop tard.', true]], 1));
    expect(onFinalSegment).toHaveBeenCalledTimes(1);
  });

  it('uses the latest committed callback without restarting an active session', () => {
    const recognition = new FakeRecognition();
    const factory = vi.fn(() => recognition);
    const first = vi.fn<(text: string) => void>();
    const second = vi.fn<(text: string) => void>();
    const { result, rerender, unmount } = renderHook(
      ({ callback }) => useSpeechRecognition({ factory, onFinalSegment: callback }),
      { initialProps: { callback: first } },
    );
    act(() => result.current.start());
    rerender({ callback: second });
    act(() => recognition.result([['Observations', true]]));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('Observations');
    expect(factory).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('updates all interim hypotheses and clears them on microphone error', () => {
    const recognition = new FakeRecognition();
    const factory = () => recognition;
    const { result, unmount } = renderHook(() => useSpeechRecognition({ factory }));
    act(() => result.current.start());
    act(() => recognition.result([['Bravo', false], ['Charlie', false]]));
    act(() => recognition.result([['Bravo', false], ['Delta', false]], 1));
    expect(result.current.interimTranscript).toBe('Bravo Delta');
    act(() => recognition.onerror?.({ error: 'not-allowed' }));
    expect(result.current.state).toBe('error');
    expect(result.current.interimTranscript).toBe('');
    expect(result.current.error).toContain('refusé');
    unmount();
  });

  it('finalizes before allowing the caller to continue', async () => {
    const recognition = new FakeRecognition();
    const factory = () => recognition;
    const onFinalSegment = vi.fn<(text: string) => void>();
    const { result, unmount } = renderHook(() => useSpeechRecognition({ factory, onFinalSegment }));
    act(() => result.current.start());
    let completion: Promise<void> = Promise.resolve();
    act(() => { completion = result.current.stop(); });
    expect(result.current.state).toBe('stopping');
    act(() => recognition.result([['Mots finaux.', true]]));
    await act(async () => {
      recognition.onend?.();
      await completion;
    });
    expect(onFinalSegment).toHaveBeenCalledWith('Mots finaux.');
    expect(result.current.state).toBe('idle');
    unmount();
  });
});
