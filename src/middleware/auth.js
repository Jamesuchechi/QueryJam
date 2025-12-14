const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - require authentication
exports.protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in session (primary method)
        if (req.session && req.session.token) {
            token = req.session.token;
        }
        // Also check Authorization header for API requests
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).render('pages/error', {
                title: 'Unauthorized',
                message: 'Please log in to access this page'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).render('pages/error', {
                title: 'Unauthorized',
                message: 'User no longer exists'
            });
        }

        // Attach user to request
        req.user = user;
        req.session.user = user.toPublicJSON();

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).render('pages/error', {
                title: 'Unauthorized',
                message: 'Invalid token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).render('pages/error', {
                title: 'Session Expired',
                message: 'Your session has expired. Please log in again.'
            });
        }

        res.status(500).render('pages/error', {
            title: 'Error',
            message: 'Authentication failed'
        });
    }
};

// Protect API routes - return JSON instead of HTML
exports.protectAPI = async (req, res, next) => {
    try {
        let token;

        if (req.session && req.session.token) {
            token = req.session.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
};

// Check if user is authenticated (doesn't block, just sets flag)
exports.isAuthenticated = (req, res, next) => {
    res.locals.isAuthenticated = !!(req.session && req.session.user);
    res.locals.user = req.session ? req.session.user : null;
    next();
};

// Restrict to specific roles
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).render('pages/error', {
                title: 'Forbidden',
                message: 'You do not have permission to perform this action'
            });
        }
        next();
    };
};

// Restrict to specific roles for API
exports.restrictToAPI = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action'
            });
        }
        next();
    };
};