import Fastify from 'fastify';
import { configureCors } from './plugins/cors';
import { healthRoutes } from './routes/health';
import { consultationRoutes } from './routes/consultations';
import { InMemoryConsultationRepository } from '../repositories/in-memory.consultation.repository';
import { MockAIService } from '../services/mock-ai.service';

// Extend Fastify instance types for our decorators
declare module 'fastify' {
  interface FastifyInstance {
    consultationRepo: any;
    aiService: any;
  }
}

const server = Fastify({
  logger: true,
});

async function bootstrap() {
  // Plugins
  await configureCors(server);

  // Infrastructure
  const repo = new InMemoryConsultationRepository();
  const aiService = new MockAIService();

  // Decorate server with dependencies
  server.decorate('consultationRepo', repo);
  server.decorate('aiService', aiService);

  // Routes
  await server.register(healthRoutes);
  await server.register(consultationRoutes);

  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Backend server running at http://localhost:3000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

bootstrap();
