import { FastifyInstance } from 'fastify';
import { IConsultationRepository } from '../../repositories/consultation.repository';
import { IAIService } from '../../services/ai.service';
import { ConsultationSchema } from '../../validation/consultation.validation';
import { z } from 'zod';
import { DEFAULT_CONSULTATION_STRUCTURE } from '../../domain/models/defaults';

export async function consultationRoutes(fastify: FastifyInstance) {
  const repo = fastify.consultationRepo;
  const aiService = fastify.aiService;

  // Create a consultation
  fastify.post('/api/consultations', async (request, reply) => {
    try {
      // Use partial validation for creation to accept incomplete data
      const partialData = ConsultationSchema.partial().parse(request.body);

      // Merge with default structure to ensure the final object is complete
      const fullData = {
        ...DEFAULT_CONSULTATION_STRUCTURE,
        ...partialData,
      };

      // Ensure nested objects are also merged if they were provided partially
      if (partialData.patient) {
        fullData.patient = { ...DEFAULT_CONSULTATION_STRUCTURE.patient, ...partialData.patient };
      }
      if (partialData.contexte) {
        fullData.contexte = { ...DEFAULT_CONSULTATION_STRUCTURE.contexte, ...partialData.contexte };
      }

      const consultation = await repo.create(fullData as any);
      return consultation;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Zod validation error during creation:', JSON.stringify(error.issues, null, 2));
        return reply.status(400).send({ error: 'Invalid data', details: error.issues });
      }
      console.error('Unexpected error during creation:', error);
      throw error;
    }
  });

  // List all consultations
  fastify.get('/api/consultations', async (request, reply) => {
    try {
      return await repo.findAll();
    } catch (error) {
      console.error('Error listing consultations:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Get one consultation
  fastify.get('/api/consultations/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const consultation = await repo.findById(id);
      if (!consultation) {
        return reply.status(404).send({ error: 'Consultation not found' });
      }
      return consultation;
    } catch (error) {
      console.error(`Error fetching consultation ${request.params.id}:`, error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Update consultation
  fastify.put('/api/consultations/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      const updated = await repo.update(id, data);
      if (!updated) {
        return reply.status(404).send({ error: 'Consultation not found' });
      }
      return updated;
    } catch (error) {
      console.error(`Error updating consultation ${request.params.id}:`, error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Delete consultation
  fastify.delete('/api/consultations/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const deleted = await repo.delete(id);
      if (!deleted) {
        return reply.status(404).send({ error: 'Consultation not found' });
      }
      return reply.status(204).send();
    } catch (error) {
      console.error(`Error deleting consultation ${request.params.id}:`, error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Update transcript
  fastify.post('/api/consultations/:id/transcript', async (request, reply) => {
    try {
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
    } catch (error) {
      console.error(`Error updating transcript for consultation ${request.params.id}:`, error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // AI structure transformation
  fastify.post('/api/consultations/:id/structure', async (request, reply) => {
    try {
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
    } catch (error) {
      console.error(`Error structuring consultation ${request.params.id}:`, error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
