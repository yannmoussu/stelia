import React from 'react';
import type { Wall } from '../../types/audit';

interface WallCardProps {
  wall: Wall;
}

export const WallCard: React.FC<WallCardProps> = ({ wall }) => {
  const isMissing = !wall.insulation || wall.insulation === 'Non renseignée';

  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between group hover:border-brand-blue transition-colors">
      <div className="flex items-center gap-4">
        <div className="text-xs font-bold text-gray-400 w-12 uppercase">{wall.orientation}</div>
        <div className="text-sm font-medium text-gray-900">{wall.material}</div>
        {wall.thicknessCm && (
          <div className="text-sm text-gray-500">{wall.thicknessCm} cm</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${isMissing ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
          {wall.insulation || 'À compléter'}
        </span>
      </div>
    </div>
  );
};
