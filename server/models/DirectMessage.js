const mongoose = require("mongoose");

const directMessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  messageText: {
    type: String,
    required: true,
    trim: true,
    maxLength: 1000
  },
  messageType: {
    type: String,
    enum: ["text", "image", "file"],
    default: "text"
  },
  fileData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  repliedMessage: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DirectMessage"
    },
    senderName: String,
    messageText: String
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true
  }
}, {
  timestamps: true
});

// Indexes for performance
directMessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
directMessageSchema.index({ companyId: 1 });
directMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model("DirectMessage", directMessageSchema);