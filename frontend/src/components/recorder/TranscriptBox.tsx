import React from 'react';
import { MessageSquareQuote } from 'lucide-react';

interface TranscriptBoxProps {
  text: string;
}

export const TranscriptBox: React.FC<TranscriptBoxProps> = ({ text }) => {
  return (
    <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg relative">
      <div className="flex items-center gap-2 text-gray-400 mb-3 pb-2 border-b border-gray-200">
        <MessageSquareQuote size={16} />
        <span className="text-xs font-medium uppercase tracking-wider">Transcription</span>
      </div>
      <p className="text-gray-700 leading-relaxed italic">
        "{text}"
      </p>
    </div>
  );
};
