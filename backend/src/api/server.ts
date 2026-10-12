import { createApp } from './app.js';
import { readConfig } from '../config/env.js';
import { DisabledAIService, HttpAIService } from '../services/ai.service.js';

async function bootstrap() {
  const config = readConfig();
  const anyAIConfig = config.aiEndpoint || config.aiToken || config.aiModel;
  if (anyAIConfig && !(config.aiEndpoint && config.aiToken && config.aiModel)) {
    throw new Error('AI_ENDPOINT, AI_API_KEY et AI_MODEL doivent être configurés ensemble.');
  }
  const aiService = config.aiEndpoint && config.aiToken && config.aiModel
    ? new HttpAIService(config.aiEndpoint, config.aiToken, config.aiModel, config.aiTimeoutMs)
    : new DisabledAIService();
  const app = await createApp({
    users: config.users, databasePath: config.databasePath,
    allowedOrigins: config.origins, secureCookies: config.secureCookies,
    aiService, logger: true,
  });
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    await app.close();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (error) {
    await app.close();
    throw error;
  }
}

bootstrap().catch(() => {
  // Keep startup failures useful without exposing credentials or arbitrary env values.
  process.stderr.write('Démarrage impossible : vérifiez les comptes, la configuration IA et le chemin SQLite.\n');
  process.exitCode = 1;
});
