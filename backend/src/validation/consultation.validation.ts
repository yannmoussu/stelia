import { z } from 'zod';

export const PatientSchema = z.object({
  nom: z.string().nullable(),
  prenom: z.string().nullable(),
  date_naissance: z.string().nullable(),
});

export const ConsultationContextSchema = z.object({
  motif_demande: z.string().nullable(),
  suivi_ophtalmologique: z.string().nullable(),
  correction_visuelle: z.string().nullable(),
  signes_fonctionnels: z.string().nullable(),
});

export const VisualAcuitySchema = z.object({
  vision_lointaine: z.object({
    od: z.string().nullable(),
    og: z.string().nullable(),
  }),
  vision_proche: z.object({
    od: z.string().nullable(),
    og: z.string().nullable(),
  }),
  correction: z.string().nullable(),
});

export const FusionCapacitiesSchema = z.object({
  convergence: z.string().nullable(),
  divergence: z.string().nullable(),
  convergence_proche: z.string().nullable(),
  divergence_proche: z.string().nullable(),
  valeur_brute: z.string().nullable(),
});

export const BilanSensorielSchema = z.object({
  acuite_visuelle: VisualAcuitySchema,
  capacites_fusionnelles: FusionCapacitiesSchema,
  acuite_stereoscopique: z.string().nullable(),
  conclusion: z.string().nullable(),
});

export const BilanOptomoteurSchema = z.object({
  parallellisme: z.object({
    pres: z.string().nullable(),
    loin: z.string().nullable(),
  }),
  mesure_angle_prismes: z.object({
    vision_proche: z.string().nullable(),
    vision_lointaine: z.string().nullable(),
    valeur_brute: z.string().nullable(),
  }),
  motilite: z.string().nullable(),
  motricite_conjuguee: z.object({
    fixation: z.string().nullable(),
    poursuite: z.string().nullable(),
    saccades: z.string().nullable(),
  }),
  ppc: z.string().nullable(),
  conclusion: z.string().nullable(),
});

export const ConclusionSchema = z.object({
  synthese_clinique: z.string().nullable(),
  prise_en_charge: z.string().nullable(),
  recommandations: z.string().nullable(),
  suivi: z.string().nullable(),
});

export const ConsultationSchema = z.object({
  patient: PatientSchema,
  contexte: ConsultationContextSchema,
  bilan_sensoriel: BilanSensorielSchema,
  bilan_optomoteur: BilanOptomoteurSchema,
  conclusion: ConclusionSchema,
  transcript: z.string().nullable().optional(),
  status: z.enum(["draft", "in_progress", "completed"]).default("draft"),
});
