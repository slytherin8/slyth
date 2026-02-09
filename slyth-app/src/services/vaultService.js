import api from "./api";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

export const vaultService = {
  // PIN Management
  checkHasPin: async () => {
    const res = await api.get("/vault/pin-status");
    return res.data;
  },

  setPin: async (pin) => {
    const res = await api.post("/vault/set-pin", { pin });
    return res.data;
  },

  verifyPin: async (pin) => {
    const res = await api.post("/vault/verify-pin", { pin });
    return res.data;
  },

  // Folder Management
  getFolders: async (parentId = null) => {
    const res = await api.get(`/vault/folders${parentId ? `?parentId=${parentId}` : ""}`);
    return res.data;
  },

  createFolder: async (name, parentId = null) => {
    const res = await api.post("/vault/folders", { name, parentId });
    return res.data;
  },

  deleteFolder: async (folderId) => {
    const res = await api.delete(`/vault/folders/${folderId}`);
    return res.data;
  },

  // File Management
  getFiles: async (folderId = null) => {
    const res = await api.get(`/vault/files${folderId ? `?folderId=${folderId}` : ""}`);
    return res.data;
  },

  uploadFile: async (file, folderId = null) => {
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      type: file.mimeType,
      name: file.name,
    });
    if (folderId) formData.append("folderId", folderId);

    const res = await api.post("/vault/files", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  downloadFile: async (fileId, fileName, mimeType) => {
    try {
      const res = await api.get(`/vault/files/${fileId}/download`, {
        responseType: "blob",
      });

      if (Platform.OS === "web") {
        // Web download
        const blob = new Blob([res.data], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // Mobile download
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, res.data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      throw error;
    }
  },

  deleteFile: async (fileId) => {
    const res = await api.delete(`/vault/files/${fileId}`);
    return res.data;
  },
};