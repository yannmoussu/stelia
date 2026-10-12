import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);

/** Provision offline; plaintext passwords are never stored by the server. */
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 1_024) throw new Error('Le mot de passe doit contenir entre 12 et 1024 caractères.');
  const salt = randomBytes(16).toString('hex');
  const key = await deriveKey(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${key.toString('hex')}`;
}

export function isPasswordHash(value: string): boolean {
  return /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(value);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!isPasswordHash(hash)) return false;
  const [, salt, expected] = hash.split('$');
  if (!salt || !expected) return false;
  const key = await deriveKey(password, salt, 64) as Buffer;
  return timingSafeEqual(key, Buffer.from(expected, 'hex'));
}
