import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEmptyMedicalReport, ConsultationSchema, SessionSchema } from '@stelia/contracts';
import { createApp, type AppOptions } from '../src/api/app.js';
import { createPasswordHash, type UserAccount } from '../src/auth/auth.service.js';
import type { AIService } from '../src/services/ai.service.js';

let users: UserAccount[];
const apps: FastifyInstance[] = [];
const directories: string[] = [];
const password = 'test-password-long-enough';
const createInput = {
  patient: { nom: 'Alice', prenom: 'Martin', date_naissance: '1990-01-02' },
  consultationDate: '2026-10-12',
  consultationType: 'assessment',
  notes: 'Notes du formulaire',
};
const validAI: AIService = {
  provider: 'test', model: 'test-model',
  async structureTranscript() { return createEmptyMedicalReport(); },
};

beforeAll(async () => {
  users = [
    { id: '11111111-1111-4111-8111-111111111111', username: 'alice', passwordHash: await createPasswordHash(password) },
    { id: '22222222-2222-4222-8222-222222222222', username: 'bob', passwordHash: await createPasswordHash(password) },
  ];
});
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

async function app(options: Partial<AppOptions> = {}) {
  const instance = await createApp({ users, databasePath: ':memory:', ...options });
  apps.push(instance);
  return instance;
}
async function login(server: FastifyInstance, username = 'alice') {
  const response = await server.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password } });
  expect(response.statusCode).toBe(200);
  SessionSchema.parse(response.json());
  const cookie = String(response.headers['set-cookie']).split(';')[0]!;
  return { cookie };
}
async function create(server: FastifyInstance, headers: { cookie: string }, transcript = '') {
  const response = await server.inject({ method: 'POST', url: '/api/consultations', headers, payload: { ...createInput, transcript } });
  expect(response.statusCode).toBe(201);
  return ConsultationSchema.parse(response.json());
}

describe('Authentication and actual application factory', () => {
  it('keeps health public and requires authentication for consultations', async () => {
    const server = await app();
    expect((await server.inject('/health')).json()).toEqual({ status: 'ok' });
    const response = await server.inject('/api/consultations');
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHENTICATED');
  });

  it('issues HttpOnly strict cookies, accepts a bearer token and revokes logout sessions', async () => {
    const server = await app({ secureCookies: true });
    const response = await server.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password } });
    expect(response.headers['set-cookie']).toContain('HttpOnly');
    expect(response.headers['set-cookie']).toContain('SameSite=Strict');
    expect(response.headers['set-cookie']).toContain('Secure');
    const cookie = String(response.headers['set-cookie']).split(';')[0]!;
    const bearer = cookie.slice(cookie.indexOf('=') + 1);
    expect((await server.inject({ url: '/api/auth/session', headers: { authorization: `Bearer ${bearer}` } })).json()).toEqual({
      user: { id: '11111111-1111-4111-8111-111111111111', username: 'alice' },
    });
    expect((await server.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie } })).statusCode).toBe(204);
    expect((await server.inject({ url: '/api/auth/session', headers: { cookie } })).statusCode).toBe(401);
  });

  it('rejects invalid credentials generically and limits repeated login attempts', async () => {
    const server = await app();
    for (let index = 0; index < 5; index++) {
      const response = await server.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'unknown', password } });
      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe('INVALID_CREDENTIALS');
    }
    expect((await server.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password } })).statusCode).toBe(429);
  });

  it('does not erase Alice login failures after a successful Bob login on the same IP', async () => {
    const server = await app();
    for (let index = 0; index < 4; index++) {
      expect((await server.inject({ method: 'POST', url: '/api/auth/login', payload: {
        username: 'alice', password: 'incorrect-password',
      } })).statusCode).toBe(401);
      expect((await server.inject({ method: 'POST', url: '/api/auth/login', payload: {
        username: 'bob', password,
      } })).statusCode).toBe(200);
    }
    expect((await server.inject({ method: 'POST', url: '/api/auth/login', payload: {
      username: 'alice', password: 'incorrect-password',
    } })).statusCode).toBe(401);
    expect((await server.inject({ method: 'POST', url: '/api/auth/login', payload: {
      username: 'bob', password,
    } })).statusCode).toBe(429);
  });

  it('rejects unsafe browser origins for mutations', async () => {
    const server = await app();
    const headers = await login(server);
    const response = await server.inject({
      method: 'POST', url: '/api/consultations',
      headers: { ...headers, origin: 'https://untrusted.example' }, payload: createInput,
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('ORIGIN_FORBIDDEN');
  });
});

