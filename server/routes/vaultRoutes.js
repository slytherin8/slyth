const express = require("express");
const router = express.Router();
const User = require("../models/User");
const VaultFile = require("../models/VaultFile");
const VaultFolder = require("../models/VaultFolder");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { auth } = require("../middleware/authMiddleware");

// Ensure vault directory exists
const VAULT_DIR = path.join(__dirname, "../uploads/vault");
if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
}

// Multer config
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Encryption Configuration
const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.scryptSync(process.env.JWT_SECRET || 'fallback_secret', 'salt', 32);

// Middleware to check admin
const verifyAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }
        req.userData = user;
        next();
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

// --- PIN Management ---

router.post("/set-pin", auth, verifyAdmin, async (req, res) => {
    const { pin } = req.body;
    if (!pin || pin.length < 4) return res.status(400).json({ message: "PIN must be at least 4 digits" });

    try {
        const user = req.userData;
        console.log("Setting PIN for user:", user._id, "Current PIN:", user.vaultPin);

        if (user.vaultPin) return res.status(400).json({ message: "PIN already set" });

        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(pin, salt);

        user.vaultPin = hashedPin;
        const savedUser = await user.save();
        console.log("PIN Saved. New User State:", savedUser.vaultPin);

        res.json({ message: "Vault PIN set successfully" });
    } catch (err) {
        console.error("Error setting PIN:", err);
        res.status(500).json({ message: "Error setting PIN" });
    }
});

router.post("/verify-pin", auth, verifyAdmin, async (req, res) => {
    const { pin } = req.body;
    try {
        const user = req.userData;
        console.log("Verifying PIN for user:", user._id, "Has PIN:", !!user.vaultPin);

        if (!user.vaultPin) return res.status(400).json({ message: "PIN not set" });

        const isMatch = await bcrypt.compare(pin, user.vaultPin);
        if (!isMatch) return res.status(403).json({ message: "Incorrect PIN" });

        res.json({ success: true, message: "Access granted" });
    } catch (err) {
        console.error("Error verifying PIN:", err);
        res.status(500).json({ message: "Error verifying PIN" });
    }
});

router.get("/has-pin", auth, verifyAdmin, async (req, res) => {
    try {
        const user = req.userData;
        res.json({ hasPin: !!user.vaultPin });
    } catch (err) {
        res.status(500).json({ message: "Error checking PIN status" });
    }
});

// --- Folder Management ---

router.post("/folders", auth, verifyAdmin, async (req, res) => {
    const { name, parent } = req.body;
    if (!name) return res.status(400).json({ message: "Folder name required" });

    try {
        const folder = new VaultFolder({
            name,
            parent: parent || null,
            owner: req.user.id
        });
        await folder.save();
        res.json(folder);
    } catch (err) {
        res.status(500).json({ message: "Error creating folder" });
    }
});

router.get("/folders", auth, verifyAdmin, async (req, res) => {
    const { parent } = req.query;
    try {
        const query = { owner: req.user.id };
        if (parent) {
            query.parent = parent;
        } else {
            query.parent = null; // Root folders
        }
        const folders = await VaultFolder.find(query).sort({ name: 1 });
        res.json(folders);
    } catch (err) {
        res.status(500).json({ message: "Error fetching folders" });
    }
});

router.delete("/folders/:id", auth, verifyAdmin, async (req, res) => {
    try {
        const folderId = req.params.id;
        // Recursive delete is complex, for simplicity, we prevent delete if not empty
        const subFolders = await VaultFolder.countDocuments({ parent: folderId });
        const files = await VaultFile.countDocuments({ folderId: folderId });

        if (subFolders > 0 || files > 0) {
            return res.status(400).json({ message: "Folder not empty" });
        }

        await VaultFolder.findByIdAndDelete(folderId);
        res.json({ message: "Folder deleted" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting folder" });
    }
});

// --- File Management ---

router.post("/upload", auth, verifyAdmin, upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const { folderId } = req.body;

    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);

        const encryptedBuffer = Buffer.concat([cipher.update(req.file.buffer), cipher.final()]);

        const filename = `${Date.now()}-${req.file.originalname}`;
        const filePath = path.join(VAULT_DIR, filename);

        fs.writeFileSync(filePath, encryptedBuffer);

        const newFile = new VaultFile({
            filename: filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            path: filePath,
            iv: iv.toString('hex'),
            owner: req.user.id,
            folderId: folderId || null
        });

        await newFile.save();
        res.json(newFile);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed" });
    }
});

router.get("/files", auth, verifyAdmin, async (req, res) => {
    const { folderId } = req.query;
    try {
        const query = { owner: req.user.id };
        if (folderId) {
            query.folderId = folderId;
        } else {
            query.folderId = null; // Root files
        }
        const files = await VaultFile.find(query).sort({ uploadDate: -1 });
        res.json(files);
    } catch (err) {
        res.status(500).json({ message: "Error fetching files" });
    }
});

router.get("/files/:id", auth, verifyAdmin, async (req, res) => {
    try {
        const file = await VaultFile.findById(req.params.id);
        if (!file) return res.status(404).json({ message: "File not found" });

        if (!fs.existsSync(file.path)) return res.status(404).json({ message: "Physical file missing" });

        const encryptedData = fs.readFileSync(file.path);
        const iv = Buffer.from(file.iv, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);

        const decryptedBuffer = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

        res.set("Content-Type", file.mimeType);
        res.set("Content-Disposition", `inline; filename="${file.originalName}"`);
        res.send(decryptedBuffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error decrypting file" });
    }
});

router.delete("/files/:id", auth, verifyAdmin, async (req, res) => {
    try {
        const file = await VaultFile.findById(req.params.id);
        if (!file) return res.status(404).json({ message: "File not found" });

        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        await VaultFile.findByIdAndDelete(req.params.id);
        res.json({ message: "File deleted" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting file" });
    }
});

module.exports = router;
