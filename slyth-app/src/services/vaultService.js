import api from "./api";
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export const vaultService = {
    // Check if PIN is set
    checkHasPin: async () => {
        const res = await api.get("/vault/has-pin");
        return res.data;
    },

    // Set new PIN
    setPin: async (pin) => {
        const res = await api.post("/vault/set-pin", { pin });
        return res.data;
    },

    // Verify PIN
    verifyPin: async (pin) => {
        const res = await api.post("/vault/verify-pin", { pin });
        return res.data;
    },

    // Upload File
    uploadFile: async (file, folderId = null) => {
        const formData = new FormData();
        if (Platform.OS === 'web') {
            const response = await fetch(file.uri);
            const blob = await response.blob();
            formData.append("file", blob, file.name);
        } else {
            formData.append("file", {
                uri: file.uri,
                name: file.name,
                type: file.mimeType || "application/octet-stream",
            });
        }
        if (folderId) {
            formData.append("folderId", folderId);
        }

        const res = await api.post("/vault/upload", formData, {
            headers: {
                // "Content-Type": "multipart/form-data", // Removed to let boundary be set automatically
            },
            transformRequest: (data, headers) => {
                return data; // Prevent Axios from stringifying FormData
            }
        });
        return res.data;
    },

    // List Files
    getFiles: async (folderId = null) => {
        const res = await api.get("/vault/files", {
            params: { folderId }
        });
        return res.data;
    },

    // Delete File
    deleteFile: async (id) => {
        const res = await api.delete(`/vault/files/${id}`);
        return res.data;
    },

    // Create Folder
    createFolder: async (name, parent = null) => {
        const res = await api.post("/vault/folders", { name, parent });
        return res.data;
    },

    // Get Folders
    getFolders: async (parent = null) => {
        const res = await api.get("/vault/folders", {
            params: { parent }
        });
        return res.data;
    },

    // Delete Folder
    deleteFolder: async (id) => {
        const res = await api.delete(`/vault/folders/${id}`);
        return res.data;
    },

    // Download/View File
    downloadFile: async (id, filename, mimetype) => {
        try {
            if (Platform.OS === 'web') {
                // WEB IMPLEMENTATION
                const response = await api.get(`/vault/files/${id}`, {
                    responseType: 'blob'
                });
                const blob = new Blob([response.data], { type: mimetype });
                const url = window.URL.createObjectURL(blob);

                // Force Download
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', filename); // Set filename
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                // NATIVE IMPLEMENTATION
                const fileUri = FileSystem.documentDirectory + filename;
                const token = api.defaults.headers.common['Authorization'];

                const result = await FileSystem.downloadAsync(
                    `${api.defaults.baseURL}/vault/files/${id}`,
                    fileUri,
                    {
                        headers: {
                            'Authorization': token
                        }
                    }
                );

                if (result.status === 200) {
                    if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(result.uri, { mimeType: mimetype, UTI: mimetype });
                    }
                } else {
                    throw new Error("Download failed");
                }
            }
        } catch (error) {
            console.error("Download Error:", error);
            throw error;
        }
    }
};