describe('Consultation contracts, identity and owner isolation', () => {
  it('persists the actual form fields and lists summaries without clinical content', async () => {
    const server = await app();
    const headers = await login(server);
    const created = await create(server, headers);
    const found = await server.inject({ url: `/api/consultations/${created.id}`, headers });
    expect(found.json()).toMatchObject(createInput);
    expect(found.json().revision).toBe(1);
    const listed = (await server.inject({ url: '/api/consultations', headers })).json();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ id: created.id, patient: createInput.patient });
    expect(listed[0]).not.toHaveProperty('transcript');
    expect(listed[0]).not.toHaveProperty('notes');
  });

  it('rejects invalid dates, empty names and unknown creation fields without a silent write', async () => {
    const server = await app();
    const headers = await login(server);
    for (const payload of [
      { ...createInput, patient: { ...createInput.patient, date_naissance: 'not-a-date' } },
      { ...createInput, patient: { ...createInput.patient, nom: '   ' } },
      { ...createInput, consultationDate: '2026-02-30' },
      { ...createInput, patientName: 'lost previously' },
      { ...createInput, status: 'completed' },
    ]) {
      const response = await server.inject({ method: 'POST', url: '/api/consultations', headers, payload });
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('VALIDATION_ERROR');
    }
    expect((await server.inject({ url: '/api/consultations', headers })).json()).toEqual([]);
  });

  it('rejects arbitrary identity/status mutations and incomplete patient replacement', async () => {
    const server = await app();
    const headers = await login(server);
    const document = await create(server, headers);
    for (const payload of [
      { expectedRevision: 1, id: 'arbitrary' },
      { expectedRevision: 1, createdAt: 'now' },
      { expectedRevision: 1, status: 'garbage' },
      { expectedRevision: 1, patient: null },
      { expectedRevision: 1, patient: { nom: 'New' } },
      { expectedRevision: 1 },
    ]) {
      expect((await server.inject({ method: 'PATCH', url: `/api/consultations/${document.id}`, headers, payload })).statusCode).toBe(400);
    }
    expect((await server.inject({ url: `/api/consultations/${document.id}`, headers })).json()).toMatchObject(document);
  });

  it('scopes read, update, generation and deletion by owner without disclosing other dossiers', async () => {
    const server = await app({ aiService: validAI });
    const alice = await login(server);
    const bob = await login(server, 'bob');
    const document = await create(server, alice, 'Transcription');
    expect((await server.inject({ url: '/api/consultations', headers: bob })).json()).toEqual([]);
    for (const request of [
      { method: 'GET' as const, url: `/api/consultations/${document.id}` },
      { method: 'PATCH' as const, url: `/api/consultations/${document.id}`, payload: { expectedRevision: 1, notes: 'intrusion' } },
      { method: 'POST' as const, url: `/api/consultations/${document.id}/structure`, payload: { expectedRevision: 1 } },
      { method: 'DELETE' as const, url: `/api/consultations/${document.id}`, payload: { expectedRevision: 1 } },
    ]) expect((await server.inject({ ...request, headers: bob })).statusCode).toBe(404);
    expect((await server.inject({ url: `/api/consultations/${document.id}`, headers: alice })).json().revision).toBe(1);
  });

  it('uses compare-and-swap so competing writes cannot silently replace each other', async () => {
    const server = await app();
    const headers = await login(server);
    const document = await create(server, headers);
    const responses = await Promise.all(['first', 'second'].map((notes) =>
      server.inject({ method: 'PATCH', url: `/api/consultations/${document.id}`, headers, payload: { expectedRevision: 1, notes } })));
    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 409]);
    const saved = (await server.inject({ url: `/api/consultations/${document.id}`, headers })).json();
    expect(saved.revision).toBe(2);
    expect(saved.patient).toEqual(createInput.patient);
  });

  it('checks birth dates against the merged metadata rather than a partial patch', async () => {
    const server = await app();
    const headers = await login(server);
    const document = await create(server, headers);
    const response = await server.inject({ method: 'PATCH', url: `/api/consultations/${document.id}`, headers,
      payload: { expectedRevision: 1, consultationDate: '1980-01-01' } });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('INVALID_PATIENT_DATE');
    expect((await server.inject({ url: `/api/consultations/${document.id}`, headers })).json().revision).toBe(1);
  });

  it('requires an up-to-date revision for transcript save and deletion', async () => {
    const server = await app();
    const headers = await login(server);
    const document = await create(server, headers);
    expect((await server.inject({ method: 'POST', url: `/api/consultations/${document.id}/transcript`, headers,
      payload: { expectedRevision: 1, transcript: 'Saved words' } })).statusCode).toBe(200);
    expect((await server.inject({ method: 'POST', url: `/api/consultations/${document.id}/transcript`, headers,
      payload: { expectedRevision: 1, transcript: 'Stale words' } })).statusCode).toBe(409);
    expect((await server.inject({ method: 'DELETE', url: `/api/consultations/${document.id}`, headers,
      payload: { expectedRevision: 1 } })).statusCode).toBe(409);
    expect((await server.inject({ method: 'DELETE', url: `/api/consultations/${document.id}`, headers,
      payload: { expectedRevision: 2 } })).statusCode).toBe(204);
    expect((await server.inject({ url: `/api/consultations/${document.id}`, headers })).statusCode).toBe(404);
  });
});

