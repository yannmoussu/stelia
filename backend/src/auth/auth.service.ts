import { createHash, randomBytes } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { AppError } from '../api/errors.js';
import { verifyPassword } from './password.js';

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
}

export interface SessionStore {
  create(tokenHash: string, userId: string, expiresAt: number, credentialVersion: string): void;
  find(tokenHash: string): { userId: string; expiresAt: number; credentialVersion: string } | null;
  delete(tokenHash: string): void;
}

export interface AuthenticatedUser { id: string; username: string }

const SESSION_COOKIE = 'stelia_session';
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export class AuthService {
  private readonly attempts = new Map<string, { count: number; until: number }>();
  private readonly dummyHash = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;

  constructor(
    private readonly users: readonly UserAccount[],
    private readonly sessions: SessionStore,
    private readonly secureCookies = false,
    private readonly clock: () => number = Date.now,
  ) {}

  async login(username: string, password: string, remoteAddress: string) {
    const now = this.clock();
    for (const [key, value] of this.attempts) if (value.until <= now) this.attempts.delete(key);
    const prior = this.attempts.get(remoteAddress);
    if ((prior?.count ?? 0) >= 5) throw new AppError(429, 'TOO_MANY_ATTEMPTS', 'Trop de tentatives. Réessayez dans 15 minutes.');
    if (!prior && this.attempts.size >= 10_000) throw new AppError(429, 'TOO_MANY_ATTEMPTS', 'Réessayez plus tard.');
    this.attempts.set(remoteAddress, { count: (prior?.count ?? 0) + 1, until: prior?.until ?? now + 15 * 60_000 });
    const user = this.users.find((candidate) => candidate.username === username);
    const valid = await verifyPassword(password, user?.passwordHash ?? this.dummyHash);
    if (!user || !valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Identifiants incorrects.');
    // A successful login must not erase failures against another account on this IP.
    // Release only this successful attempt's reservation; failed attempts stay until expiry.
    const attempts = this.attempts.get(remoteAddress);
    if (attempts) {
      if (attempts.count <= 1) this.attempts.delete(remoteAddress);
      else this.attempts.set(remoteAddress, { ...attempts, count: attempts.count - 1 });
    }
    const token = randomBytes(32).toString('base64url');
    this.sessions.create(tokenHash(token), user.id, now + 12 * 60 * 60_000, tokenHash(user.passwordHash));
    return { token, user: { id: user.id, username: user.username } };
  }

  authenticate(request: FastifyRequest): AuthenticatedUser {
    const token = this.readToken(request);
    const session = token ? this.sessions.find(tokenHash(token)) : null;
    const user = session && session.expiresAt > this.clock()
      ? this.users.find((candidate) => candidate.id === session.userId && tokenHash(candidate.passwordHash) === session.credentialVersion)
      : undefined;
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Connectez-vous pour accéder aux dossiers.');
    return { id: user.id, username: user.username };
  }

  logout(request: FastifyRequest): void {
    const token = this.readToken(request);
    if (token) this.sessions.delete(tokenHash(token));
  }

  cookie(token: string): string {
    return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${this.secureCookies ? '; Secure' : ''}`;
  }

  clearCookie(): string {
    return `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${this.secureCookies ? '; Secure' : ''}`;
  }

  private readToken(request: FastifyRequest): string | null {
    const bearer = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.authorization ?? '');
    if (bearer) return bearer[1] ?? null;
    const cookie = request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
    const token = cookie?.slice(SESSION_COOKIE.length + 1);
    return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  }
}

export { hashPassword as createPasswordHash } from './password.js';
