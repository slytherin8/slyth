const mongoose = require("mongoose");

const vaultFolderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "VaultFolder",
    default: null
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
vaultFolderSchema.index({ companyId: 1, parentId: 1, isDeleted: 1 });

module.exports = mongoose.model("VaultFolder", vaultFolderSchema);