import { useState, useEffect, useRef, useCallback } from 'react';

// Types for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
  item(index: number): SpeechRecognitionResult;
}

// Use window.SpeechRecognition or window.webkitSpeechRecognition
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastFinalIndexRef = useRef(-1);

  useEffect(() => {
    console.log('[Speech] EFFECT MOUNT');
    if (!SpeechRecognition) return;

    const instanceId = Math.floor(Math.random() * 10000);
    console.log(`[Speech] CREATE instance ${instanceId}`);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';

    recognition.onstart = () => {
      console.log(`[Speech] START instance ${instanceId}`);
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      console.log(`[Speech] END instance ${instanceId}`);
      setIsListening(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.log(`[Speech] ERROR instance ${instanceId}: ${event.error}`);
      if (event.error === 'not-allowed') {
        setError("L'accès au microphone a été refusé. Autorisez le microphone dans les paramètres de votre navigateur.");
      } else {
        setError(`Erreur de reconnaissance : ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log(`[Speech] RESULT instance ${instanceId}`);
      console.log(`instance: ${instanceId}`);
      console.log(`resultIndex: ${event.resultIndex}`);
      console.log(`resultsLength: ${event.results.length}`);

      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i];
        console.log(`  result[${i}].isFinal: ${result.isFinal}`);
        console.log(`  result[${i}].text: ${result[0].transcript}`);
      }

      let newFinalPieces = '';
      let interim = '';

      // We start from 0 to ensure we catch any results that became final
      // but use lastFinalIndexRef to ensure we only add them once.
      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          if (i > lastFinalIndexRef.current) {
            newFinalPieces += result[0].transcript;
            lastFinalIndexRef.current = i;
          }
        } else if (i >= event.resultIndex) {
          interim += result[0].transcript;
        }
      }

      if (newFinalPieces) {
        setTranscript((prev) => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + newFinalPieces);
      }
      setInterimTranscript(interim);
    };

    recognitionRef.current = recognition;

    return () => {
      console.log('[Speech] EFFECT CLEANUP');
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognition) {
      setError("La transcription vocale n'est pas prise en charge par ce navigateur.");
      return;
    }

    try {
      console.log(`[Speech] START CALLED`);
      setTranscript('');
      setInterimTranscript('');
      lastFinalIndexRef.current = -1;
      recognitionRef.current?.start();
    } catch (e) {
      console.error("Speech recognition start error:", e);
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    isSupported: !!SpeechRecognition,
  };
}
