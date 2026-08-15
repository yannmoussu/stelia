import type { Audit, BuildingData } from '../types/audit';

export const MOCK_AUDITS: Audit[] = [
  {
    id: '1',
    address: '24 rue Victor Hugo',
    propertyType: 'Appartement',
    surfaceM2: 64,
    date: '2026-08-10',
    status: 'completed',
    progress: 100,
  },
  {
    id: '2',
    address: '8 avenue de la République',
    propertyType: 'Maison',
    surfaceM2: 120,
    date: '2026-08-14',
    status: 'in_progress',
    progress: 45,
  },
  {
    id: '3',
    address: '15 rue Pasteur',
    propertyType: 'Appartement',
    surfaceM2: 42,
    date: '2026-08-15',
    status: 'draft',
    progress: 10,
  },
];

export const MOCK_BUILDING_DATA: BuildingData = {
  propertyType: 'Appartement',
  surfaceM2: 64,
  constructionYear: 1985,
  walls: [
    { id: 'w1', orientation: 'Nord', material: 'Brique creuse', thicknessCm: 20, insulation: 'Non renseignée' },
    { id: 'w2', orientation: 'Sud', material: 'Béton', thicknessCm: 20, insulation: 'Laine de verre' },
  ],
  windows: [
    { id: 'win1', room: 'Salon', material: 'PVC', glazing: 'Double vitrage', widthCm: 120, heightCm: 135 },
    { id: 'win2', room: 'Chambre', material: 'PVC', glazing: 'Double vitrage' },
  ],
  heating: {
    id: 'h1',
    type: 'Chaudière gaz à condensation',
    energy: 'Gaz',
    powerKw: 24,
    year: 2019,
  },
};