describe('Durable SQLite storage and session credential versions', () => {
  it('retains consultations, ownership and login across restart, revoking sessions on password rotation', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'stelia-backend-'));
    directories.push(directory);
    const databasePath = join(directory, 'data.sqlite');
    const first = await app({ databasePath });
    const headers = await login(first);
    const document = await create(first, headers, 'Persistent transcript');
    await first.close();
    const second = await app({ databasePath });
    expect((await second.inject({ url: `/api/consultations/${document.id}`, headers })).json()).toMatchObject(document);
    const bob = await login(second, 'bob');
    expect((await second.inject({ url: '/api/consultations', headers: bob })).json()).toEqual([]);
    await second.close();
    const rotatedUsers = [{ ...users[0]!, passwordHash: await createPasswordHash('rotated-password-long-enough') }, users[1]!];
    const third = await app({ databasePath, users: rotatedUsers });
    expect((await third.inject({ url: '/api/auth/session', headers })).statusCode).toBe(401);
    const newLogin = await third.inject({ method: 'POST', url: '/api/auth/login', payload: {
      username: 'alice', password: 'rotated-password-long-enough',
    } });
    expect(newLogin.statusCode).toBe(200);
    const newHeaders = { cookie: String(newLogin.headers['set-cookie']).split(';')[0]! };
    expect((await third.inject({ url: `/api/consultations/${document.id}`, headers: newHeaders })).json().transcript).toBe('Persistent transcript');
  });
});

