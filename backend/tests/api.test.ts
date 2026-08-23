import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { configureCors } from '../src/api/plugins/cors';
import { healthRoutes } from '../src/api/routes/health';
import { consultationRoutes } from '../src/api/routes/consultations';
import { InMemoryConsultationRepository } from '../src/repositories/in-memory.consultation.repository';
import { MockAIService } from '../src/services/mock-ai.service';

describe('Backend API', () => {
  let server: any;

  beforeEach(async () => {
    server = Fastify();

    // Setup dependencies
    const repo = new InMemoryConsultationRepository();
    const aiService = new MockAIService();

    // Mock the decorators since we are not using the full bootstrap
    server.decorate('consultationRepo', repo);
    server.decorate('aiService', aiService);

    await configureCors(server);
    await server.register(healthRoutes);
    await server.register(consultationRoutes);

    await server.ready();
  });

  it('GET /health should return ok', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ status: 'ok' });
  });

  it('POST /api/consultations should create a consultation', async () => {
    const payload = {
      patient: { nom: "Doe", prenom: "John", date_naissance: "1980-01-01" },
      contexte: { motif_demande: "Checkup", suivi_ophtalmologique: null, correction_visuelle: null, signes_fonctionnels: null },
      bilan_sensoriel: {
        acuite_visuelle: { vision_lointaine: { od: "10/10", og: "10/10" }, vision_proche: { od: "10/10", og: "10/10" }, correction: null },
        capacites_fusionnelles: { convergence: null, divergence: null, convergence_proche: null, divergence_proche: null, valeur_brute: null },
        acuite_stereoscopique: null,
        conclusion: null
      },
      bilan_optomoteur: {
        parallellisme: { pres: null, loin: null },
        mesure_angle_prismes: { vision_proche: null, vision_lointaine: null, valeur_brute: null },
        motilite: null,
        motricite_conjuguee: { fixation: null, poursuite: null, saccades: null },
        ppc: null,
        conclusion: null
      },
      conclusion: { synthese_clinique: null, prise_en_charge: null, recommandations: null, suivi: null }
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/consultations',
      payload: payload,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body).toHaveProperty('id');
    expect(body.patient.nom).toBe("Doe");
  });

  it('GET /api/consultations should return a list of consultations', async () => {
    // Create one first
    await server.inject({
      method: 'POST',
      url: '/api/consultations',
      payload: {
        patient: { nom: "A", prenom: "B", date_naissance: "C" },
        contexte: { motif_demande: "X", suivi_ophtalmologique: null, correction_visuelle: null, signes_fonctionnels: null },
        bilan_sensoriel: {
          acuite_visuelle: { vision_lointaine: { od: "10/10", og: "10/10" }, vision_proche: { od: "10/10", og: "10/10" }, correction: null },
          capacites_fusionnelles: { convergence: null, divergence: null, convergence_proche: null, divergence_proche: null, valeur_brute: null },
          acuite_stereoscopique: null,
          conclusion: null
        },
        bilan_optomoteur: {
          parallellisme: { pres: null, loin: null },
          mesure_angle_prismes: { vision_proche: null, vision_lointaine: null, valeur_brute: null },
          motilite: null,
          motricite_conjuguee: { fixation: null, poursuite: null, saccades: null },
          ppc: null,
          conclusion: null
        },
        conclusion: { synthese_clinique: null, prise_en_charge: null, recommandations: null, suivi: null }
      }
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/consultations',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(1);
  });

  it('GET /api/consultations/:id should return a consultation', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: '/api/consultations',
      payload: {
        patient: { nom: "A", prenom: "B", date_naissance: "C" },
        contexte: { motif_demande: "X", suivi_ophtalmologique: null, correction_visuelle: null, signes_fonctionnels: null },
        bilan_sensoriel: {
          acuite_visuelle: { vision_lointaine: { od: "10/10", og: "10/10" }, vision_proche: { od: "10/10", og: "10/10" }, correction: null },
          capacites_fusionnelles: { convergence: null, divergence: null, convergence_proche: null, divergence_proche: null, valeur_brute: null },
          acuite_stereoscopique: null,
          conclusion: null
        },
        bilan_optomoteur: {
          parallellisme: { pres: null, loin: null },
          mesure_angle_prismes: { vision_proche: null, vision_lointaine: null, valeur_brute: null },
          motilite: null,
          motricite_conjuguee: { fixation: null, poursuite: null, saccades: null },
          ppc: null,
          conclusion: null
        },
        conclusion: { synthese_clinique: null, prise_en_charge: null, recommandations: null, suivi: null }
      }
    });
    const id = JSON.parse(createRes.payload).id;

    const response = await server.inject({
      method: 'GET',
      url: `/api/consultations/${id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).id).toBe(id);
  });

  it('GET /api/consultations/:id should return 404 for non-existent id', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/consultations/non-existent',
    });

    expect(response.statusCode).toBe(404);
  });

  it('POST /api/consultations/:id/transcript should update transcript', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: '/api/consultations',
      payload: {
        patient: { nom: "A", prenom: "B", date_naissance: "C" },
        contexte: { motif_demande: "X", suivi_ophtalmologique: null, correction_visuelle: null, signes_fonctionnels: null },
        bilan_sensoriel: {
          acuite_visuelle: { vision_lointaine: { od: "10/10", og: "10/10" }, vision_proche: { od: "10/10", og: "10/10" }, correction: null },
          capacites_fusionnelles: { convergence: null, divergence: null, convergence_proche: null, divergence_proche: null, valeur_brute: null },
          acuite_stereoscopique: null,
          conclusion: null
        },
        bilan_optomoteur: {
          parallellisme: { pres: null, loin: null },
          mesure_angle_prismes: { vision_proche: null, vision_lointaine: null, valeur_brute: null },
          motilite: null,
          motricite_conjuguee: { fixation: null, poursuite: null, saccades: null },
          ppc: null,
          conclusion: null
        },
        conclusion: { synthese_clinique: null, prise_en_charge: null, recommandations: null, suivi: null }
      }
    });
    const id = JSON.parse(createRes.payload).id;

    const response = await server.inject({
      method: 'POST',
      url: `/api/consultations/${id}/transcript`,
      payload: { transcript: "Hello world transcript" },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).transcript).toBe("Hello world transcript");
  });

  it('POST /api/consultations/:id/structure should structure data via AI mock', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: '/api/consultations',
      payload: {
        patient: { nom: "A", prenom: "B", date_naissance: "C" },
        contexte: { motif_demande: "X", suivi_ophtalmologique: null, correction_visuelle: null, signes_fonctionnels: null },
        bilan_sensoriel: {
          acuite_visuelle: { vision_lointaine: { od: "10/10", og: "10/10" }, vision_proche: { od: "10/10", og: "10/10" }, correction: null },
          capacites_fusionnelles: { convergence: null, divergence: null, convergence_proche: null, divergence_proche: null, valeur_brute: null },
          acuite_stereoscopique: null,
          conclusion: null
        },
        bilan_optomoteur: {
          parallellisme: { pres: null, loin: null },
          mesure_angle_prismes: { vision_proche: null, vision_lointaine: null, valeur_brute: null },
          motilite: null,
          motricite_conjuguee: { fixation: null, poursuite: null, saccades: null },
          ppc: null,
          conclusion: null
        },
        conclusion: { synthese_clinique: null, prise_en_charge: null, recommandations: null, suivi: null }
      }
    });
    const id = JSON.parse(createRes.payload).id;

    const response = await server.inject({
      method: 'POST',
      url: `/api/consultations/${id}/structure`,
      payload: { transcript: "Some medical transcript" },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.patient.nom).toBe("Doe"); // From MockAIService
  });

  it('POST /api/consultations should reject invalid data', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/consultations',
      payload: {
        patient: { nom: "A" }, // Missing other required fields
      },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.payload).error).toBe('Invalid data');
  });
});
