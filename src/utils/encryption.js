const crypto = require('crypto');

// Encryption key - in production, use environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32chars';
const ALGORITHM = 'aes-256-gcm';

// Ensure key is 32 bytes
const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

/**
 * Encrypt a string
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted text in format: iv:authTag:encrypted
 */
function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, key);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a string
 * @param {string} encryptedText - Encrypted text in format: iv:authTag:encrypted
 * @returns {string} - Decrypted text
 */
function decrypt(encryptedText) {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipher(ALGORITHM, key);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Hash a password (for additional security, though bcrypt is preferred)
 * @param {string} password - Password to hash
 * @returns {string} - Hashed password
 */
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return salt + ':' + hash;
}

/**
 * Verify a password against hash
 * @param {string} password - Plain password
 * @param {string} hash - Salt:hash string
 * @returns {boolean} - True if matches
 */
function verifyPassword(password, hash) {
    const parts = hash.split(':');
    if (parts.length !== 2) return false;

    const salt = parts[0];
    const originalHash = parts[1];
    const testHash = crypto.scryptSync(password, salt, 64).toString('hex');

    return testHash === originalHash;
}

module.exports = {
    encrypt,
    decrypt,
    hashPassword,
    verifyPassword
};