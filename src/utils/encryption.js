import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';

/**
 * Generate a random encryption key
 */
export const generateKey = async () => {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return btoa(String.fromCharCode(...randomBytes));
};

/**
 * Generate initialization vector
 */
export const generateIV = async () => {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return btoa(String.fromCharCode(...randomBytes));
};

/**
 * Encrypt data using AES-256-GCM
 * @param {string} data - Data to encrypt
 * @param {string} key - Encryption key
 * @returns {object} - { encrypted, iv }
 */
export const encryptData = async (data, key) => {
    try {
        const iv = await generateIV();
        const encrypted = CryptoJS.AES.encrypt(data, key, {
            iv: CryptoJS.enc.Base64.parse(iv),
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
        }).toString();

        return {
            encrypted,
            iv,
        };
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
};

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encryptedData - Encrypted data
 * @param {string} key - Decryption key
 * @param {string} iv - Initialization vector
 * @returns {string} - Decrypted data
 */
export const decryptData = (encryptedData, key, iv) => {
    try {
        const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
            iv: CryptoJS.enc.Base64.parse(iv),
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
        });

        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
};

/**
 * Hash password using SHA-256
 * @param {string} password
 * @returns {string}
 */
export const hashPassword = async (password) => {
    const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
    );
    return digest;
};

/**
 * Generate vault encryption key from master password
 * @param {string} masterPassword
 * @param {string} salt
 * @returns {Promise<string>}
 */
export const deriveVaultKey = async (masterPassword, salt) => {
    const combined = masterPassword + salt;
    const key = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA512,
        combined
    );
    return key.substring(0, 64); // Use first 64 chars as key
};

/**
 * Encrypt file for vault
 * @param {string} fileContent - Base64 encoded file
 * @param {string} vaultKey
 * @returns {Promise<object>}
 */
export const encryptFile = async (fileContent, vaultKey) => {
    return await encryptData(fileContent, vaultKey);
};

/**
 * Decrypt file from vault
 * @param {string} encryptedContent
 * @param {string} vaultKey
 * @param {string} iv
 * @returns {string}
 */
export const decryptFile = (encryptedContent, vaultKey, iv) => {
    return decryptData(encryptedContent, vaultKey, iv);
};
