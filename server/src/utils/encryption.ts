import crypto from 'crypto';

// Supports multiple key versions via env: ENCRYPTION_KEY (v1), ENCRYPTION_KEY_V2, etc.
export function getKey(version: number): Buffer {
  const envName = version === 1 ? 'ENCRYPTION_KEY' : `ENCRYPTION_KEY_V${version}`;
  const raw = process.env[envName];
  if (!raw) throw new Error(`Missing encryption key env for version ${version}`);
  return crypto.createHash('sha256').update(raw).digest();
}

export function encryptToken(token: string, version: number): string {
  const key = getKey(version);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const enc = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]).toString('base64');
  return `${version}|${iv.toString('base64')}:${enc}`; // prepend version
}

export function decryptToken(blob: string): { token: string; version: number } {
  if (!blob.includes('|')) {
    // legacy format: iv:enc assumed version 1
    const [ivB64, encB64] = blob.split(':');
    const key = getKey(1);
    const iv = Buffer.from(ivB64, 'base64');
    const data = Buffer.from(encB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const token = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    return { token, version: 1 };
  }
  const [verPart, rest] = blob.split('|');
  const version = Number(verPart) || 1;
  const [ivB64, encB64] = rest.split(':');
  const key = getKey(version);
  const iv = Buffer.from(ivB64, 'base64');
  const data = Buffer.from(encB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const token = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  return { token, version };
}

export async function rotateTokenBlob(oldBlob: string, newVersion: number): Promise<string> {
  const { token } = decryptToken(oldBlob);
  return encryptToken(token, newVersion);
}
