const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protectAPI } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// All routes require authentication and are rate limited
router.use(protectAPI);
router.use(apiLimiter);

// Generate query from natural language
router.post('/generate', aiController.generateQuery);

// Get query improvement suggestions
router.post('/suggest', aiController.suggestImprovements);

// Explain query
router.post('/explain', aiController.explainQuery);

// Explain error message
router.post('/explain-error', aiController.explainError);

module.exports = router;