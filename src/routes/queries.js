const express = require('express');
const router = express.Router();
const queryController = require('../controllers/queryController');
const { protectAPI } = require('../middleware/auth');
const { queryLimiter } = require('../middleware/rateLimiter');

// Execute a query (API)
router.post('/execute', protectAPI, queryLimiter, queryController.executeQuery);

// Get query history for a session
router.get('/history/:sessionId', protectAPI, queryController.getQueryHistory);

// Get single query
router.get('/:id', protectAPI, queryController.getQuery);

// Delete query
router.delete('/:id', protectAPI, queryController.deleteQuery);

module.exports = router;
