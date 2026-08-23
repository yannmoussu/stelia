import type { Consultation } from '../domain/models/consultation';

export interface IConsultationRepository {
  create(data: Omit<Consultation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Consultation>;
  findById(id: string): Promise<Consultation | null>;
  findAll(): Promise<Consultation[]>;
  update(id: string, data: Partial<Consultation>): Promise<Consultation | null>;
  delete(id: string): Promise<boolean>;
}
