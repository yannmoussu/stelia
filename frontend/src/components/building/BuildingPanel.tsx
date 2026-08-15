import React from 'react';
import type { BuildingData } from '../../types/audit';
import { BuildingSection } from './BuildingSection';
import { WallCard } from './WallCard';
import { WindowCard } from './WindowCard';
import { HeatingCard } from './HeatingCard';

interface BuildingPanelProps {
  data: BuildingData;
}

export const BuildingPanel: React.FC<BuildingPanelProps> = ({ data }) => {
  return (
    <div className="flex flex-col gap-8">
      <BuildingSection title="Informations générales">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 uppercase font-medium">Type</span>
            <span className="text-sm font-semibold text-gray-900">{data.propertyType}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 uppercase font-medium">Surface</span>
            <span className="text-sm font-semibold text-gray-900">{data.surfaceM2} m²</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500 uppercase font-medium">Construction</span>
            <span className="text-sm font-semibold text-gray-900">{data.constructionYear || 'Non renseignée'}</span>
          </div>
        </div>
      </BuildingSection>

      <BuildingSection title="Murs">
        <div className="grid grid-cols-1 gap-3">
          {data.walls.map((wall) => (
            <WallCard key={wall.id} wall={wall} />
          ))}
        </div>
      </BuildingSection>

      <BuildingSection title="Fenêtres">
        <div className="grid grid-cols-1 gap-3">
          {data.windows.map((win) => (
            <WindowCard key={win.id} window={win} />
          ))}
        </div>
      </BuildingSection>

      <BuildingSection title="Chauffage">
        {data.heating ? (
          <HeatingCard heating={data.heating} />
        ) : (
          <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center text-gray-500 text-sm">
            Aucun système de chauffage renseigné
          </div>
        )}
      </BuildingSection>
    </div>
  );
};
