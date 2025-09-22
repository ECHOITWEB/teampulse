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
    const channelDoc = await db.collection('chat_channels').doc(channelId).get();
    
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
      let accumulatedContent = '';
      
      const response = await aiService.processChatMessage(
        channel.workspaceId,
        userId,
        channelId,
        content,
        channel.aiBot,
        attachments || [],
        { 
          stream: true,
          onStream: async (chunk) => {
            // Send chunk to client
            if (chunk.type === 'chunk') {
              accumulatedContent += chunk.content;
              res.write(`data: ${JSON.stringify({
                type: 'chunk',
                content: chunk.content,
                accumulated: accumulatedContent
              })}\n\n`);
            }
          }
        }
      );
      
      // Send completion signal
      res.write(`data: ${JSON.stringify({
        type: 'done',
        content: accumulatedContent,
        usage: response.usage
      })}\n\n`);
      
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error) {
      console.error('Streaming error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
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
    const channelDoc = await db.collection('chat_channels').doc(channelId).get();
    
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

// OKR AI Analysis endpoint
router.post('/okr/analyze', authenticate, async (req, res) => {
  console.log('🎯 [OKR Analysis] Request received');
  
  try {
    const { objective, keyResults, workspaceId } = req.body;
    const userId = req.user.id;
    
    if (!objective || !keyResults || !Array.isArray(keyResults)) {
      return res.status(400).json({
        success: false,
        message: 'Objective and key results are required'
      });
    }
    
    console.log('📊 [OKR Analysis] Processing OKR:', {
      objectiveTitle: objective.title,
      keyResultsCount: keyResults.length,
      workspaceId
    });
    
    // Prepare context for AI analysis
    const okrContext = `
      Analyze this OKR and provide insights:
      
      Objective: ${objective.title}
      Description: ${objective.description || 'No description'}
      Type: ${objective.type}
      Current Progress: ${objective.progress}%
      Quarter: ${objective.quarter} ${objective.year}
      
      Key Results:
      ${keyResults.map((kr, index) => `
      ${index + 1}. ${kr.title}
         - Target: ${kr.targetValue} ${kr.unit}
         - Current: ${kr.currentValue} ${kr.unit}
         - Progress: ${kr.progress}%
         - Owner: ${kr.ownerName || 'Unassigned'}
      `).join('\n')}
      
      Provide:
      1. Overall assessment of the OKR progress
      2. Specific recommendations for each key result
      3. Risk analysis and potential blockers
      4. Predicted completion likelihood
      5. Action items to improve performance
      
      Format the response as structured insights suitable for business leaders.
    `;
    
    // Call AI service for analysis
    const messages = [
      {
        role: 'system',
        content: 'You are an expert OKR analyst and business strategist. Provide actionable insights based on OKR data.'
      },
      {
        role: 'user',
        content: okrContext
      }
    ];
    
    const response = await aiService.processDirectMessage(
      workspaceId || 'default',
      messages,
      'gpt-4o',
      'openai'
    );
    
    // Parse AI response into structured insights
    const insights = [];
    const lines = response.content.split('\n').filter(line => line.trim());
    
    // Extract key insights from the response
    let currentInsight = null;
    lines.forEach(line => {
      if (line.match(/^\d+\.|^•|^-/)) {
        if (currentInsight) {
          insights.push(currentInsight);
        }
        currentInsight = {
          id: Date.now().toString() + Math.random(),
          type: determineInsightType(line),
          title: extractTitle(line),
          description: line.replace(/^\d+\.|^•|^-/, '').trim(),
          priority: determinePriority(line),
          confidence: 85 + Math.floor(Math.random() * 15)
        };
      } else if (currentInsight && line.trim()) {
        currentInsight.description += ' ' + line.trim();
      }
    });
    
    if (currentInsight) {
      insights.push(currentInsight);
    }
    
    // Add completion prediction
    const completionPrediction = calculateCompletionPrediction(objective, keyResults);
    insights.unshift({
      id: 'prediction-' + Date.now(),
      type: 'prediction',
      title: 'Completion Prediction',
      description: `Based on current velocity, this objective has a ${completionPrediction}% chance of completion by end of ${objective.quarter} ${objective.year}.`,
      priority: 'high',
      confidence: 90
    });
    
    console.log('✅ [OKR Analysis] Analysis complete:', {
      insightsCount: insights.length,
      responseLength: response.content.length
    });
    
    res.json({
      success: true,
      data: {
        insights,
        rawAnalysis: response.content,
        metadata: {
          analyzedAt: new Date().toISOString(),
          model: 'gpt-4o',
          objectiveId: objective.id
        }
      }
    });
  } catch (error) {
    console.error('❌ [OKR Analysis] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to analyze OKR'
    });
  }
});

// Helper functions for OKR analysis
function determineInsightType(text) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('risk') || lowerText.includes('concern')) return 'risk';
  if (lowerText.includes('recommend') || lowerText.includes('suggest')) return 'recommendation';
  if (lowerText.includes('trend') || lowerText.includes('progress')) return 'trend';
  if (lowerText.includes('action') || lowerText.includes('do')) return 'action';
  return 'observation';
}

