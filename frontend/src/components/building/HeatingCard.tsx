import React from 'react';
import type { HeatingSystem } from '../../types/audit';

interface HeatingCardProps {
  heating: HeatingSystem;
}

export const HeatingCard: React.FC<HeatingCardProps> = ({ heating }) => {
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg group hover:border-brand-blue transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="text-sm font-semibold text-gray-900">{heating.type}</div>
        <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-50 text-gray-600 border-gray-200">
          {heating.energy}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 uppercase font-medium">Puissance</span>
          <span className="text-sm font-medium text-gray-900">{heating.powerKw ? `${heating.powerKw} kW` : 'Non renseignée'}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 uppercase font-medium">Année d'installation</span>
          <span className="text-sm font-medium text-gray-900">{heating.year || 'Non renseignée'}</span>
        </div>
      </div>
    </div>
  );
};
