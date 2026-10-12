import type { Consultation } from '@stelia/contracts';
export const consultationId = '123e4567-e89b-42d3-a456-426614174000';
export const secondConsultationId = '123e4567-e89b-42d3-a456-426614174001';
export const userId = '123e4567-e89b-42d3-a456-426614174002';
export function consultationFixture(overrides: Partial<Consultation> = {}): Consultation {
  return {
    id: consultationId, patient: { nom: 'Martin', prenom: 'Alice', date_naissance: '1990-01-02' },
    consultationDate: '2026-10-12', consultationType: 'assessment', notes: 'À conserver', transcript: 'Observations existantes',
    status: 'draft', revision: 1, createdAt: '2026-10-12T10:00:00.000Z', updatedAt: '2026-10-12T10:00:00.000Z', reportProposal: null, validatedReport: null,
    ...overrides,
  };
}
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
}
