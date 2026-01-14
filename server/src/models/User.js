const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false // Don't return password by default
    },
    pin: {
        type: String,
        select: false
    },
    role: {
        type: String,
        enum: ['admin', 'manager', 'member'],
        default: 'member'
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    },
    profilePicture: String,
    status: {
        type: String,
        enum: ['online', 'away', 'busy', 'offline'],
        default: 'offline'
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    twoFactorSecret: {
        type: String,
        select: false
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    vaultKey: {
        type: String, // Encrypted vault key
        select: false
    },
    settings: {
        sessionTimeout: {
            type: Number,
            default: 30 // minutes
        },
        notifications: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true }
        }
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Compare PIN method
userSchema.methods.comparePIN = async function (candidatePIN) {
    if (!this.pin) return false;
    return await bcrypt.compare(candidatePIN, this.pin);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
