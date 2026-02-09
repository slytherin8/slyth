const mongoose = require("mongoose");

const vaultFileSchema = new mongoose.Schema({
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
  encryptedData: {
    type: String,
    required: true
  },
  encryptionIV: {
    type: String,
    required: true
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "VaultFolder",
    default: null
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
vaultFileSchema.index({ companyId: 1, folderId: 1, isDeleted: 1 });
vaultFileSchema.index({ uploadDate: -1 });

module.exports = mongoose.model("VaultFile", vaultFileSchema);