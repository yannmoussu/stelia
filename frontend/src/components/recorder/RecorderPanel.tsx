import React from 'react';
import { Mic, Square } from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { TranscriptBox } from './TranscriptBox';

export const RecorderPanel: React.FC = () => {
  const {
    isListening,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    isSupported
  } = useSpeechRecognition();

  const toggleListening = () => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col items-center gap-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Enregistrement vocal</h3>
        <p className="text-sm text-gray-500">Décrivez vos observations à haute voix</p>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-full">
            <Mic size={24} />
          </div>
          <p className="text-sm text-red-500 text-center max-w-xs font-medium">
            {error}
          </p>
          <button
            onClick={() => start()}
            className="text-sm text-brand-blue font-medium hover:underline"
          >
            Réessayer
          </button>
        </div>
      ) : !isSupported ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="p-3 bg-gray-100 text-gray-400 rounded-full">
            <Mic size={24} />
          </div>
          <p className="text-sm text-gray-500 text-center max-w-xs">
            La transcription vocale n'est pas prise en charge par ce navigateur.
          </p>
        </div>
      ) : (
        <>
          <div className="relative group">
            <div className={`absolute -inset-2 rounded-full blur-md transition-all duration-500 ${isListening ? 'bg-red-400 opacity-50 animate-pulse' : 'bg-transparent opacity-0'}`} />
            <button
              onClick={toggleListening}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${isListening ? 'bg-red-500 text-white scale-95 shadow-inner' : 'bg-brand-blue text-white hover:bg-brand-blue-dark shadow-lg hover:scale-105'}`}
            >
              {isListening ? <Square size={32} fill="currentColor" /> : <Mic size={32} />}
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="text-sm font-medium">
              {isListening ? (
                <span className="text-red-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  Écoute en cours...
                </span>
              ) : (
                <span className="text-gray-500">Commencer l'enregistrement</span>
              )}
            </div>
          </div>
        </>
      )}

      { (transcript || interimTranscript) && (
        <TranscriptBox
          text={`${transcript} ${interimTranscript}`}
        />
      )}
    </div>
  );
};
