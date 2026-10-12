import { describe, expect, it } from 'vitest';
import { readConfig } from '../src/config/env.js';
import { createPasswordHash } from '../src/auth/auth.service.js';

describe('Explicit secure provisioning', () => {
  it('has no default credentials and rejects invalid hashes or duplicate accounts', async () => {
    expect(() => readConfig({})).toThrow();
    expect(() => readConfig({ STELIA_USERNAME: 'alice', STELIA_PASSWORD_HASH: 'plaintext' })).toThrow();
    const hash = await createPasswordHash('long-test-password');
    const users = [{ id: '11111111-1111-4111-8111-111111111111', username: 'alice', passwordHash: hash }, { id: '11111111-1111-4111-8111-111111111111', username: 'bob', passwordHash: hash }];
    expect(() => readConfig({ STELIA_USERS_JSON: JSON.stringify(users) })).toThrow();
  });
  it('uses stable owner identity and explicit safe defaults across restart', async () => {
    const env = { STELIA_USERNAME: 'alice', STELIA_PASSWORD_HASH: await createPasswordHash('long-test-password') };
    const first = readConfig(env);
    const second = readConfig(env);
    expect(first.users[0]!.id).toBe(second.users[0]!.id);
    expect(first.host).toBe('127.0.0.1');
    expect(first.databasePath).toBe('./data/stelia.sqlite');
    expect(first.aiEndpoint).toBeUndefined();
    expect(readConfig({ ...env, NODE_ENV: 'production' }).secureCookies).toBe(true);
  });
});
