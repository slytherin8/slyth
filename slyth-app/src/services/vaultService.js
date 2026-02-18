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

    if (Platform.OS === "web") {
      // On web, expo-document-picker returns asset.file as a native File object
      // If not available, fetch the blob from the URI
      let fileData = file.file;
      if (!fileData && file.uri) {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        fileData = new File([blob], file.name || "upload", { type: file.mimeType || blob.type });
      }
      if (!fileData) {
        throw new Error("Could not get file data for upload");
      }
      formData.append("file", fileData);
      if (folderId) formData.append("folderId", folderId);

      // Use fetch directly on web for correct multipart/form-data handling
      const AsyncStorage = (await import("../utils/storage")).default;
      const token = await AsyncStorage.getItem("token");
      const { API } = await import("../constants/api");

      const res = await fetch(`${API}/api/vault/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        // Do NOT set Content-Type — browser sets it with boundary automatically
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message || "Upload failed");
      }
      return res.json();

    } else {
      // Mobile: use axios with uri/type/name
      formData.append("file", {
        uri: file.uri,
        type: file.mimeType || "application/octet-stream",
        name: file.name || "upload",
      });
      if (folderId) formData.append("folderId", folderId);

      const res = await api.post("/vault/files", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    }
  },

  downloadFile: async (fileId, fileName, mimeType) => {
    try {
      const res = await api.get(`/vault/files/${fileId}/download`, {
        responseType: "arraybuffer",
      });

      if (Platform.OS === "web") {
        // Open file in new tab for preview (images, PDFs, etc.)
        const blob = new Blob([res.data], { type: mimeType || "application/octet-stream" });
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank"); // Opens in new tab for preview
        // Clean up after a short delay
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      } else {
        // Mobile: save to filesystem then share/open with default app
        const base64 = btoa(
          new Uint8Array(res.data).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Sharing.shareAsync(fileUri, { mimeType, dialogTitle: "Open with..." });
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