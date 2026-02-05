const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    unique: true
  },
  password: String,
  role: {
    type: String,
    enum: ["admin", "employee"]
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company"
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
    name: { type: String },
    jobRole: { type: String },
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
