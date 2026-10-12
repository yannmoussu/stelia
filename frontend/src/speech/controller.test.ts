import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpeechRecognitionController } from './controller';
import { getBrowserRecognitionFactory } from './recognition';
import { FakeRecognition, resultEvent } from './testHelpers';

function fixture() {
  const instances: FakeRecognition[] = [];
  const onFinalSegment = vi.fn<(text: string) => void>();
  const factory = vi.fn(() => {
    const instance = new FakeRecognition();
    instances.push(instance);
    return instance;
  });
  const controller = new SpeechRecognitionController({ factory, onFinalSegment });
  return { controller, factory, instances, onFinalSegment };
}

afterEach(() => vi.useRealTimers());

describe('speech session lifecycle', () => {
  it('guards repeated starts synchronously while awaiting microphone permission', () => {
    const { controller, factory, instances } = fixture();
    controller.start();
    controller.start();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().state).toBe('starting');
    expect(instances[0].lang).toBe('fr-FR');
    expect(instances[0].continuous).toBe(true);
    expect(instances[0].interimResults).toBe(true);
    instances[0].onstart?.();
    expect(controller.getSnapshot().state).toBe('listening');
    controller.dispose();
  });

  it('delivers new finals only and starts fresh deduplication per session', () => {
    const { controller, instances, onFinalSegment } = fixture();
    controller.start();
    instances[0].result([['Première dictée', true]]);
    instances[0].result([['Première dictée', true]]);
    instances[0].onend?.();
    controller.start();
    instances[1].result([['Deuxième dictée', true]]);
    expect(onFinalSegment.mock.calls).toEqual([['Première dictée'], ['Deuxième dictée']]);
    controller.dispose();
  });

  it('finalizes last words before resolving stop, without accepting a new start', async () => {
    const { controller, factory, instances, onFinalSegment } = fixture();
    controller.start();
    instances[0].onstart?.();
    const finished = vi.fn();
    const completion = controller.stop();
    completion.then(finished);
    expect(controller.stop()).toBe(completion);
    expect(controller.getSnapshot().state).toBe('stopping');
    controller.start();
    expect(factory).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(finished).not.toHaveBeenCalled();
    instances[0].result([['Derniers mots.', true]]);
    expect(onFinalSegment).toHaveBeenCalledWith('Derniers mots.');
    instances[0].onend?.();
    await completion;
    expect(finished).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().state).toBe('idle');
    expect(instances[0].stop).toHaveBeenCalledTimes(1);
  });

  it('ignores captured late callbacks after cleanup and restart', () => {
    const { controller, instances, onFinalSegment } = fixture();
    controller.start();
    const lateResult = instances[0].onresult;
    const lateStart = instances[0].onstart;
    const lateEnd = instances[0].onend;
    const lateError = instances[0].onerror;
    controller.dispose();
    expect(instances[0].abort).toHaveBeenCalledOnce();
    expect(instances[0].onresult).toBeNull();
    expect(instances[0].onstart).toBeNull();
    expect(instances[0].onend).toBeNull();
    expect(instances[0].onerror).toBeNull();
    controller.setEnabled(true);
    controller.start();
    lateResult?.(resultEvent([['Ancien dossier', true]]));
    lateStart?.();
    lateEnd?.();
    lateError?.({ error: 'network' });
    expect(onFinalSegment).not.toHaveBeenCalled();
    expect(controller.getSnapshot().state).toBe('starting');
    instances[1].onstart?.();
    expect(controller.getSnapshot().state).toBe('listening');
    controller.dispose();
  });

  it('reports refused microphone access, clears hypotheses and allows retry', () => {
    const { controller, instances, onFinalSegment } = fixture();
    controller.start();
    instances[0].result([['Texte conservé.', true], ['Provisoire', false]]);
    instances[0].onerror?.({ error: 'not-allowed' });
    expect(controller.getSnapshot().error).toContain('refusé');
    expect(controller.getSnapshot().state).toBe('error');
    expect(controller.getSnapshot().interimTranscript).toBe('');
    expect(onFinalSegment).toHaveBeenCalledWith('Texte conservé.');
    controller.start();
    instances[1].onstart?.();
    expect(controller.getSnapshot().error).toBeNull();
    expect(controller.getSnapshot().state).toBe('listening');
    controller.dispose();
  });

  it('does not change previously emitted text when start throws', () => {
    const onFinalSegment = vi.fn<(text: string) => void>();
    const first = new FakeRecognition();
    const refused = new FakeRecognition();
    refused.start.mockImplementation(() => { throw new DOMException('blocked', 'NotAllowedError'); });
    const factory = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(refused);
    const controller = new SpeechRecognitionController({ factory, onFinalSegment });
    controller.start();
    first.result([['Observations existantes', true]]);
    first.onend?.();
    controller.start();
    expect(controller.getSnapshot().state).toBe('error');
    expect(controller.getSnapshot().error).toContain('refusé');
    expect(onFinalSegment.mock.calls).toEqual([['Observations existantes']]);
    expect(refused.onresult).toBeNull();
  });

  it('reports constructor failures and can be retried', () => {
    const factory = vi.fn(() => { throw new Error('private provider internals'); });
    const controller = new SpeechRecognitionController({ factory });
    controller.start();
    controller.start();
    expect(factory).toHaveBeenCalledTimes(2);
    expect(controller.getSnapshot().error).not.toContain('private');
    expect(controller.getSnapshot().state).toBe('error');
  });

  it('rejects a stalled finalization, detaches events and stops the microphone', async () => {
    vi.useFakeTimers();
    const { controller, instances } = fixture();
    controller.start();
    const completion = controller.stop();
    const rejected = expect(completion).rejects.toThrow('finalisation');
    vi.advanceTimersByTime(8_000);
    await rejected;
    expect(controller.getSnapshot().state).toBe('error');
    expect(instances[0].abort).toHaveBeenCalledOnce();
    expect(instances[0].onresult).toBeNull();
  });

  it('rejects finalization errors and synchronous stop failures', async () => {
    const { controller, instances } = fixture();
    controller.start();
    const completion = controller.stop();
    const rejected = expect(completion).rejects.toThrow('connexion');
    instances[0].onerror?.({ error: 'network' });
    await rejected;
    controller.start();
    instances[1].stop.mockImplementation(() => { throw new Error('failure'); });
    await expect(controller.stop()).rejects.toThrow('dictée');
    expect(controller.getSnapshot().state).toBe('error');
  });

  it('does not restart automatically after natural end', () => {
    const { controller, factory, instances } = fixture();
    controller.start();
    instances[0].result([['Hypothèse', false]]);
    instances[0].onend?.();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().state).toBe('idle');
    expect(controller.getSnapshot().interimTranscript).toBe('');
  });

  it('aborts a disabled recorder and can be re-enabled after StrictMode cleanup', () => {
    const { controller, instances } = fixture();
    controller.start();
    controller.setEnabled(false);
    controller.start();
    expect(instances).toHaveLength(1);
    expect(instances[0].abort).toHaveBeenCalledOnce();
    controller.setEnabled(true);
    controller.start();
    expect(instances).toHaveLength(2);
    controller.dispose();
  });

  it('handles missing browser support and idempotent stopping', async () => {
    const controller = new SpeechRecognitionController({ factory: null });
    expect(controller.getSnapshot().isSupported).toBe(false);
    controller.start();
    expect(controller.getSnapshot().error).toContain('n\'est pas prise en charge');
    await expect(controller.stop()).resolves.toBeUndefined();
    controller.dispose();
    controller.dispose();
    // A missing browser API is handled without requiring global constructors.
    expect(getBrowserRecognitionFactory()).toBeNull();
  });
});
