const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const crypto = require("crypto");
const User = require("../models/User");
const VaultFolder = require("../models/VaultFolder");
const VaultFile = require("../models/VaultFile");
const { auth, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Encryption helpers
const ALGORITHM = "aes-256-cbc";

// Ensure we have a 32-byte key
const getEncryptionKey = () => {
  const key = process.env.VAULT_ENCRYPTION_KEY;
  if (!key) {
    console.warn("VAULT_ENCRYPTION_KEY not found in .env, using random key (files will not be readable after restart)");
    return crypto.randomBytes(32);
  }

  // Requirement: "Convert the secret key safely using crypto.createHash('sha256')"
  // This ensures exactly 32 bytes regardless of input length and avoids using raw env key
  return crypto.createHash('sha256').update(String(key)).digest();
};

const ENCRYPTION_KEY = getEncryptionKey();

const encrypt = (text) => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return { encrypted, iv: iv.toString("hex") };
  } catch (error) {
    console.error("Encryption failed:", error);
    throw error;
  }
};

const decrypt = (encryptedData, iv) => {
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(iv, "hex"));
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw error;
  }
};

/* =====================
   PIN MANAGEMENT
===================== */

// Check if user has PIN set
router.get("/pin-status", auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ hasPin: !!user.vaultPin });
  } catch (error) {
    res.status(500).json({ message: "Failed to check PIN status" });
  }
});

// Set PIN (first time)
router.post("/set-pin", auth, adminOnly, async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin || pin.length < 4) {
      return res.status(400).json({ message: "PIN must be at least 4 digits" });
    }

    const user = await User.findById(req.user.id);
    if (user.vaultPin) {
      return res.status(400).json({ message: "PIN already set" });
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    user.vaultPin = hashedPin;
    await user.save();

    res.json({ message: "PIN set successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to set PIN" });
  }
});

// Update PIN
router.post("/update-pin", auth, adminOnly, async (req, res) => {
  try {
    const { oldPin, newPin } = req.body;

    if (!oldPin || !newPin || newPin.length < 4) {
      return res.status(400).json({ message: "PIN must be at least 4 digits" });
    }

    const user = await User.findById(req.user.id);
    if (!user.vaultPin) {
      return res.status(400).json({ message: "No PIN set yet" });
    }

    const isMatch = await bcrypt.compare(oldPin, user.vaultPin);
    if (!isMatch) {
      console.log("PIN Mismatch: Old PIN provided was wrong"); // Logging for debug
      return res.status(401).json({ message: "Incorrect old PIN" });
    }

    const hashedPin = await bcrypt.hash(newPin, 10);
    user.vaultPin = hashedPin;
    await user.save();

    res.json({ message: "PIN updated successfully" });
  } catch (error) {
    console.error("UPDATE PIN ERROR:", error);
    res.status(500).json({ message: "Failed to update PIN" });
  }
});

// Verify PIN
router.post("/verify-pin", auth, adminOnly, async (req, res) => {
  try {
    const { pin } = req.body;
    const user = await User.findById(req.user.id);

    if (!user.vaultPin) {
      return res.status(400).json({ message: "No PIN set" });
    }

    const isValid = await bcrypt.compare(pin, user.vaultPin);
    if (!isValid) {
      return res.status(403).json({ message: "Invalid PIN" });
    }

    res.json({ message: "PIN verified", verified: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to verify PIN" });
  }
});

/* =====================
   FOLDER MANAGEMENT
===================== */

// Get folders
router.get("/folders", auth, adminOnly, async (req, res) => {
  try {
    const { parentId } = req.query;
    const folders = await VaultFolder.find({
      companyId: req.user.companyId,
      parentId: parentId || null,
      isDeleted: false
    }).sort({ createdAt: -1 });

    res.json(folders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch folders" });
  }
});

// Create folder
router.post("/folders", auth, adminOnly, async (req, res) => {
  try {
    const { name, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Folder name required" });
    }

    const folder = await VaultFolder.create({
      name,
      parentId: parentId || null,
      companyId: req.user.companyId,
      createdBy: req.user.id
    });

    res.status(201).json(folder);
  } catch (error) {
    res.status(500).json({ message: "Failed to create folder" });
  }
});

// Delete folder
router.delete("/folders/:folderId", auth, adminOnly, async (req, res) => {
  try {
    const { folderId } = req.params;

    // Soft delete
    await VaultFolder.findByIdAndUpdate(folderId, { isDeleted: true });

    // Also soft delete all files in this folder
    await VaultFile.updateMany(
      { folderId, companyId: req.user.companyId },
      { isDeleted: true }
    );

    res.json({ message: "Folder deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete folder" });
  }
});

/* =====================
   FILE MANAGEMENT
===================== */

// Get files
router.get("/files", auth, adminOnly, async (req, res) => {
  try {
    const { folderId } = req.query;
    const files = await VaultFile.find({
      companyId: req.user.companyId,
      folderId: folderId || null,
      isDeleted: false
    }).sort({ uploadDate: -1 });

    res.json(files);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch files" });
  }
});

// Upload file
router.post("/files", auth, adminOnly, (req, res, next) => {
  console.log(`[Vault Server] Received upload request: ${req.get('Content-Type')}`);
  next();
}, upload.single("file"), async (req, res) => {
  try {
    console.log(`[Vault Server] Processing file: ${req.file?.originalname}, Size: ${req.file?.size}`);
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded. Please select a file." });
    }

    const { folderId } = req.body;

    // Validate folderId if provided
    if (folderId && folderId !== "null" && folderId !== "undefined") {
      if (!mongoose.Types.ObjectId.isValid(folderId)) {
        return res.status(400).json({ message: "Invalid folder ID format" });
      }

      // Verify folder exists
      const folderExists = await VaultFolder.exists({ _id: folderId, companyId: req.user.companyId, isDeleted: false });
      if (!folderExists) {
        return res.status(404).json({ message: "Target folder not found" });
      }
    }

    // Encrypt file data
    const fileBuffer = req.file.buffer.toString("base64");
    const { encrypted, iv } = encrypt(fileBuffer);

    const file = await VaultFile.create({
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      encryptedData: encrypted,
      encryptionIV: iv,
      folderId: (folderId && folderId !== "null" && folderId !== "undefined") ? folderId : null,
      companyId: req.user.companyId,
      uploadedBy: req.user.id
    });

    res.status(201).json({
      _id: file._id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      uploadDate: file.uploadDate
    });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ message: "Failed to upload file due to server error: " + error.message });
  }
});

// Download file
router.get("/files/:fileId/download", auth, adminOnly, async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await VaultFile.findOne({
      _id: fileId,
      companyId: req.user.companyId,
      isDeleted: false
    });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Decrypt file data
    const decryptedData = decrypt(file.encryptedData, file.encryptionIV);
    const buffer = Buffer.from(decryptedData, "base64");

    res.set({
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${file.originalName}"`,
      "Content-Length": buffer.length
    });

    res.send(buffer);
  } catch (error) {
    console.error("File download error:", error);
    res.status(500).json({ message: "Failed to download file" });
  }
});

// Delete file
router.delete("/files/:fileId", auth, adminOnly, async (req, res) => {
  try {
    const { fileId } = req.params;

    // Soft delete
    await VaultFile.findByIdAndUpdate(fileId, { isDeleted: true });

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete file" });
  }
});

module.exports = router;