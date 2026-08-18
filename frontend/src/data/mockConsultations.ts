import type { Consultation } from '../types/consultation';

export const MOCK_CONSULTATIONS: Consultation[] = [
  {
    id: '1',
    patientName: 'Jean Dupont',
    consultationDate: '2026-08-10',
    consultationType: 'Bilan Orthoptique',
    status: 'completed',
    progress: 100,
    notes: 'Patient stable, suite de soins recommandée.',
  },
  {
    id: '2',
    patientName: 'Marie Curie',
    consultationDate: '2026-08-14',
    consultationType: 'Consultation de suivi',
    status: 'in_progress',
    progress: 45,
    notes: 'Observation de la convergence en cours.',
  },
  {
    id: '3',
    patientName: 'Pierre Martin',
    consultationDate: '2026-08-15',
    consultationType: 'Premier bilan',
    status: 'draft',
    progress: 10,
    notes: '',
  },
];
