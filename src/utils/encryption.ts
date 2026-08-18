import crypto from 'crypto';
import logger from './logger';

// Standard 32-byte (256-bit) encryption key from environment, with a fallback derivation
const ENCRYPTION_SECRET =
  process.env.CHAT_ENCRYPTION_KEY ||
  process.env.JWT_SECRET ||
  'litmus_diagnostic_secure_vault_key_2026_aes256_gcm_salt';

// Derive 32-byte key using SHA-256
const KEY = crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit recommended for GCM
const PREFIX = 'enc:v1:';

/**
 * Encrypt sensitive plain text using AES-256-GCM.
 * Output format: enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encryptText(plainText: string): string {
  if (!plainText || typeof plainText !== 'string') {
    return plainText;
  }

  // Prevent double encryption
  if (plainText.startsWith(PREFIX)) {
    return plainText;
  }

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error: any) {
    logger.error(`[Encryption] Failed to encrypt text: ${error.message}`);
    return plainText;
  }
}

/**
 * Decrypt AES-256-GCM encrypted text.
 * Gracefully handles legacy unencrypted strings.
 */
export function decryptText(cipherText: string): string {
  if (!cipherText || typeof cipherText !== 'string') {
    return cipherText;
  }

  // If not encrypted with our prefix, return as-is (backward compatibility)
  if (!cipherText.startsWith(PREFIX)) {
    return cipherText;
  }

  try {
    const payload = cipherText.slice(PREFIX.length);
    const parts = payload.split(':');
    
    if (parts.length !== 3) {
      return cipherText;
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    logger.error(`[Encryption] Failed to decrypt text: ${error.message}`);
    // If decryption fails (e.g. invalid tag), return placeholder or raw text safely
    return cipherText;
  }
}
