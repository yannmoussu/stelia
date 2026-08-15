import React from 'react';
import type { Window } from '../../types/audit';

interface WindowCardProps {
  window: Window;
}

export const WindowCard: React.FC<WindowCardProps> = ({ window }) => {
  const isMissing = !window.widthCm || !window.heightCm;

  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between group hover:border-brand-blue transition-colors">
      <div className="flex items-center gap-4">
        <div className="text-xs font-bold text-gray-400 w-12 uppercase">{window.room}</div>
        <div className="text-sm font-medium text-gray-900">{window.material} — {window.glazing}</div>
        {window.widthCm && window.heightCm && (
          <div className="text-sm text-gray-500">{window.widthCm} × {window.heightCm} cm</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isMissing && (
          <span className="text-xs px-2 py-0.5 rounded-full border bg-amber-50 text-amber-600 border-amber-100">
            Dimensions à compléter
          </span>
        )}
      </div>
    </div>
  );
};
