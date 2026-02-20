const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  profilePhoto: {
    type: String, // URL or base64 image
    default: null
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    hasLeft: {
      type: Boolean,
      default: false
    },
    leftAt: {
      type: Date,
      default: null
    },
    unreadCount: {
      type: Number,
      default: 0
    },
    lastReadAt: {
      type: Date,
      default: Date.now
    },
    isMuted: {
      type: Boolean,
      default: false
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  totalMessages: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster queries
groupSchema.index({ companyId: 1, "members.userId": 1 });
groupSchema.index({ lastActivity: -1 });

module.exports = mongoose.model("Group", groupSchema);