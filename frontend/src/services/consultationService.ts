import type { Consultation } from '../types/consultation';
import { MOCK_CONSULTATIONS } from '../data/mockConsultations';

const STORAGE_KEY = 'voxortho_consultations';

export const consultationService = {
  getConsultations(): Consultation[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Fallback to mock consultations if nothing is stored, but save them first for consistency
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_CONSULTATIONS));
    return MOCK_CONSULTATIONS;
  },

  getConsultation(id: string): Consultation | null {
    if (id === 'demo') {
      return {
        ...MOCK_CONSULTATIONS[1],
        id: 'demo',
        transcript: "Patient présente une fatigue visuelle marquée en fin de journée. Convergence instable. Reflexes pupillaires normaux. Observation d'une légère hétérophorie.",
      };
    }

    const consultations = this.getConsultations();
    return consultations.find(c => c.id === id) || null;
  },

  createConsultation(data: Partial<Consultation>): Consultation {
    const consultations = this.getConsultations();

    const newConsultation: Consultation = {
      id: Math.random().toString(36).substr(2, 9),
      patientName: data.patientName || 'Patient Inconnu',
      consultationDate: data.consultationDate || new Date().toISOString().split('T')[0],
      consultationType: data.consultationType || 'Autre',
      status: 'draft',
      progress: 0,
      notes: data.notes,
      transcript: '',
    };

    const updatedConsultations = [...consultations, newConsultation];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConsultations));
    return newConsultation;
  },

  updateConsultation(id: string, data: Partial<Consultation>): Consultation | null {
    if (id === 'demo') return null; // Demo consultation is read-only

    const consultations = this.getConsultations();
    const index = consultations.findIndex(c => c.id === id);
    if (index === -1) return null;

    const updatedConsultation = { ...consultations[index], ...data };
    consultations[index] = updatedConsultation;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consultations));
    return updatedConsultation;
  },

  deleteConsultation(id: string): void {
    if (id === 'demo') return;
    const consultations = this.getConsultations().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consultations));
  },

  clearStorage(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};
