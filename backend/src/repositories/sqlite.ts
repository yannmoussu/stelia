import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ConsultationSchema, type Consultation } from '@stelia/contracts';
import type { SessionStore } from '../auth/auth.service.js';
import type { ConsultationRepository, DeleteResult, MutationResult } from './consultation.repository.js';

export class SqliteStorage {
  readonly database: DatabaseSync;
  readonly sessions: SessionStore;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true, mode: 0o700 });
    const existed = path === ':memory:' || existsSync(path);
    this.database = new DatabaseSync(path, { timeout: 5_000 });
    if (!existed) chmodSync(path, 0o600);
    try {
      const version = Number(this.database.prepare('PRAGMA user_version').get()?.user_version ?? 0);
      if (version > 1) throw new Error('La base utilise une version de schéma plus récente que ce serveur.');
      this.database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS consultations (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        revision INTEGER NOT NULL CHECK (revision >= 1),
        document TEXT NOT NULL CHECK (json_valid(document))
      ) STRICT;
      CREATE INDEX IF NOT EXISTS consultations_owner ON consultations(owner_id);
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        credential_version TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS sessions_expiration ON sessions(expires_at);
      PRAGMA user_version = 1;
      `);
    } catch (error) {
      this.database.close();
      throw error;
    }
    this.sessions = {
      create: (tokenHash, userId, expiresAt, credentialVersion) => {
        this.database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
        this.database.prepare('INSERT INTO sessions (token_hash, user_id, credential_version, expires_at) VALUES (?, ?, ?, ?)').run(tokenHash, userId, credentialVersion, expiresAt);
      },
      find: (tokenHash) => {
        const row = this.database.prepare('SELECT user_id, credential_version, expires_at FROM sessions WHERE token_hash = ?').get(tokenHash);
        return row ? { userId: String(row.user_id), credentialVersion: String(row.credential_version), expiresAt: Number(row.expires_at) } : null;
      },
      delete: (tokenHash) => { this.database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash); },
    };
  }
  close(): void { this.database.close(); }
}

export class SqliteConsultationRepository implements ConsultationRepository {
  constructor(private readonly storage: SqliteStorage) {}

  async create(ownerId: string, consultation: Consultation): Promise<Consultation> {
    const document = ConsultationSchema.parse(consultation);
    this.storage.database.prepare('INSERT INTO consultations (id, owner_id, revision, document) VALUES (?, ?, ?, ?)')
      .run(document.id, ownerId, document.revision, JSON.stringify(document));
    return document;
  }
  async findById(ownerId: string, id: string): Promise<Consultation | null> {
    const row = this.storage.database.prepare('SELECT document FROM consultations WHERE id = ? AND owner_id = ?').get(id, ownerId);
    return row ? ConsultationSchema.parse(JSON.parse(String(row.document))) : null;
  }
  async findAll(ownerId: string): Promise<Consultation[]> {
    return this.storage.database.prepare('SELECT document FROM consultations WHERE owner_id = ?').all(ownerId)
      .map((row) => ConsultationSchema.parse(JSON.parse(String(row.document))))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async replace(ownerId: string, id: string, expectedRevision: number, consultation: Consultation): Promise<MutationResult> {
    const document = ConsultationSchema.parse(consultation);
    if (document.id !== id || document.revision !== expectedRevision + 1) throw new Error('Invalid repository replacement');
    const result = this.storage.database.prepare('UPDATE consultations SET revision = ?, document = ? WHERE id = ? AND owner_id = ? AND revision = ?')
      .run(document.revision, JSON.stringify(document), id, ownerId, expectedRevision);
    if (result.changes === 1) return { kind: 'updated', consultation: document };
    return await this.findById(ownerId, id) ? { kind: 'conflict' } : { kind: 'missing' };
  }
  async delete(ownerId: string, id: string, expectedRevision: number): Promise<DeleteResult> {
    const result = this.storage.database.prepare('DELETE FROM consultations WHERE id = ? AND owner_id = ? AND revision = ?').run(id, ownerId, expectedRevision);
    if (result.changes === 1) return 'deleted';
    return await this.findById(ownerId, id) ? 'conflict' : 'missing';
  }
}
