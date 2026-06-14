import * as crypto from 'crypto';

export function randomEmail(): string {
  return `test+${crypto.randomBytes(6).toString('hex')}@example.com`;
}

export function randomString(length = 8): string {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