describe('AI proposal validation and human review', () => {
  it('locks clinical context after a proposal or human validation, allowing notes and equal context values', async () => {
    const server = await app({ aiService: validAI });
    const headers = await login(server);
    const document = await create(server, headers, 'Clinical source');
    const generated = await server.inject({ method: 'POST', url: `/api/consultations/${document.id}/structure`, headers,
      payload: { expectedRevision: 1 } });
    expect(generated.statusCode).toBe(200);
    const changes = [
      { patient: { ...createInput.patient, nom: 'Another patient' } },
      { consultationDate: '2026-10-13' },
      { consultationType: 'follow_up' },
    ];
    for (const change of changes) {
      const response = await server.inject({ method: 'PATCH', url: `/api/consultations/${document.id}`, headers,
        payload: { expectedRevision: 2, ...change } });
      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe('CONTEXT_LOCKED');
      expect((await server.inject({ url: `/api/consultations/${document.id}`, headers })).json()).toEqual(generated.json());
    }
    const notes = await server.inject({ method: 'PATCH', url: `/api/consultations/${document.id}`, headers,
      payload: { expectedRevision: 2, notes: 'Administrative note' } });
    expect(notes.statusCode).toBe(200);
    const sameContext = await server.inject({ method: 'PATCH', url: `/api/consultations/${document.id}`, headers,
      payload: { expectedRevision: 3, patient: createInput.patient, consultationDate: createInput.consultationDate,
        consultationType: createInput.consultationType } });
    expect(sameContext.statusCode).toBe(200);
    const data = createEmptyMedicalReport();
    data.conclusion.synthese_clinique = 'Human approved assessment';
    const reviewed = await server.inject({ method: 'POST', url: `/api/consultations/${document.id}/review`, headers,
      payload: { expectedRevision: 4, data } });
    expect(reviewed.statusCode).toBe(200);
    expect(reviewed.json().status).toBe('completed');
    for (const change of changes) {
      const response = await server.inject({ method: 'PATCH', url: `/api/consultations/${document.id}`, headers,
        payload: { expectedRevision: 5, ...change } });
      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe('CONTEXT_LOCKED');
      expect((await server.inject({ url: `/api/consultations/${document.id}`, headers })).json()).toEqual(reviewed.json());
    }
  });

  it('allows explicit manual validation and rejects an empty clinical synthesis', async () => {
    const server = await app();
    const headers = await login(server);
    const document = await create(server, headers, 'Manual source');
    const data = createEmptyMedicalReport();
    const empty = await server.inject({ method: 'POST', url: `/api/consultations/${document.id}/review`, headers,
      payload: { expectedRevision: 1, source: 'manual', data } });
    expect(empty.statusCode).toBe(400);
    expect(empty.json().error.code).toBe('INCOMPLETE_REPORT');
    data.conclusion.synthese_clinique = 'Compte rendu rédigé et validé par le professionnel';
    const response = await server.inject({ method: 'POST', url: `/api/consultations/${document.id}/review`, headers,
      payload: { expectedRevision: 1, source: 'manual', data } });
    expect(response.statusCode).toBe(200);
    const validated = ConsultationSchema.parse(response.json());
    expect(validated.patient).toEqual(createInput.patient);
    expect(validated.id).toBe(document.id);
    expect(validated.status).toBe('completed');
    expect(validated.reportProposal).toBeNull();
    expect(validated.validatedReport).toMatchObject({ provider: 'manual', model: 'human', sourceTranscript: 'Manual source', sourceRevision: 1 });
  });

  it('is explicitly disabled without configuration and never inserts fake clinical values', async () => {
    const server = await app();
    const headers = await login(server);
    const document = await create(server, headers, 'Text');
    const response = await server.inject({ method: 'POST', url: `/api/consultations/${document.id}/structure`, headers, payload: { expectedRevision: 1 } });
    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe('AI_NOT_CONFIGURED');
    expect((await server.inject({ url: `/api/consultations/${document.id}`, headers })).json()).toEqual(document);
  });

  it('rejects malformed medical output and provider errors without updating the dossier', async () => {
    for (const generate of [
      async () => ({ ...createEmptyMedicalReport(), patient: null, id: 'changed' }),
      async () => ({}),
      async () => { throw new Error('provider response with sensitive content'); },
    ]) {
      const server = await app({ aiService: { provider: 'test', model: 'test', structureTranscript: generate } });
      const headers = await login(server);
      const document = await create(server, headers, 'Medical dictation');
      const response = await server.inject({ method: 'POST', url: `/api/consultations/${document.id}/structure`, headers,
        payload: { expectedRevision: 1 } });
      expect(response.statusCode).toBe(502);
      expect(response.payload).not.toContain('sensitive content');
      expect((await server.inject({ url: `/api/consultations/${document.id}`, headers })).json()).toEqual(document);
    }
  });

  it('uses only the saved transcript and refuses client-supplied unsaved text', async () => {
    const server = await app({ aiService: validAI });
    const headers = await login(server);
    const document = await create(server, headers, 'Saved');
    expect((await server.inject({ method: 'POST', url: `/api/consultations/${document.id}/structure`, headers,
      payload: { expectedRevision: 1, transcript: 'Not saved' } })).statusCode).toBe(400);
    expect((await server.inject({ method: 'POST', url: `/api/consultations/${document.id}/review`, headers,
      payload: { expectedRevision: 1, data: { ...createEmptyMedicalReport(), conclusion: { ...createEmptyMedicalReport().conclusion, synthese_clinique: 'Review' } } } })).statusCode).toBe(409);
  });

  it('requires human validation and retains an older approved report explicitly after transcript edits', async () => {
    const server = await app({ aiService: validAI });
    const headers = await login(server);
    const document = await create(server, headers, 'Saved source');
    const generated = await server.inject({ method: 'POST', url: `/api/consultations/${document.id}/structure`, headers,
      payload: { expectedRevision: 1 } });
    expect(generated.statusCode).toBe(200);
    const proposal = ConsultationSchema.parse(generated.json());
    expect(proposal.patient).toEqual(createInput.patient);
    expect(proposal.validatedReport).toBeNull();
    expect(proposal.reportProposal).toMatchObject({ sourceTranscript: 'Saved source', sourceRevision: 1 });
    const corrected = createEmptyMedicalReport();
    corrected.conclusion.synthese_clinique = 'Correction humaine';
    const reviewed = await server.inject({ method: 'POST', url: `/api/consultations/${document.id}/review`, headers,
      payload: { expectedRevision: 2, data: corrected } });
    expect(reviewed.statusCode).toBe(200);
    expect(reviewed.json().status).toBe('completed');
    expect(reviewed.json().validatedReport.data.conclusion.synthese_clinique).toBe('Correction humaine');
    const saved = await server.inject({ method: 'POST', url: `/api/consultations/${document.id}/transcript`, headers,
      payload: { expectedRevision: 3, transcript: 'New source' } });
    expect(saved.json().status).toBe('in_progress');
    expect(saved.json().reportProposal).toBeNull();
    expect(saved.json().validatedReport.sourceTranscript).toBe('Saved source');
    expect((await server.inject({ method: 'POST', url: `/api/consultations/${document.id}/review`, headers,
      payload: { expectedRevision: 4, data: corrected } })).statusCode).toBe(409);
  });

  it('discards delayed AI responses after any competing revision', async () => {
    let resolveGeneration!: (value: unknown) => void;
    let notifyStarted!: () => void;
    const started = new Promise<void>((resolve) => { notifyStarted = resolve; });
    const output = new Promise<unknown>((resolve) => { resolveGeneration = resolve; });
    const aiService: AIService = { provider: 'test', model: 'test', structureTranscript: () => { notifyStarted(); return output; } };
    const server = await app({ aiService });
    const headers = await login(server);
    const document = await create(server, headers, 'Source A');
    const generation = server.inject({ method: 'POST', url: `/api/consultations/${document.id}/structure`, headers,
      payload: { expectedRevision: 1 } });
    await started;
    const save = await server.inject({ method: 'POST', url: `/api/consultations/${document.id}/transcript`, headers,
      payload: { expectedRevision: 1, transcript: 'Source B' } });
    expect(save.statusCode).toBe(200);
    resolveGeneration(createEmptyMedicalReport());
    expect((await generation).statusCode).toBe(409);
    const latest = (await server.inject({ url: `/api/consultations/${document.id}`, headers })).json();
    expect(latest.transcript).toBe('Source B');
    expect(latest.reportProposal).toBeNull();
    expect(latest.revision).toBe(2);
  });
});
