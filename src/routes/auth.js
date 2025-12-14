const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateSignup, validateLogin, handleValidationErrors } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');

// Public routes
router.get('/signup', authController.getSignupPage);
router.get('/login', authController.getLoginPage);

router.post('/signup',
    authLimiter,
    validateSignup,
    handleValidationErrors,
    authController.signup
);

router.post('/login',
    authLimiter,
    validateLogin,
    handleValidationErrors,
    authController.login
);

// Protected routes
router.post('/logout', protect, authController.logout);
router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);

module.exports = router;