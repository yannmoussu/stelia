export type ConsultationStatus = "draft" | "in_progress" | "completed";

export interface Patient {
  nom: string | null;
  prenom: string | null;
  date_naissance: string | null;
}

export interface ConsultationContext {
  motif_demande: string | null;
  suivi_ophtalmologique: string | null;
  correction_visuelle: string | null;
  signes_fonctionnels: string | null;
}

export interface VisualAcuity {
  vision_lointaine: {
    od: string | null;
    og: string | null;
  };
  vision_proche: {
    od: string | null;
    og: string | null;
  };
  correction: string | null;
}

export interface FusionCapacities {
  convergence: string | null;
  divergence: string | null;
  convergence_proche: string | null;
  divergence_proche: string | null;
  valeur_brute: string | null;
}

export interface BilanSensoriel {
  acuite_visuelle: VisualAcuity;
  capacites_fusionnelles: FusionCapacities;
  acuite_stereoscopique: string | null;
  conclusion: string | null;
}

export interface BilanOptomoteur {
  parallellisme: {
    pres: string | null;
    loin: string | null;
  };
  mesure_angle_prismes: {
    vision_proche: string | null;
    vision_lointaine: string | null;
    valeur_brute: string | null;
  };
  motilite: string | null;
  motricite_conjuguee: {
    fixation: string | null;
    poursuite: string | null;
    saccades: string | null;
  };
  ppc: string | null;
  conclusion: string | null;
}

export interface Conclusion {
  synthese_clinique: string | null;
  prise_en_charge: string | null;
  recommandations: string | null;
  suivi: string | null;
}

export interface Consultation {
  id: string;
  patient: Patient;
  contexte: ConsultationContext;
  bilan_sensoriel: BilanSensoriel;
  bilan_optomoteur: BilanOptomoteur;
  conclusion: Conclusion;
  transcript: string | null;
  status: ConsultationStatus;
  createdAt: Date;
  updatedAt: Date;
}
