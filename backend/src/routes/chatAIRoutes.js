const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const authenticate = require('../middleware/auth');
const admin = require('firebase-admin');

// Legacy endpoint for direct AI chat (for compatibility)
router.post('/', authenticate, async (req, res) => {
  try {
    const { 
      messages, 
      model = 'gpt-4o', 
      channelId,
      workspaceId 
    } = req.body;
    
    const userId = req.user.id;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        message: 'Messages array is required'
      });
    }
    
    // Get workspace ID from channel if not provided
    let finalWorkspaceId = workspaceId;
    if (!finalWorkspaceId && channelId) {
      const db = admin.firestore();
      const channelDoc = await db.collection('channels').doc(channelId).get();
      if (channelDoc.exists) {
        finalWorkspaceId = channelDoc.data().workspaceId;
      }
    }
    
    if (!finalWorkspaceId) {
      // Default workspace ID if none provided
      finalWorkspaceId = 'default';
    }
    
    // Determine provider from model
    const provider = model.startsWith('claude') ? 'anthropic' : 'openai';
    
    // Process with AI service
    const response = await aiService.processDirectMessage(
      finalWorkspaceId,
      messages,
      model,
      provider
    );
    
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error processing AI chat:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process AI message'
    });
  }
});

// Streaming endpoint
router.post('/stream', authenticate, async (req, res) => {
  try {
    const { 
      messages, 
      model = 'gpt-4o', 
      channelId,
      workspaceId 
    } = req.body;
    
    const userId = req.user.id;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        message: 'Messages array is required'
      });
    }
    
    // Get workspace ID from channel if not provided
    let finalWorkspaceId = workspaceId;
    if (!finalWorkspaceId && channelId) {
      const db = admin.firestore();
      const channelDoc = await db.collection('channels').doc(channelId).get();
      if (channelDoc.exists) {
        finalWorkspaceId = channelDoc.data().workspaceId;
      }
    }
    
    if (!finalWorkspaceId) {
      finalWorkspaceId = 'default';
    }
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    // Determine provider from model
    const provider = model.startsWith('claude') ? 'anthropic' : 'openai';
    
    try {
      const response = await aiService.processDirectMessage(
        finalWorkspaceId,
        messages,
        model,
        provider,
        { stream: true }
      );
      
      // Stream the response
      if (response.stream) {
        for await (const chunk of response.stream) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      }
      
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  } catch (error) {
    console.error('Error processing streaming AI message:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process AI message'
    });
  }
});

module.exports = router;