import api from './api';
import { encryptFile, decryptFile } from '../utils/encryption';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { APP_CONSTANTS } from '../utils/constants';
import { MOCK_VAULT_ITEMS } from '../utils/mockData';

/**
 * Vault Service
 */

export const vaultService = {
    /**
     * Get all vault items
     */
    getVaultItems: async (filters = {}) => {
        if (APP_CONSTANTS.USE_MOCK_DATA) {
            // Simulate API delay
            return new Promise((resolve) => setTimeout(() => {
                let items = MOCK_VAULT_ITEMS;
                // Basic filtering for mock data if needed
                if (filters.search) {
                    const searchTerm = filters.search.toLowerCase();
                    items = items.filter(item =>
                        item.fileName.toLowerCase().includes(searchTerm) ||
                        item.fileType.toLowerCase().includes(searchTerm)
                    );
                }
                resolve({ data: items });
            }, 500));
        }
        const response = await api.get('/vault', { params: filters });
        return response.data;
    },

    /**
     * Upload file to vault
     */
    uploadToVault: async (fileUri, metadata, vaultKey) => {
        if (APP_CONSTANTS.USE_MOCK_DATA) {
            // Simulate API delay and return a mock item
            return new Promise((resolve) => setTimeout(() => {
                const newItem = {
                    _id: Date.now().toString(),
                    fileName: metadata.fileName,
                    fileType: metadata.mimeType,
                    size: '1.2 MB', // Mock size
                    uploadedAt: new Date().toISOString(),
                    owner: 'Mock User',
                    sharedWith: [],
                    tags: metadata.tags || [],
                };
                MOCK_VAULT_ITEMS.push(newItem); // Add to mock data for subsequent fetches
                resolve({ data: { success: true, item: newItem } });
            }, 1000));
        }

        try {
            // Read file as base64
            const fileContent = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Encrypt file content
            const { encrypted, iv } = await encryptFile(fileContent, vaultKey);

            // Create form data
            const formData = new FormData();
            formData.append('file', {
                uri: fileUri,
                name: metadata.fileName,
                type: metadata.mimeType,
            });
            formData.append('encryptedContent', encrypted);
            formData.append('encryptionIV', iv);
            formData.append('metadata', JSON.stringify(metadata));

            const response = await api.post('/vault', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return response.data;
        } catch (error) {
            console.error('Vault upload error:', error);
            throw error;
        }
    },

    /**
     * Get vault item details
     */
    getVaultItem: async (itemId) => {
        if (APP_CONSTANTS.USE_MOCK_DATA) {
            return new Promise((resolve) => setTimeout(() => {
                const item = MOCK_VAULT_ITEMS.find(i => i._id === itemId);
                resolve({ data: { item: item || null } });
            }, 300));
        }
        const response = await api.get(`/vault/${itemId}`);
        return response.data;
    },

    /**
     * Download and decrypt vault file
     */
    downloadVaultFile: async (itemId, vaultKey) => {
        if (APP_CONSTANTS.USE_MOCK_DATA) {
            return new Promise((resolve) => setTimeout(() => {
                const item = MOCK_VAULT_ITEMS.find(i => i._id === itemId);
                if (item) {
                    // Simulate creating a dummy file
                    const mockFileContent = `Mock content for ${item.fileName}`;
                    const fileUri = `${FileSystem.cacheDirectory}${item.fileName}`;
                    FileSystem.writeAsStringAsync(fileUri, mockFileContent, {
                        encoding: FileSystem.EncodingType.UTF8,
                    }).then(() => {
                        resolve(fileUri);
                    });
                } else {
                    throw new Error('Mock item not found for download');
                }
            }, 1500));
        }

        try {
            const response = await api.get(`/vault/${itemId}/download`);
            const { encryptedContent, encryptionIV, fileName } = response.data.data;

            // Decrypt file
            const decryptedContent = decryptFile(encryptedContent, vaultKey, encryptionIV);

            // Save to temp directory
            const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
            await FileSystem.writeAsStringAsync(fileUri, decryptedContent, {
                encoding: FileSystem.EncodingType.Base64,
            });

            return fileUri;
        } catch (error) {
            console.error('Vault download error:', error);
            throw error;
        }
    },

    /**
     * Delete vault item
     */
    deleteVaultItem: async (itemId) => {
        if (APP_CONSTANTS.USE_MOCK_DATA) {
            return new Promise((resolve) => setTimeout(() => {
                const index = MOCK_VAULT_ITEMS.findIndex(item => item._id === itemId);
                if (index !== -1) {
                    MOCK_VAULT_ITEMS.splice(index, 1);
                    resolve({ data: { success: true } });
                } else {
                    resolve({ data: { success: false } });
                }
            }, 500));
        }
        const response = await api.delete(`/vault/${itemId}`);
        return response.data;
    },

    /**
     * Share vault item with user
     */
    shareVaultItem: async (itemId, userId, permissions) => {
        if (APP_CONSTANTS.USE_MOCK_DATA) {
            return new Promise((resolve) => setTimeout(() => {
                const item = MOCK_VAULT_ITEMS.find(i => i._id === itemId);
                if (item) {
                    if (!item.sharedWith) item.sharedWith = [];
                    item.sharedWith.push({ userId, permissions, sharedAt: new Date().toISOString() });
                    resolve({ data: { success: true, item } });
                } else {
                    resolve({ data: { success: false, message: 'Mock item not found' } });
                }
            }, 700));
        }
        const response = await api.post(`/vault/${itemId}/share`, {
            userId,
            permissions,
        });
        return response.data;
    },

    /**
     * Get vault access log
     */
    getAccessLog: async (itemId) => {
        const response = await api.get(`/vault/${itemId}/access-log`);
        return response.data;
    },
};

export default vaultService;
