const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { protect, protectAPI } = require('../middleware/auth');

// Dashboard and session pages
router.get('/', protect, sessionController.getDashboard);
router.get('/create', protect, sessionController.getCreateSessionPage);
router.post('/', protect, sessionController.createSession);
router.get('/:id', protect, sessionController.getSession);

// SSE endpoint for real-time events
router.get('/:id/events', protect, sessionController.streamEvents);

// API endpoints
router.put('/:id', protectAPI, sessionController.updateSession);
router.delete('/:id', protectAPI, sessionController.deleteSession);
router.post('/:id/join', protectAPI, sessionController.joinSession);
router.post('/:id/leave', protectAPI, sessionController.leaveSession);

module.exports = router;
