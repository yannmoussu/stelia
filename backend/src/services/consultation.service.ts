import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  ConsultationSchema, MedicalReportSchema, MEDICAL_SCHEMA_VERSION,
  CreateConsultationSchema, UpdateConsultationSchema, SaveTranscriptSchema, ReviewReportSchema,
  type Consultation,
} from '@stelia/contracts';
import { AppError, conflict, notFound } from '../api/errors.js';
import type { ConsultationRepository } from '../repositories/consultation.repository.js';
import type { AIService } from './ai.service.js';

type CreateInput = z.infer<typeof CreateConsultationSchema>;
type UpdateInput = z.infer<typeof UpdateConsultationSchema>;
type TranscriptInput = z.infer<typeof SaveTranscriptSchema>;
type ReviewInput = z.infer<typeof ReviewReportSchema>;

export class ConsultationService {
  constructor(
    private readonly repository: ConsultationRepository,
    private readonly ai: AIService,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async create(ownerId: string, input: CreateInput): Promise<Consultation> {
    const now = this.clock().toISOString();
    const consultation = ConsultationSchema.parse({
      ...input,
      id: randomUUID(), revision: 1, createdAt: now, updatedAt: now,
      status: input.transcript.trim() ? 'in_progress' : 'draft',
      reportProposal: null, validatedReport: null,
    });
    return this.repository.create(ownerId, consultation);
  }

  async get(ownerId: string, id: string): Promise<Consultation> {
    const document = await this.repository.findById(ownerId, id);
    if (!document) throw notFound();
    return document;
  }

  async list(ownerId: string) {
    const documents = await this.repository.findAll(ownerId);
    return documents.map(({ id, patient, consultationDate, consultationType, status, revision, updatedAt }) =>
      ({ id, patient, consultationDate, consultationType, status, revision, updatedAt }));
  }

  async update(ownerId: string, id: string, input: UpdateInput): Promise<Consultation> {
    const current = await this.getRevision(ownerId, id, input.expectedRevision);
    const patientChanged = input.patient && (
      input.patient.nom !== current.patient.nom ||
      input.patient.prenom !== current.patient.prenom ||
      input.patient.date_naissance !== current.patient.date_naissance
    );
    const contextChanged = patientChanged ||
      (input.consultationDate !== undefined && input.consultationDate !== current.consultationDate) ||
      (input.consultationType !== undefined && input.consultationType !== current.consultationType);
    if (contextChanged && (current.reportProposal || current.validatedReport)) {
      throw new AppError(409, 'CONTEXT_LOCKED', 'Le patient, la date et le type de consultation sont verrouillés après rédaction d’un compte rendu.');
    }
    const { expectedRevision, ...metadata } = input;
    return this.replace(ownerId, current, expectedRevision, metadata);
  }

  async saveTranscript(ownerId: string, id: string, input: TranscriptInput): Promise<Consultation> {
    const current = await this.getRevision(ownerId, id, input.expectedRevision);
    const changed = input.transcript !== current.transcript;
    return this.replace(ownerId, current, input.expectedRevision, {
      transcript: input.transcript,
      ...(changed ? {
        reportProposal: null,
        status: input.transcript.trim() ? 'in_progress' : 'draft',
      } : {}),
    });
  }

  async structure(ownerId: string, id: string, expectedRevision: number): Promise<Consultation> {
    const snapshot = await this.getRevision(ownerId, id, expectedRevision);
    if (!snapshot.transcript.trim()) throw new AppError(400, 'EMPTY_TRANSCRIPT', 'Enregistrez une transcription avant de générer une proposition.');
    let output: unknown;
    try {
      output = await this.ai.structureTranscript(snapshot.transcript);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(502, 'AI_UNAVAILABLE', 'Le service IA est indisponible.');
    }
    const result = MedicalReportSchema.safeParse(output);
    if (!result.success) throw new AppError(502, 'AI_INVALID_RESPONSE', 'La réponse IA ne respecte pas le schéma médical.');
    return this.replace(ownerId, snapshot, expectedRevision, {
      status: 'in_progress',
      reportProposal: {
        schemaVersion: MEDICAL_SCHEMA_VERSION,
        data: result.data,
        sourceTranscript: snapshot.transcript,
        sourceRevision: snapshot.revision,
        generatedAt: this.clock().toISOString(),
        provider: this.ai.provider,
        model: this.ai.model,
      },
    });
  }

  async review(ownerId: string, id: string, input: ReviewInput): Promise<Consultation> {
    const current = await this.getRevision(ownerId, id, input.expectedRevision);
    if (!input.data.conclusion.synthese_clinique?.trim()) {
      throw new AppError(400, 'INCOMPLETE_REPORT', 'Complétez la synthèse clinique avant validation.');
    }
    const now = this.clock().toISOString();
    if (input.source !== 'manual' && (!current.reportProposal || current.reportProposal.sourceTranscript !== current.transcript)) {
      throw new AppError(409, 'STALE_PROPOSAL', 'Générez une proposition à partir de la transcription actuelle avant validation.');
    }
    const provenance = input.source === 'manual' ? {
      schemaVersion: MEDICAL_SCHEMA_VERSION,
      sourceTranscript: current.transcript,
      sourceRevision: current.revision,
      generatedAt: now,
      provider: 'manual', model: 'human',
    } : current.reportProposal!;
    return this.replace(ownerId, current, input.expectedRevision, {
      status: 'completed',
      validatedReport: {
        ...provenance,
        data: input.data,
        reviewedAt: now,
      },
    });
  }

  async delete(ownerId: string, id: string, expectedRevision: number): Promise<void> {
    const result = await this.repository.delete(ownerId, id, expectedRevision);
    if (result === 'missing') throw notFound();
    if (result === 'conflict') throw conflict();
  }

  private async getRevision(ownerId: string, id: string, revision: number): Promise<Consultation> {
    const current = await this.get(ownerId, id);
    if (current.revision !== revision) throw conflict();
    return current;
  }

  private async replace(
    ownerId: string, current: Consultation, expectedRevision: number, changes: Partial<Consultation>,
  ): Promise<Consultation> {
    const nextPatient = changes.patient ?? current.patient;
    const nextDate = changes.consultationDate ?? current.consultationDate;
    if (nextPatient.date_naissance && nextPatient.date_naissance > nextDate) {
      throw new AppError(400, 'INVALID_PATIENT_DATE', 'La naissance doit précéder la consultation.');
    }
    const next = ConsultationSchema.parse({
      ...current, ...changes,
      id: current.id, createdAt: current.createdAt,
      revision: expectedRevision + 1,
      updatedAt: this.clock().toISOString(),
    });
    const result = await this.repository.replace(ownerId, current.id, expectedRevision, next);
    if (result.kind === 'missing') throw notFound();
    if (result.kind === 'conflict') throw conflict();
    return result.consultation;
  }
}
