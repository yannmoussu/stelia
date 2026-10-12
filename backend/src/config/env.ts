import { z } from 'zod';
import { createHash } from 'node:crypto';
import { isPasswordHash } from '../auth/password.js';

const UserSchema = z.strictObject({
  id: z.uuid(),
  username: z.string().trim().min(1).max(120),
  passwordHash: z.string().refine(isPasswordHash, 'Hash scrypt invalide'),
});

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const username = env.STELIA_USERNAME?.trim();
  const digest = createHash('sha256').update(`stelia-user:${username ?? ''}`).digest('hex');
  const stableUserId = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
  const users = z.array(UserSchema).min(1).parse(env.STELIA_USERS_JSON
    ? JSON.parse(env.STELIA_USERS_JSON)
    : username && env.STELIA_PASSWORD_HASH
      ? [{ id: stableUserId, username, passwordHash: env.STELIA_PASSWORD_HASH }]
      : []);
  if (new Set(users.map((user) => user.id)).size !== users.length || new Set(users.map((user) => user.username)).size !== users.length) {
    throw new Error('Les identifiants et noms de comptes doivent être uniques.');
  }
  const port = z.coerce.number().int().min(1).max(65535).parse(env.PORT ?? 3000);
  const origins = (env.CORS_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((origin) => new URL(origin.trim()).origin);
  const secureCookies = env.NODE_ENV === 'production' || env.STELIA_SECURE_COOKIES === 'true';
  return {
    users, port, origins, secureCookies,
    host: env.HOST ?? '127.0.0.1',
    databasePath: env.SQLITE_PATH ?? './data/stelia.sqlite',
    aiEndpoint: env.AI_ENDPOINT,
    aiToken: env.AI_API_KEY,
    aiModel: env.AI_MODEL,
    aiTimeoutMs: z.coerce.number().int().min(100).max(120_000).parse(env.AI_TIMEOUT_MS ?? 30_000),
  };
}
