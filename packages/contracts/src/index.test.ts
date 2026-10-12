import { describe, expect, it } from 'vitest';
import { CreateConsultationInputSchema, DateOnlySchema, MedicalReportSchema, SaveTranscriptInputSchema, UpdateConsultationInputSchema, createEmptyMedicalReport, medicalReportJsonSchema } from './index.js';

describe('shared contracts', () => {
  const input = { patient: { nom: ' Martin ', prenom: 'Alice', date_naissance: '2000-02-29' }, consultationDate: '2026-10-12', consultationType: 'assessment', notes: 'À conserver' };
  it('preserves the real creation data and normalizes the patient name', () => {
    expect(CreateConsultationInputSchema.parse(input)).toEqual({ ...input, patient: { ...input.patient, nom: 'Martin' }, transcript: '' });
  });
  it('rejects the old silently discarded payload and server controlled fields', () => {
    expect(CreateConsultationInputSchema.safeParse({ patientName: 'Alice', consultationType: 'Bilan', notes: 'Important' }).success).toBe(false);
    expect(CreateConsultationInputSchema.safeParse({ ...input, id: 'forged' }).success).toBe(false);
    expect(UpdateConsultationInputSchema.safeParse({ expectedRevision: 1, status: 'completed' }).success).toBe(false);
    expect(UpdateConsultationInputSchema.safeParse({ expectedRevision: 1, patient: { nom: 'B' } }).success).toBe(false);
    expect(SaveTranscriptInputSchema.safeParse({ expectedRevision: 1, transcript: 42 }).success).toBe(false);
  });
  it('rejects impossible dates and a birth after the consultation', () => {
    expect(DateOnlySchema.safeParse('2026-02-29').success).toBe(false);
    expect(DateOnlySchema.safeParse('C').success).toBe(false);
    expect(CreateConsultationInputSchema.safeParse({ ...input, consultationDate: '1999-01-01' }).success).toBe(false);
  });
  it('requires all medical fields and forbids identity in AI output', () => {
    expect(MedicalReportSchema.safeParse({ contexte: {}, bilan_sensoriel: {}, bilan_optomoteur: {}, conclusion: {} }).success).toBe(false);
    expect(MedicalReportSchema.safeParse({ ...createEmptyMedicalReport(), patient: { nom: 'Fictif' } }).success).toBe(false);
    expect(medicalReportJsonSchema).toMatchObject({ additionalProperties: false, required: ['contexte', 'bilan_sensoriel', 'bilan_optomoteur', 'conclusion'] });
    const properties = medicalReportJsonSchema.properties as Record<string, { required: string[] }>;
    expect(properties.contexte.required).toContain('motif_demande');
  });
  it('creates independent empty reports', () => {
    const first = createEmptyMedicalReport(); const second = createEmptyMedicalReport();
    first.bilan_sensoriel.acuite_visuelle.vision_lointaine.od = '9/10';
    expect(second.bilan_sensoriel.acuite_visuelle.vision_lointaine.od).toBeNull();
  });
});
