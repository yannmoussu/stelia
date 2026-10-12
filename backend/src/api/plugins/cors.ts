import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';

export async function configureCors(fastify: FastifyInstance, origins: readonly string[]) {
  await fastify.register(cors, {
    origin: [...origins],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}
