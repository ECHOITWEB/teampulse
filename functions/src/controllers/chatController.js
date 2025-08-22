const db = require('../utils/database');
const aiService = require('../services/aiService');

// Create new chat session
exports.createSession = async (req, res, next) => {
  try {
    const { tool_type, session_name } = req.body;
    const userId = req.user.id;

    const result = await db.query(
      'INSERT INTO chat_sessions (user_id, tool_type, session_name) VALUES (?, ?, ?)',
      [userId, tool_type, session_name || `New ${tool_type} Session`]
    );

    res.status(201).json({
      id: result.insertId,
      user_id: userId,
      tool_type,
      session_name: session_name || `New ${tool_type} Session`,
      created_at: new Date()
    });
  } catch (error) {
    next(error);
  }
};

// Get user's chat sessions
exports.getSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { tool_type, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT 
        cs.*,
        COUNT(cm.id) as message_count,
        MAX(cm.created_at) as last_message_at
      FROM chat_sessions cs
      LEFT JOIN chat_messages cm ON cs.id = cm.session_id
      WHERE cs.user_id = ?
    `;
    const params = [userId];

    if (tool_type) {
      query += ' AND cs.tool_type = ?';
      params.push(tool_type);
    }

    query += ' GROUP BY cs.id, cs.user_id, cs.tool_type, cs.session_name, cs.created_at, cs.updated_at ORDER BY cs.updated_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const sessions = await db.query(query, params);
    res.json({ sessions });
  } catch (error) {
    next(error);
  }
};

// Get messages for a specific session
exports.getSessionMessages = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Verify session belongs to user
    const [session] = await db.query(
      'SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get messages
    const messages = await db.query(
      'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId]
    );

    res.json({
      session,
      messages
    });
  } catch (error) {
    next(error);
  }
};

// Send message to session
exports.sendMessage = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { role, content, file_info, tokens_used = 0 } = req.body;
    const userId = req.user.id;

    // Verify session belongs to user
    const [session] = await db.query(
      'SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Insert message
    const result = await db.query(
      'INSERT INTO chat_messages (session_id, role, content, file_info, tokens_used) VALUES (?, ?, ?, ?, ?)',
      [sessionId, role, content, file_info ? JSON.stringify(file_info) : null, tokens_used]
    );

    // Update session's updated_at
    await db.query(
      'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [sessionId]
    );

    // Track API usage if assistant message
    if (role === 'assistant' && tokens_used > 0) {
      await db.query(
        'INSERT INTO api_usage (user_id, api_type, tokens_used, cost_estimate) VALUES (?, ?, ?, ?)',
        [userId, 'chat_completion', tokens_used, tokens_used * 0.00002] // Rough estimate
      );
    }

    res.status(201).json({
      id: result.insertId,
      session_id: sessionId,
      role,
      content,
      file_info,
      tokens_used,
      created_at: new Date()
    });
  } catch (error) {
    next(error);
  }
};

// Delete session
exports.deleteSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const result = await db.query(
      'DELETE FROM chat_sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Update session name
exports.updateSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { session_name } = req.body;
    const userId = req.user.id;

    const result = await db.query(
      'UPDATE chat_sessions SET session_name = ? WHERE id = ? AND user_id = ?',
      [session_name, sessionId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session updated successfully' });
  } catch (error) {
    next(error);
  }
};

// Process AI request with multimodal and streaming support
exports.processAIRequest = async (req, res, next) => {
  try {
    const { command, prompt, model, attachments, context, loadingMessageId, streaming = false } = req.body;
    const userId = req.user.id;
    const workspaceId = req.user.workspace_id || 'default';
    
    // Import admin for Firestore operations
    const admin = require('firebase-admin');

    // Prepare messages for AI
    const messages = [];
    
    // Add context messages if provided
    if (context && Array.isArray(context)) {
      messages.push(...context);
    }
    
    // Prepare user message with multimodal content
    const userMessage = { role: 'user', content: [] };
    
    // Add text prompt
    if (prompt) {
      userMessage.content.push({
        type: 'text',
        text: prompt
      });
    }
    
    // Process attachments for multimodal analysis
    if (attachments && Array.isArray(attachments)) {
      for (const attachment of attachments) {
        if (attachment.type === 'image' && attachment.data) {
          // Add image to message
          userMessage.content.push({
            type: 'image_url',
            image_url: {
              url: attachment.data,
              detail: 'high'
            }
          });
        } else if (attachment.type === 'text' && attachment.data) {
          // Add text content from files
          userMessage.content.push({
            type: 'text',
            text: `File: ${attachment.name}\n\n${attachment.data}`
          });
        } else if (attachment.type === 'pdf' && attachment.data) {
          // PDF files with base64 data - Claude can process these
          if (attachment.data.startsWith('data:application/pdf;base64,')) {
            // Claude supports PDF as base64 image_url
            userMessage.content.push({
              type: 'image_url',
              image_url: {
                url: attachment.data,
                detail: 'high'
              }
            });
          } else {
            // Fallback for text description
            userMessage.content.push({
              type: 'text',
              text: `PDF file: ${attachment.name}\n\nPDF 파일이 첨부되었습니다. 내용을 분석하려면 텍스트 추출이 필요합니다.`
            });
          }
        } else if ((attachment.type === 'file' || attachment.type === 'pdf') && !attachment.data) {
          // Files without data - just provide info
          userMessage.content.push({
            type: 'text',
            text: `File: ${attachment.name} (${attachment.mimeType || 'unknown type'})\n\n파일이 첨부되었습니다.`
          });
        }
      }
    }
    
    // If only text content, simplify message format
    if (userMessage.content.length === 1 && userMessage.content[0].type === 'text') {
      userMessage.content = userMessage.content[0].text;
    }
    
    messages.push(userMessage);
    
    // Handle different commands
    let systemPrompt = '';
    let options = {};
    
    switch (command) {
      case 'ai':
        systemPrompt = 'You are a helpful AI assistant. Answer questions accurately and helpfully.';
        break;
      case 'analyze':
        systemPrompt = 'You are an expert at analyzing files and documents. Provide detailed analysis and summaries of the provided content.';
        break;
      case 'search':
        systemPrompt = 'You are a web search assistant. Help users find information on the web.';
        options.enableWebSearch = true;
        break;
      case 'code':
        systemPrompt = 'You are a code execution and testing assistant. Help users with code-related tasks.';
        options.enableCodeInterpreter = true;
        break;
      case 'generate':
        systemPrompt = 'You are a content generation specialist. Help users create documents, code, emails, and other content.';
        break;
      default:
        systemPrompt = 'You are a helpful AI assistant.';
    }
    
    // Add system prompt
    messages.unshift({ role: 'system', content: systemPrompt });
    
    // Check if model supports multimodal
    const hasMultimodalContent = attachments && attachments.some(a => a.type === 'image');
    const multimodalModels = [
      'gpt-4o', 'gpt-4.1', 'gpt-5', 'gpt-5-mini',
      'claude-opus-4-1-20250805', 'claude-opus-4-20250514',
      'claude-sonnet-4-20250514', 'claude-3-7-sonnet-20250219',
      'claude-3-5-haiku-20241022'
    ];
    
    const isMultimodalModel = multimodalModels.some(m => 
      model.toLowerCase().includes(m.toLowerCase())
    );
    
    if (hasMultimodalContent && !isMultimodalModel) {
      return res.status(400).json({
        error: 'Selected model does not support multimodal content',
        suggestedModels: ['gpt-4o', 'gpt-5', 'claude-opus-4-1-20250805']
      });
    }
    
    // Handle streaming if requested
    if (streaming) {
      // Set up SSE (Server-Sent Events) for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      let accumulatedContent = '';
      
      // Streaming callback
      options.stream = true;
      options.onStream = async (chunk) => {
        accumulatedContent = chunk.accumulated || accumulatedContent + chunk.content;
        
        // Send chunk to client
        res.write(`data: ${JSON.stringify({
          type: 'chunk',
          content: chunk.content,
          accumulated: accumulatedContent
        })}\n\n`);
      };
      
      // Process with appropriate AI service
      let response;
      if (model.includes('claude')) {
        response = await aiService.processAnthropicMessage(
          workspaceId,
          model,
          messages,
          userId,
          options
        );
      } else {
        response = await aiService.processOpenAIMessage(
          workspaceId,
          model,
          messages,
          userId,
          options
        );
      }
      
      // Delete loading message if ID was provided
      if (loadingMessageId) {
        try {
          const db = admin.firestore();
          await db.collection('messages').doc(loadingMessageId).delete();
          console.log(`Deleted loading message: ${loadingMessageId}`);
        } catch (deleteError) {
          console.error('Error deleting loading message:', deleteError);
        }
      }
      
      // Send final message
      res.write(`data: ${JSON.stringify({
        type: 'done',
        content: response.content,
        tokensUsed: response.usage?.totalTokens || 0,
        model: model
      })}\n\n`);
      
      res.end();
    } else {
      // Non-streaming response
      let response;
      if (model.includes('claude')) {
        response = await aiService.processAnthropicMessage(
          workspaceId,
          model,
          messages,
          userId,
          options
        );
      } else {
        response = await aiService.processOpenAIMessage(
          workspaceId,
          model,
          messages,
          userId,
          options
        );
      }
    
      // Delete loading message if ID was provided
      if (loadingMessageId) {
        try {
          const db = admin.firestore();
          await db.collection('messages').doc(loadingMessageId).delete();
          console.log(`Deleted loading message: ${loadingMessageId}`);
        } catch (deleteError) {
          console.error('Error deleting loading message:', deleteError);
          // Continue even if deletion fails
        }
      }
      
      res.json({
        data: {
          content: response.content,
          tokensUsed: response.usage?.totalTokens || 0,
          model: model
        }
      });
    }
  } catch (error) {
    console.error('AI request error:', error);
    
    // Delete loading message on error too
    if (req.body.loadingMessageId) {
      try {
        const admin = require('firebase-admin');
        const db = admin.firestore();
        await db.collection('messages').doc(req.body.loadingMessageId).delete();
      } catch (deleteError) {
        console.error('Error deleting loading message on error:', deleteError);
      }
    }
    
    next(error);
  }
};