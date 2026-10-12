import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { Mic, Square } from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

export interface RecorderHandle {
  stop: () => Promise<void>;
}

interface RecorderPanelProps {
  onFinalSegment: (segment: string) => void;
  onActivityChange: (active: boolean) => void;
  disabled?: boolean;
}

export const RecorderPanel = forwardRef<RecorderHandle, RecorderPanelProps>(function RecorderPanel({ onFinalSegment, onActivityChange, disabled = false }, ref) {
  const { state, isListening, interimTranscript, error, start, stop, isSupported } = useSpeechRecognition({ onFinalSegment });

  useImperativeHandle(ref, () => ({ stop }), [stop]);
  useEffect(() => { onActivityChange(isListening); }, [isListening, onActivityChange]);

  return (
    <div className="border border-gray-200 rounded-lg p-5 flex flex-col items-center gap-4">
      <p className="text-sm text-gray-500 text-center">Décrivez vos observations à haute voix. Les mots confirmés sont ajoutés au texte ci-dessous.</p>
      {!isSupported ? (
        <p className="text-sm text-gray-600">La dictée n’est pas disponible dans ce navigateur. Vous pouvez saisir vos observations ci-dessous.</p>
      ) : (
        <button
          type="button"
          onClick={() => { if (isListening) void stop().catch(() => undefined); else start(); }}
          disabled={disabled || state === 'stopping'}
          aria-label={isListening ? 'Arrêter la dictée' : 'Commencer la dictée'}
          aria-pressed={isListening}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white disabled:opacity-50 ${isListening ? 'bg-red-500' : 'bg-brand-blue hover:bg-brand-blue-dark'}`}
        >
          {isListening ? <Square size={26} fill="currentColor" aria-hidden="true" /> : <Mic size={26} aria-hidden="true" />}
        </button>
      )}
      <p role="status" className="text-sm text-gray-500">
        {state === 'starting' ? 'Autorisation du microphone…' : state === 'listening' ? 'Écoute en cours…' : state === 'stopping' ? 'Finalisation de la dictée…' : ''}
      </p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {interimTranscript && (
        <div className="w-full p-3 bg-gray-50 rounded-md text-sm text-gray-500">
          <p className="font-medium">Reconnaissance provisoire</p>
          <p>{interimTranscript}</p>
        </div>
      )}
    </div>
  );
});