function extractTitle(text) {
  const cleanText = text.replace(/^\d+\.|^•|^-/, '').trim();
  const words = cleanText.split(' ').slice(0, 5).join(' ');
  return words.length > 50 ? words.substring(0, 47) + '...' : words;
}

function determinePriority(text) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('critical') || lowerText.includes('urgent') || lowerText.includes('immediately')) return 'critical';
  if (lowerText.includes('important') || lowerText.includes('should') || lowerText.includes('risk')) return 'high';
  if (lowerText.includes('consider') || lowerText.includes('may') || lowerText.includes('could')) return 'medium';
  return 'low';
}

function calculateCompletionPrediction(objective, keyResults) {
  const currentProgress = objective.progress || 0;
  const avgKRProgress = keyResults.reduce((sum, kr) => sum + (kr.progress || 0), 0) / keyResults.length;
  
  // Simple prediction based on current progress and time remaining
  const today = new Date();
  const quarterEnd = getQuarterEndDate(objective.quarter, objective.year);
  const totalDays = Math.floor((quarterEnd - getQuarterStartDate(objective.quarter, objective.year)) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.floor((today - getQuarterStartDate(objective.quarter, objective.year)) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.floor((quarterEnd - today) / (1000 * 60 * 60 * 24));
  
  const timeProgress = (daysElapsed / totalDays) * 100;
  const velocityFactor = avgKRProgress / timeProgress;
  
  let prediction = avgKRProgress + (velocityFactor * (daysRemaining / totalDays) * 100);
  prediction = Math.min(100, Math.max(0, prediction));
  
  return Math.round(prediction);
}

function getQuarterStartDate(quarter, year) {
  const quarterMonths = { 'Q1': 0, 'Q2': 3, 'Q3': 6, 'Q4': 9 };
  return new Date(year, quarterMonths[quarter], 1);
}

function getQuarterEndDate(quarter, year) {
  const quarterMonths = { 'Q1': 2, 'Q2': 5, 'Q3': 8, 'Q4': 11 };
  const month = quarterMonths[quarter];
  return new Date(year, month + 1, 0); // Last day of the quarter
}

// Direct AI chat endpoint (for /chat/ai compatibility)
router.post('/', authenticate, async (req, res) => {
  console.log('🎯 [AI Route] POST /chat/ai endpoint called');
  console.log('📦 [AI Route] Request body:', {
    hasMessages: !!req.body.messages,
    messageCount: req.body.messages?.length,
    model: req.body.model,
    channelId: req.body.channelId,
    workspaceId: req.body.workspaceId
  });
  
  try {
    const { 
      messages, 
      model = 'gpt-4o', 
      channelId,
      workspaceId 
    } = req.body;
    
    const userId = req.user.id;
    console.log('👤 [AI Route] User ID:', userId);
    
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
      const channelDoc = await db.collection('chat_channels').doc(channelId).get();
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
    console.log('🤖 [AI Route] Provider:', provider, 'Model:', model);
    
    // Process with AI service
    console.log('🔄 [AI Route] Calling AI service...');
    const response = await aiService.processDirectMessage(
      finalWorkspaceId,
      messages,
      model,
      provider
    );
    console.log('✅ [AI Route] AI response received:', {
      hasContent: !!response?.content,
      contentLength: response?.content?.length
    });
    
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

module.exports = router;