import { FastifyInstance } from 'fastify';
import { IConsultationRepository } from '../../repositories/consultation.repository';
import { IAIService } from '../../services/ai.service';
import { ConsultationSchema } from '../../validation/consultation.validation';
import { z } from 'zod';

export async function consultationRoutes(fastify: FastifyInstance) {
  // We can use a pattern where we attach the repo and service to the fastify instance,
  // or just instantiate them here (though that's less flexible).
  // For this V0, we'll use the fastify.decorate pattern or just instantiate here.

  // For simplicity and avoid complex plugin dependency management,
  // let's assume we'll pass them via decorators in server.ts.
  const repo = fastify.consultationRepo;
  const aiService = fastify.aiService;

  // Create a consultation
  fastify.post('/api/consultations', async (request, reply) => {
    try {
      const data = ConsultationSchema.parse(request.body);
      const consultation = await repo.create({
        ...data,
      } as any);
      return consultation;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid data', details: error.errors });
      }
      throw error;
    }
  });

  // List all consultations
  fastify.get('/api/consultations', async () => {
    return await repo.findAll();
  });

  // Get one consultation
  fastify.get('/api/consultations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const consultation = await repo.findById(id);
    if (!consultation) {
      return reply.status(404).send({ error: 'Consultation not found' });
    }
    return consultation;
  });

  // Update transcript
  fastify.post('/api/consultations/:id/transcript', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { transcript } = request.body as { transcript: string };

    if (transcript === undefined) {
      return reply.status(400).send({ error: 'Transcript is required' });
    }

    const updated = await repo.update(id, { transcript });
    if (!updated) {
      return reply.status(404).send({ error: 'Consultation not found' });
    }
    return updated;
  });

  // AI structure transformation
  fastify.post('/api/consultations/:id/structure', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { transcript } = request.body as { transcript: string };

    if (!transcript) {
      return reply.status(400).send({ error: 'Transcript is required for structuring' });
    }

    const consultation = await repo.findById(id);
    if (!consultation) {
      return reply.status(404).send({ error: 'Consultation not found' });
    }

    const structuredData = await aiService.structureTranscript(transcript);
    const updated = await repo.update(id, structuredData);

    return updated;
  });
}
