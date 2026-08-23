export const DEFAULT_CONSULTATION_STRUCTURE = {
  patient: {
    nom: null,
    prenom: null,
    date_naissance: null,
  },
  contexte: {
    motif_demande: null,
    suivi_ophtalmologique: null,
    correction_visuelle: null,
    signes_fonctionnels: null,
  },
  bilan_sensoriel: {
    acuite_visuelle: {
      vision_lointaine: { od: null, og: null },
      vision_proche: { od: null, og: null },
      correction: null,
    },
    capacites_fusionnelles: {
      convergence: null,
      divergence: null,
      convergence_proche: null,
      divergence_proche: null,
      valeur_brute: null,
    },
    acuite_stereoscopique: null,
    conclusion: null,
  },
  bilan_optomoteur: {
    parallellisme: { pres: null, loin: null },
    mesure_angle_prismes: {
      vision_proche: null,
      vision_lointaine: null,
      valeur_brute: null,
    },
    motilite: null,
    motricite_conjuguee: {
      fixation: null,
      poursuite: null,
      saccades: null,
    },
    ppc: null,
    conclusion: null,
  },
  conclusion: {
    synthese_clinique: null,
    prise_en_charge: null,
    recommandations: null,
    suivi: null,
  },
  transcript: null,
  status: 'draft',
};
