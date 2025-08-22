const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const authenticate = require('../middleware/auth');
const admin = require('firebase-admin');

// Process AI chat message with streaming support
router.post('/message/stream', authenticate, async (req, res) => {
  try {
    const { channelId, content, attachments } = req.body;
    const userId = req.user.id;
    
    if (!channelId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Channel ID and content are required'
      });
    }
    
    // Get channel information to check if AI is invited
    const db = admin.firestore();
    const channelDoc = await db.collection('channels').doc(channelId).get();
    
    if (!channelDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }
    
    const channel = channelDoc.data();
    
    if (!channel.aiBot) {
      return res.status(400).json({
        success: false,
        message: 'AI bot is not invited to this channel'
      });
    }
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    // Process the message with AI in streaming mode
    try {
      const response = await aiService.processChatMessage(
        channel.workspaceId,
        userId,
        channelId,
        content,
        channel.aiBot,
        attachments || [],
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

// Process AI chat message (non-streaming)
router.post('/message', authenticate, async (req, res) => {
  try {
    const { channelId, content, attachments } = req.body;
    const userId = req.user.id;
    
    if (!channelId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Channel ID and content are required'
      });
    }
    
    // Get channel information to check if AI is invited
    const db = admin.firestore();
    const channelDoc = await db.collection('channels').doc(channelId).get();
    
    if (!channelDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }
    
    const channel = channelDoc.data();
    
    if (!channel.aiBot) {
      return res.status(400).json({
        success: false,
        message: 'AI bot is not invited to this channel'
      });
    }
    
    // Process the message with AI (now with attachments support)
    const response = await aiService.processChatMessage(
      channel.workspaceId,
      userId,
      channelId,
      content,
      channel.aiBot,
      attachments || []
    );
    
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error processing AI message:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process AI message'
    });
  }
});

// Get AI usage statistics
router.get('/usage/:workspaceId', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { startDate, endDate } = req.query;
    
    // TODO: Add permission check to ensure user has access to this workspace
    
    const stats = await aiService.getUsageStats(
      workspaceId,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage statistics'
    });
  }
});

// Get AI service health status
router.get('/health', authenticate, async (req, res) => {
  try {
    const health = await aiService.healthCheck();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error checking AI service health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check AI service health'
    });
  }
});

// Get available AI models
router.get('/models', authenticate, async (req, res) => {
  try {
    const models = {
      openai: [
        {
          id: 'gpt-5',
          name: 'GPT-5',
          description: '최신 GPT-5 플래그십 모델',
          inputPrice: 15, // per 1M tokens
          outputPrice: 60,
          recommended: true,
          supportsVision: true
        },
        {
          id: 'gpt-5-mini',
          name: 'GPT-5-mini',
          description: '경제적인 GPT-5 모델',
          inputPrice: 3,
          outputPrice: 12,
          supportsVision: true
        },
        {
          id: 'gpt-5-nano',
          name: 'GPT-5-nano',
          description: '초경량 GPT-5 모델',
          inputPrice: 0.3,
          outputPrice: 1.2,
          supportsVision: false
        },
        {
          id: 'gpt-4.1',
          name: 'GPT-4.1',
          description: '개선된 GPT-4 모델',
          inputPrice: 10,
          outputPrice: 30,
          supportsVision: true
        },
        {
          id: 'gpt-4.1-mini',
          name: 'GPT-4.1-mini',
          description: '경제적인 GPT-4.1 모델',
          inputPrice: 2.5,
          outputPrice: 10,
          supportsVision: false
        },
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          description: '최적화된 GPT-4 모델',
          inputPrice: 2.5,
          outputPrice: 10,
          supportsVision: true
        }
      ],
      anthropic: [
        {
          id: 'claude-opus-4-1-20250805',
          name: 'Claude Opus 4.1',
          description: '최신 Claude Opus 4.1 - 최고 성능',
          inputPrice: 15,
          outputPrice: 75,
          recommended: true,
          supportsVision: true
        },
        {
          id: 'claude-opus-4-20250514',
          name: 'Claude Opus 4',
          description: 'Claude Opus 4 - 강력한 성능',
          inputPrice: 15,
          outputPrice: 75,
          supportsVision: true
        },
        {
          id: 'claude-sonnet-4-20250514',
          name: 'Claude Sonnet 4',
          description: 'Claude Sonnet 4 - 균형잡힌 성능',
          inputPrice: 3,
          outputPrice: 15,
          supportsVision: true
        },
        {
          id: 'claude-3-7-sonnet-20250219',
          name: 'Claude Sonnet 3.7',
          description: 'Claude Sonnet 3.7 - 개선된 성능',
          inputPrice: 3,
          outputPrice: 15,
          supportsVision: true
        },
        {
          id: 'claude-3-5-haiku-20241022',
          name: 'Claude Haiku 3.5',
          description: 'Claude Haiku 3.5 - 빠르고 경제적',
          inputPrice: 0.8,
          outputPrice: 4,
          supportsVision: true
        }
      ]
    };
    
    res.json({
      success: true,
      data: models
    });
  } catch (error) {
    console.error('Error fetching AI models:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI models'
    });
  }
});

module.exports = router;