const authService = require('../services/auth.service');
const User = require('../models/User');

exports.register = async (req, res) => {
    try {
        const user = await User.create(req.body);
        const token = await authService.generateToken(user._id);
        const refreshToken = await authService.generateRefreshToken(user._id);

        res.status(201).json({
            success: true,
            data: { user, token, refreshToken }
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const { user, token, refreshToken } = await authService.login(email, password);
        res.status(200).json({
            success: true,
            data: { user, token, refreshToken }
        });
    } catch (err) {
        res.status(401).json({ success: false, message: err.message });
    }
};

exports.verifyPIN = async (req, res) => {
    const { pin } = req.body;
    const userId = req.user.id; // From auth middleware
    try {
        const isValid = await authService.verifyPIN(userId, pin);
        if (isValid) {
            res.status(200).json({ success: true, message: 'PIN verified' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid PIN' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
