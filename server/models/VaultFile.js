const mongoose = require("mongoose");

const vaultFileSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    iv: {
        type: String, // Store IV for decryption
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    folderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VaultFolder",
        default: null
    },
    uploadDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("VaultFile", vaultFileSchema);
