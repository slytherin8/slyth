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
    console.log(`[VaultService v2] uploadFile called for: ${file.name}`);
    const formData = new FormData();

    if (Platform.OS === "web") {
      // ... web logic remains same ...
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
      if (folderId && folderId !== "undefined" && folderId !== "null") {
        formData.append("folderId", folderId);
      }

      const AsyncStorage = (await import("../utils/storage")).default;
      const token = await AsyncStorage.getItem("token");
      const { API } = await import("../constants/api");

      const res = await fetch(`${API}/api/vault/files`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message || "Upload failed");
      }
      return res.json();

    } else {
      // Mobile: Use FileSystem.uploadAsync for better reliability with large files
      const AsyncStorage = (await import("../utils/storage")).default;
      const token = await AsyncStorage.getItem("token");
      const { API } = await import("../constants/api");

      // FileSystem.uploadAsync takes the file URI directly and handles multipart form data internally.
      // The folderId is passed via parameters.

      console.log(`[VaultService v2] Using FileSystem.uploadAsync to: ${API}/api/vault/files`);

      const uploadResult = await FileSystem.uploadAsync(`${API}/api/vault/files`, file.uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        parameters: {
          folderId: (folderId && folderId !== "undefined" && folderId !== "null") ? folderId : '',
        }
      });

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        console.error(`[VaultService v2] uploadAsync error (${uploadResult.status}):`, uploadResult.body);
        throw new Error(`Server error ${uploadResult.status}`);
      }

      const data = JSON.parse(uploadResult.body);
      return data;
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