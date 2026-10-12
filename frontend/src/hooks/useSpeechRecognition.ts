import { useEffect, useLayoutEffect, useMemo, useSyncExternalStore } from 'react';
import { SpeechRecognitionController } from '../speech/controller';
import { getBrowserRecognitionFactory } from '../speech/recognition';
import type { RecognitionFactory } from '../speech/recognition';

export interface SpeechRecognitionOptions {
  onFinalSegment?: (text: string) => void;
  factory?: RecognitionFactory;
  enabled?: boolean;
}

export function useSpeechRecognition({
  onFinalSegment,
  factory,
  enabled = true,
}: SpeechRecognitionOptions = {}) {
  const controller = useMemo(() => new SpeechRecognitionController({
    factory: factory ?? getBrowserRecognitionFactory(),
    enabled,
  }), [factory, enabled]);
  useLayoutEffect(() => {
    controller.setOnFinalSegment(onFinalSegment);
  }, [controller, onFinalSegment]);
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  useEffect(() => {
    controller.setEnabled(enabled);
    return () => controller.dispose();
  }, [controller, enabled]);

  return { ...snapshot, start: controller.start, stop: controller.stop };
}
