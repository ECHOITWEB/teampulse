const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const chatControllerV2 = require('../controllers/chatControllerV2');
const authenticateUser = require('../middleware/auth');
const { authenticate } = require('../middleware/firebaseAuth');

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

// AI endpoint with multimodal support
router.post('/ai', authenticateUser, chatController.processAIRequest);

// New V2 endpoints for team chat AI (using Firebase auth)
router.post('/message', authenticate, chatControllerV2.processMessage);
router.post('/message/stream', authenticate, chatControllerV2.streamMessage);
router.post('/bot/invite', authenticate, chatControllerV2.inviteBot);
router.post('/bot/remove', authenticate, chatControllerV2.removeBot);

module.exports = router;