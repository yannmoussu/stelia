import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CreateConsultationSchema, UpdateConsultationSchema, SaveTranscriptSchema,
  StructureTranscriptSchema, ReviewReportSchema, RevisionSchema,
} from '@stelia/contracts';
import type { AuthService } from '../../auth/auth.service.js';
import type { ConsultationService } from '../../services/consultation.service.js';

const ParamsSchema = z.strictObject({ id: z.uuid() });
type IdRoute = { Params: { id: string } };

export async function consultationRoutes(
  app: FastifyInstance,
  service: ConsultationService,
  auth: AuthService,
) {
  const ownerId = (request: Parameters<AuthService['authenticate']>[0]) => auth.authenticate(request).id;
  app.addHook('preHandler', async (request) => { auth.authenticate(request); });
  app.get('/api/consultations', (request) => service.list(ownerId(request)));
  app.post('/api/consultations', async (request, reply) => {
    const consultation = await service.create(ownerId(request), CreateConsultationSchema.parse(request.body));
    return reply.code(201).send(consultation);
  });
  app.get<IdRoute>('/api/consultations/:id', (request) => {
    const { id } = ParamsSchema.parse(request.params);
    return service.get(ownerId(request), id);
  });
  app.patch<IdRoute>('/api/consultations/:id', (request) => {
    const { id } = ParamsSchema.parse(request.params);
    return service.update(ownerId(request), id, UpdateConsultationSchema.parse(request.body));
  });
  app.post<IdRoute>('/api/consultations/:id/transcript', (request) => {
    const { id } = ParamsSchema.parse(request.params);
    return service.saveTranscript(ownerId(request), id, SaveTranscriptSchema.parse(request.body));
  });
  app.post<IdRoute>('/api/consultations/:id/structure', (request) => {
    const { id } = ParamsSchema.parse(request.params);
    const { expectedRevision } = StructureTranscriptSchema.parse(request.body);
    return service.structure(ownerId(request), id, expectedRevision);
  });
  app.post<IdRoute>('/api/consultations/:id/review', (request) => {
    const { id } = ParamsSchema.parse(request.params);
    return service.review(ownerId(request), id, ReviewReportSchema.parse(request.body));
  });
  app.delete<IdRoute>('/api/consultations/:id', async (request, reply) => {
    const { id } = ParamsSchema.parse(request.params);
    const { expectedRevision } = RevisionSchema.parse(request.body);
    await service.delete(ownerId(request), id, expectedRevision);
    return reply.code(204).send();
  });
}
