import Fastify, { type FastifyInstance } from 'fastify';
import { LoginSchema } from '@stelia/contracts';
import { z } from 'zod';
import { AuthService, type UserAccount } from '../auth/auth.service.js';
import { ConsultationService } from '../services/consultation.service.js';
import { DisabledAIService, type AIService } from '../services/ai.service.js';
import type { ConsultationRepository } from '../repositories/consultation.repository.js';
import { SqliteStorage, SqliteConsultationRepository } from '../repositories/sqlite.js';
import { AppError } from './errors.js';
import { configureCors } from './plugins/cors.js';
import { consultationRoutes } from './routes/consultations.js';
import { healthRoutes } from './routes/health.js';

export interface AppOptions {
  repository?: ConsultationRepository;
  auth?: AuthService;
  users?: readonly UserAccount[];
  databasePath?: string;
  aiService?: AIService;
  allowedOrigins?: readonly string[];
  secureCookies?: boolean;
  logger?: boolean;
  clock?: () => Date;
}

/** The server, API tests and future clients all use this application composition. */
export async function createApp(options: AppOptions): Promise<FastifyInstance> {
  if (!options.auth && !options.users?.length) throw new Error('Un compte préprovisionné est requis.');
  const storage = !options.repository || !options.auth ? new SqliteStorage(options.databasePath ?? './data/stelia.sqlite') : undefined;
  const repository = options.repository ?? new SqliteConsultationRepository(storage!);
  const auth = options.auth ?? new AuthService(options.users!, storage!.sessions, options.secureCookies);
  const service = new ConsultationService(repository, options.aiService ?? new DisabledAIService(), options.clock);
  const app = Fastify({
    logger: options.logger ? { redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'] } : false,
    bodyLimit: 1_000_000,
    requestTimeout: 120_000,
  });
  if (storage) app.addHook('onClose', async () => { storage.close(); });
  const origins = options.allowedOrigins ?? ['http://localhost:5173', 'http://127.0.0.1:5173'];
  app.addHook('onRequest', async (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
      const origin = request.headers.origin;
      if (origin && !origins.includes(origin)) throw new AppError(403, 'ORIGIN_FORBIDDEN', 'Origine de la requête refusée.');
    }
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ error: {
        code: 'VALIDATION_ERROR', message: 'Données invalides.',
        details: error.issues.map(({ path, message }) => ({ path, message })),
      } });
    }
    if (error instanceof AppError) return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
    // Do not log request bodies, provider responses or error messages containing patient data.
    const status = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 500;
    if (status >= 400 && status < 500) return reply.code(status).send({ error: { code: 'BAD_REQUEST', message: 'Requête invalide.' } });
    app.log.error({ code: 'INTERNAL_ERROR' }, 'Unhandled application error');
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.' } });
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Route introuvable.' } }));
  try {
    await configureCors(app, origins);
    await app.register(healthRoutes);
    app.post('/api/auth/login', async (request, reply) => {
      const { username, password } = LoginSchema.parse(request.body);
      const session = await auth.login(username, password, request.ip);
      reply.header('Set-Cookie', auth.cookie(session.token));
      return { user: session.user };
    });
    app.get('/api/auth/session', (request) => ({ user: auth.authenticate(request) }));
    app.post('/api/auth/logout', (request, reply) => {
      auth.logout(request);
      return reply.header('Set-Cookie', auth.clearCookie()).code(204).send();
    });
    await app.register(async (scope) => { await consultationRoutes(scope, service, auth); });
    await app.ready();
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
}
