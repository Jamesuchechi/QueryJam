const { encrypt, decrypt, hashPassword, verifyPassword } = require('../../../src/utils/encryption');

describe('Encryption Utils', () => {
    describe('encrypt/decrypt', () => {
        test('should encrypt and decrypt text correctly', () => {
            const originalText = 'Hello, World!';
            const encrypted = encrypt(originalText);
            const decrypted = decrypt(encrypted);

            expect(decrypted).toBe(originalText);
        });

        test('should handle empty strings', () => {
            const originalText = '';
            const encrypted = encrypt(originalText);
            const decrypted = decrypt(encrypted);

            expect(decrypted).toBe(originalText);
        });
    });

    describe('hashPassword/verifyPassword', () => {
        test('should hash and verify password correctly', async () => {
            const password = 'testPassword123';
            const hash = hashPassword(password);
            const isValid = verifyPassword(password, hash);

            expect(isValid).toBe(true);
        });

        test('should reject wrong password', async () => {
            const password = 'testPassword123';
            const wrongPassword = 'wrongPassword';
            const hash = hashPassword(password);
            const isValid = verifyPassword(wrongPassword, hash);

            expect(isValid).toBe(false);
        });
    });
});