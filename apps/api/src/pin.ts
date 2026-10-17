import { argon2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const params = { memory: 19456, passes: 2, parallelism: 1, tagLength: 32 };

export function hashPin(pin: string): string {
  const nonce = randomBytes(16);
  const tag = argon2Sync('argon2id', { message: pin, nonce, ...params });
  return `${nonce.toString('base64')}$${tag.toString('base64')}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [nonce, tag] = stored.split('$').map((s) => Buffer.from(s, 'base64'));
  const actual = argon2Sync('argon2id', { message: pin, nonce, ...params });
  return timingSafeEqual(actual, tag);
}
