const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ["admin", "employee"],
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  profile: {
    name: { type: String, trim: true },
    jobRole: { type: String, trim: true },
    avatar: { type: String }
  },
  profileCompleted: {
    type: Boolean,
    default: false
  },
  vaultPin: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("User", userSchema);
