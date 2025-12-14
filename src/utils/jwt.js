const jwt = require('jsonwebtoken');

const generateToken = (userId, expiresIn = '7d') => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not set in environment variables');
    }

    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn });
};

const verifyToken = (token) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not set in environment variables');
    }

    return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
    generateToken,
    verifyToken
};
