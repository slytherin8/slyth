const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true
  },
  senderId: {
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
    type: mongoose.Schema.Types.Mixed, // Allow objects for file metadata
    default: null
  },
  repliedMessage: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message"
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
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for performance
messageSchema.index({ groupId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);