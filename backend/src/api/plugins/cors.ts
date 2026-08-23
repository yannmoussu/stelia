import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';

export async function configureCors(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });
}
