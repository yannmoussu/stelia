import type { Consultation } from '@stelia/contracts';

export type MutationResult =
  | { kind: 'updated'; consultation: Consultation }
  | { kind: 'conflict' }
  | { kind: 'missing' };
export type DeleteResult = 'deleted' | 'conflict' | 'missing';

/** Every operation requires an owner; identity and revisions never come from user patches. */
export interface ConsultationRepository {
  create(ownerId: string, consultation: Consultation): Promise<Consultation>;
  findById(ownerId: string, id: string): Promise<Consultation | null>;
  findAll(ownerId: string): Promise<Consultation[]>;
  replace(ownerId: string, id: string, expectedRevision: number, consultation: Consultation): Promise<MutationResult>;
  delete(ownerId: string, id: string, expectedRevision: number): Promise<DeleteResult>;
}
