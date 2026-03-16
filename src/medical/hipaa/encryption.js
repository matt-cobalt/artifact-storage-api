import crypto from 'crypto';

/**
 * HIPAA PHI Encryption Module
 * Field-level encryption for Protected Health Information
 */

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

// Get encryption key from environment (256-bit key)
const getEncryptionKey = () => {
  const key = process.env.HIPAA_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('HIPAA_ENCRYPTION_KEY environment variable is required');
  }
  
  // Ensure key is 32 bytes (256 bits)
  if (key.length !== 64) { // 64 hex chars = 32 bytes
    throw new Error('HIPAA_ENCRYPTION_KEY must be 64 hex characters (256 bits)');
  }
  
  return Buffer.from(key, 'hex');
};

/**
 * Encrypt PHI (Protected Health Information)
 * @param {string} plaintext - PHI to encrypt
 * @returns {string} Encrypted string in format: iv:authTag:encrypted
 */
export function encryptPHI(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a non-empty string');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');

  // Return format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt PHI
 * @param {string} ciphertext - Encrypted string in format: iv:authTag:encrypted
 * @returns {string} Decrypted plaintext
 */
export function decryptPHI(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string') {
    throw new Error('Ciphertext must be a non-empty string');
  }

  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format. Expected: iv:authTag:encrypted');
  }

  const [ivHex, authTagHex, encrypted] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * PHI fields that must be encrypted at rest
 */
export const PHI_FIELDS = [
  'name',
  'ssn',
  'dob',              // Date of birth
  'address',
  'phone',
  'email',
  'medical_record_number',
  'diagnosis',
  'medications',
  'allergies',
  'insurance_member_id',
  'insurance_group_number',
  'referring_physician'
];

/**
 * Encrypt PHI fields in an object
 * @param {Object} data - Object containing potential PHI
 * @returns {Object} Object with PHI fields encrypted
 */
export function encryptPHIObject(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const encrypted = { ...data };

  for (const field of PHI_FIELDS) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      try {
        encrypted[field] = encryptPHI(encrypted[field]);
      } catch (error) {
        console.error(`Failed to encrypt PHI field ${field}:`, error);
        // Don't fail silently - log and keep original for debugging
        // In production, this should throw
        throw error;
      }
    }
  }

  return encrypted;
}

/**
 * Decrypt PHI fields in an object
 * @param {Object} data - Object with encrypted PHI fields
 * @returns {Object} Object with PHI fields decrypted
 */
export function decryptPHIObject(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const decrypted = { ...data };

  for (const field of PHI_FIELDS) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      // Check if field looks encrypted (contains colons from format)
      if (decrypted[field].includes(':') && decrypted[field].split(':').length === 3) {
        try {
          decrypted[field] = decryptPHI(decrypted[field]);
        } catch (error) {
          console.error(`Failed to decrypt PHI field ${field}:`, error);
          // If decryption fails, field might not be encrypted - keep as is
        }
      }
    }
  }

  return decrypted;
}

/**
 * Check if a field contains PHI
 * @param {string} fieldName - Field name to check
 * @returns {boolean} True if field contains PHI
 */
export function isPHIField(fieldName) {
  return PHI_FIELDS.includes(fieldName.toLowerCase());
}












