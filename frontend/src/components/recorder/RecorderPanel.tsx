import React, { useState, useEffect } from 'react';
import { Mic, Square } from 'lucide-react';

export const RecorderPanel: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: number | undefined;
    if (isRecording) {
      interval = window.setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col items-center gap-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Enregistrement vocal</h3>
        <p className="text-sm text-gray-500">Décrivez vos observations à haute voix</p>
      </div>

      <div className="relative group">
        <div className={`absolute -inset-2 rounded-full blur-md transition-all duration-500 ${isRecording ? 'bg-red-400 opacity-50 animate-pulse' : 'bg-transparent opacity-0'}`} />
        <button
          onClick={() => setIsRecording(!isRecording)}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${isRecording ? 'bg-red-500 text-white scale-95 shadow-inner' : 'bg-brand-blue text-white hover:bg-brand-blue-dark shadow-lg hover:scale-105'}`}
        >
          {isRecording ? <Square size={32} fill="currentColor" /> : <Mic size={32} />}
        </button>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className={`text-2xl font-mono font-medium ${isRecording ? 'text-red-500' : 'text-gray-400'}`}>
          {formatTime(timer)}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-gray-300'}`} />
          <span className={isRecording ? 'text-red-500 font-medium' : 'text-gray-500'}>
            {isRecording ? 'Enregistrement en cours...' : 'Prêt à enregistrer'}
          </span>
        </div>
      </div>
    </div>
  );
};
