import type { Audit } from '../types/audit';
import { MOCK_AUDITS } from '../data/mockAudits';

const STORAGE_KEY = 'diagflow_audits';

export const auditService = {
  getAudits(): Audit[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Fallback to mock audits if nothing is stored, but save them first for consistency
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_AUDITS));
    return MOCK_AUDITS;
  },

  getAudit(id: string): Audit | null {
    const audits = this.getAudits();
    return audits.find(a => a.id === id) || null;
  },

  createAudit(data: Partial<Audit>): Audit {
    const audits = this.getAudits();

    const newAudit: Audit = {
      id: Math.random().toString(36).substr(2, 9),
      address: data.address || '',
      addressComplement: data.addressComplement,
      postalCode: data.postalCode || '',
      city: data.city || '',
      propertyType: data.propertyType || 'Autre',
      surfaceM2: Number(data.surfaceM2) || 0,
      constructionYear: data.constructionYear ? Number(data.constructionYear) : undefined,
      date: new Date().toISOString().split('T')[0],
      status: 'draft',
      progress: 0,
      diagnosticType: data.diagnosticType as any || 'DPE',
      notes: data.notes,
      clientName: data.clientName || 'Client Inconnu',
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
    };

    const updatedAudits = [...audits, newAudit];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAudits));
    return newAudit;
  },

  updateAudit(id: string, data: Partial<Audit>): Audit | null {
    const audits = this.getAudits();
    const index = audits.findIndex(a => a.id === id);
    if (index === -1) return null;

    const updatedAudit = { ...audits[index], ...data };
    audits[index] = updatedAudit;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(audits));
    return updatedAudit;
  },

  deleteAudit(id: string): void {
    const audits = this.getAudits().filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(audits));
  },

  clearStorage(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};
