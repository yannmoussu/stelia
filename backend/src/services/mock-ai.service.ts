import { IAIService } from './ai.service';
import type { Consultation } from '../domain/models/consultation';

export class MockAIService implements IAIService {
  async structureTranscript(transcript: string): Promise<Partial<Consultation>> {
    // In a real implementation, this would call an LLM and validate the output against the JSON schema.
    // For the mock, we return a structured object if the transcript is not empty.
    if (!transcript) {
      return {};
    }

    return {
      patient: {
        nom: "Doe",
        prenom: "John",
        date_naissance: "1980-01-01",
      },
      contexte: {
        motif_demande: `Analyse de la transcription : ${transcript.substring(0, 50)}...`,
        suivi_ophtalmologique: "Régulier",
        correction_visuelle: "Lunettes",
        signes_fonctionnels: "Fatigue visuelle",
      },
      bilan_sensoriel: {
        acuite_visuelle: {
          vision_lointaine: { od: "10/10", og: "10/10" },
          vision_proche: { od: "10/10", og: "10/10" },
          correction: "Sans correction",
        },
        capacites_fusionnelles: {
          convergence: "Normale",
          divergence: "Normale",
          convergence_proche: "Normale",
          divergence_proche: "Normale",
          valeur_brute: "N/A",
        },
        acuite_stereoscopique: "Bonne",
        conclusion: "Bilan sensoriel normal",
      },
      bilan_optomoteur: {
        parallellisme: { pres: "Normal", loin: "Normal" },
        mesure_angle_prismes: {
          vision_proche: "0",
          vision_lointaine: "0",
          valeur_brute: "0",
        },
        motilite: "Normale",
        motricite_conjuguee: {
          fixation: "Stable",
          poursuite: "Fluide",
          saccades: "Précises",
        },
        ppc: "Normal",
        conclusion: "Bilan optomoteur normal",
      },
      conclusion: {
        synthese_clinique: "Patient présentant des symptômes de fatigue visuelle malgré un bilan normal.",
        prise_en_charge: "Repos visuel recommandé",
        recommandations: "Pause toutes les 2 heures",
        suivi: "Contrôle dans 6 mois",
      },
    };
  }
}
