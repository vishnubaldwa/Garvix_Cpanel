import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Hashes passwords using Node's built-in scrypt KDF with per-password random 16-byte salt.
 * Never stores plaintext passwords.
 */
export function hashPasswordScrypt(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPasswordScrypt(password: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) {
    return false;
  }
  const actualBuf = scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) {
    return false;
  }
  return timingSafeEqual(actualBuf, expectedBuf);
}

/**
 * RFC 6238 TOTP (Time-Based One-Time Password) implementation using HMAC-SHA1.
 */
export function computeTotpCode(
  secretHex: string,
  timestampMs: number = Date.now(),
  stepSeconds: number = 30,
  digits: number = 6
): string {
  const counter = Math.floor(timestampMs / 1000 / stepSeconds);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter), 0);

  const keyBuf = Buffer.from(secretHex, 'hex');
  const hmac = createHmac('sha1', keyBuf).update(counterBuf).digest();
  const offset = (hmac[hmac.length - 1] ?? 0) & 0x0f;
  const binary =
    (((hmac[offset] ?? 0) & 0x7f) << 24) |
    (((hmac[offset + 1] ?? 0) & 0xff) << 16) |
    (((hmac[offset + 2] ?? 0) & 0xff) << 8) |
    ((hmac[offset + 3] ?? 0) & 0xff);

  const otp = binary % 10 ** digits;
  return otp.toString().padStart(digits, '0');
}

/**
 * Verifies a 6-digit TOTP code within a +/- 1 time-step drift window.
 */
export function verifyTotpCode(
  secretHex: string,
  providedCode: string,
  timestampMs: number = Date.now()
): boolean {
  const sanitized = providedCode.trim();
  if (!/^\d{6}$/.test(sanitized)) {
    return false;
  }
  for (const drift of [-1, 0, 1]) {
    const candidate = computeTotpCode(secretHex, timestampMs + drift * 30_000);
    if (
      timingSafeEqual(
        Buffer.from(candidate, 'utf8'),
        Buffer.from(sanitized, 'utf8')
      )
    ) {
      return true;
    }
  }
  return false;
}
