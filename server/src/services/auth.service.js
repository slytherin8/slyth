const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

class AuthService {
    async generateToken(userId) {
        return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'secret', {
            expiresIn: process.env.JWT_EXPIRES_IN || '1h'
        });
    }

    async generateRefreshToken(userId) {
        return jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET || 'refresh_secret', {
            expiresIn: '7d'
        });
    }

    async verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET || 'secret');
        } catch (err) {
            return null;
        }
    }

    async login(email, password) {
        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            throw new Error('Invalid email or password');
        }

        const token = await this.generateToken(user._id);
        const refreshToken = await this.generateRefreshToken(user._id);

        return { user, token, refreshToken };
    }

    async setPIN(userId, pin) {
        const hashedPIN = await bcrypt.hash(pin, 12);
        await User.findByIdAndUpdate(userId, { pin: hashedPIN });
    }

    async verifyPIN(userId, pin) {
        const user = await User.findById(userId).select('+pin');
        if (!user) throw new Error('User not found');
        return await user.comparePIN(pin);
    }
}

module.exports = new AuthService();
