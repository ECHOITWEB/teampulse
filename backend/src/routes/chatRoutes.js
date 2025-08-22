const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authenticateUser = require('../middleware/auth');

// Create new chat session
router.post('/sessions', authenticateUser, chatController.createSession);

// Get user's chat sessions
router.get('/sessions', authenticateUser, chatController.getSessions);

// Get specific session with messages
router.get('/sessions/:sessionId', authenticateUser, chatController.getSessionMessages);

// Send message to session
router.post('/sessions/:sessionId/messages', authenticateUser, chatController.sendMessage);

// Delete session
router.delete('/sessions/:sessionId', authenticateUser, chatController.deleteSession);

// Update session name
router.patch('/sessions/:sessionId', authenticateUser, chatController.updateSession);

module.exports = router;