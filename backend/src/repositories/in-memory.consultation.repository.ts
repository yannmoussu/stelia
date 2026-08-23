import { IConsultationRepository } from './consultation.repository';
import type { Consultation } from '../domain/models/consultation';
import { v4 as uuidv4 } from 'uuid';

export class InMemoryConsultationRepository implements IConsultationRepository {
  private consultations = new Map<string, Consultation>();

  async create(data: Omit<Consultation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Consultation> {
    const id = uuidv4();
    const now = new Date();
    const consultation: Consultation = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.consultations.set(id, consultation);
    return consultation;
  }

  async findById(id: string): Promise<Consultation | null> {
    return this.consultations.get(id) || null;
  }

  async findAll(): Promise<Consultation[]> {
    return Array.from(this.consultations.values());
  }

  async update(id: string, data: Partial<Consultation>): Promise<Consultation | null> {
    const existing = this.consultations.get(id);
    if (!existing) return null;

    const updated: Consultation = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.consultations.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.consultations.delete(id);
  }
}
