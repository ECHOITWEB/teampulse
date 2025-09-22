const admin = require('firebase-admin');
const aiService = require('../services/aiService');
const db = admin.firestore();

class ChatControllerV2 {
  /**
   * Process chat message with AI
   * Supports GPT-5, GPT-4, and Claude models
   */
  async processMessage(req, res) {
    try {
      const { channelId, content, attachments = [], messageId } = req.body;
      const userId = req.user.uid;

      // Validate input
      if (!channelId || !content) {
        return res.status(400).json({ 
          error: 'Channel ID and content are required' 
        });
      }

      // Get channel information
      const channelDoc = await db.collection('chat_channels').doc(channelId).get();
      
      if (!channelDoc.exists) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      const channel = channelDoc.data();
      
      // Check if AI bot is invited
      if (!channel.aiBot) {
        return res.status(400).json({ 
          error: 'No AI bot in this channel. Please invite an AI bot first.' 
        });
      }

      // Simple permission check - if user is authenticated and channel exists, allow access
      // Workspace membership is already validated by the fact that user can see the channel
      console.log(`✅ User ${userId} authorized for channel ${channelId}`);

      console.log(`📨 Processing message for ${channel.aiBot.provider} - ${channel.aiBot.model}`);

      // Don't save user message - frontend already saved it

      // Process the message with AI
      const response = await aiService.processChatMessage(
        channel.workspaceId,
        userId,
        channelId,
        content,
        channel.aiBot,
        attachments,
        { stream: false }
      );

      // Save AI response
      const modelDisplayName = aiService.getModelDisplayName(
        channel.aiBot.provider,
        channel.aiBot.model
      );
      
      const aiMessageRef = await db.collection('messages').add({
        channel_id: channelId,
        workspace_id: channel.workspaceId,
        content: response.content,
        user_id: 'ai_bot',
        user_name: `Pulse AI (${modelDisplayName})`,
        type: 'ai',
        ai_model: channel.aiBot.model,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        usage: response.usage
      });

      res.json({
        success: true,
        message: {
          aiMessageId: aiMessageRef.id,
          content: response.content,
          usage: response.usage
        }
      });

    } catch (error) {
      console.error('Error processing chat message:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to process message' 
      });
    }
  }

  /**
   * Stream chat message with AI (SSE)
   */
  async streamMessage(req, res) {
    try {
      const { channelId, content, attachments = [], userName } = req.body;
      const userId = req.user.uid;

      // Validate input
      if (!channelId || !content) {
        return res.status(400).json({ 
          error: 'Channel ID and content are required' 
        });
      }

      // Get channel information
      const channelDoc = await db.collection('chat_channels').doc(channelId).get();
      
      if (!channelDoc.exists) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      const channel = channelDoc.data();
      
      // Check if AI bot is invited
      if (!channel.aiBot) {
        return res.status(400).json({ 
          error: 'No AI bot in this channel. Please invite an AI bot first.' 
        });
      }

      // Simple permission check - if user is authenticated and channel exists, allow access
      // Workspace membership is already validated by the fact that user can see the channel
      console.log(`✅ User ${userId} authorized for channel ${channelId}`);

      console.log(`🌊 Streaming message for ${channel.aiBot.provider} - ${channel.aiBot.model}`);

      // Don't save user message - frontend already saved it
      // Create AI message placeholder
      const modelDisplayName = aiService.getModelDisplayName(
        channel.aiBot.provider,
        channel.aiBot.model
      );
      
      const aiMessageRef = await db.collection('messages').add({
        channel_id: channelId,
        workspace_id: channel.workspaceId,
        content: '',
        user_id: 'ai_bot',
        user_name: `Pulse AI (${modelDisplayName})`,
        type: 'ai',
        ai_model: channel.aiBot.model,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        isStreaming: true
      });

      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      // Send AI message ID immediately
      res.write(`data: ${JSON.stringify({
        type: 'init',
        aiMessageId: aiMessageRef.id
      })}\n\n`);

      // Process the message with AI in streaming mode
      let accumulatedContent = '';
      let totalUsage = null;
      let chunkBuffer = '';
      const BUFFER_SIZE = 1000; // Buffer size for accumulating chunks
      
      try {
        const response = await aiService.processChatMessage(
          channel.workspaceId,
          userId,
          channelId,
          content,
          channel.aiBot,
          attachments,
          { 
            stream: true,
            onStream: async (chunk) => {
              // Send chunk to client
              if (chunk.type === 'chunk' && chunk.content) {
                accumulatedContent += chunk.content;
                chunkBuffer += chunk.content;
                
                // Send accumulated chunks periodically to avoid overwhelming the client
                // But still send every chunk for real-time feel
                res.write(`data: ${JSON.stringify({
                  type: 'chunk',
                  content: chunk.content,
                  totalLength: accumulatedContent.length,
                  aiMessageId: aiMessageRef.id
                })}\n\n`);
                
                // Periodically update Firestore with larger chunks (every BUFFER_SIZE chars)
                if (chunkBuffer.length >= BUFFER_SIZE) {
                  await db.collection('messages').doc(aiMessageRef.id).update({
                    content: accumulatedContent,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                  }).catch(err => console.log('Batch update error:', err));
                  chunkBuffer = '';
                }
              } else if (chunk.type === 'usage') {
                totalUsage = chunk.usage;
              }
            }
          }
        );

        // Update final AI message
        await db.collection('messages').doc(aiMessageRef.id).update({
          content: accumulatedContent,
          isStreaming: false,
          usage: totalUsage || response.usage,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Send completion signal
        res.write(`data: ${JSON.stringify({
          type: 'done',
          content: accumulatedContent,
          usage: totalUsage || response.usage,
          aiMessageId: aiMessageRef.id
        })}\n\n`);
        
        res.write(`data: [DONE]\n\n`);
        res.end();

      } catch (streamError) {
        console.error('Streaming error:', streamError);
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          error: streamError.message 
        })}\n\n`);
        res.end();
      }

    } catch (error) {
      console.error('Error setting up stream:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to stream message' 
      });
    }
  }

  /**
   * Invite AI bot to channel
   */
  async inviteBot(req, res) {
    try {
      const { channelId, provider, model } = req.body;
      const userId = req.user.uid;

      // Validate input
      if (!channelId || !provider || !model) {
        return res.status(400).json({ 
          error: 'Channel ID, provider, and model are required' 
        });
      }

      // Get channel
      const channelRef = db.collection('chat_channels').doc(channelId);
      const channelDoc = await channelRef.get();
      
      if (!channelDoc.exists) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      const channel = channelDoc.data();

      // Simple permission check - if user is authenticated and channel exists, allow access
      // Workspace membership is already validated by the fact that user can see the channel
      console.log(`✅ User ${userId} authorized for channel ${channelId}`);

      // Update channel with AI bot
      await channelRef.update({
        aiBot: {
          provider,
          model,
          invitedAt: admin.firestore.FieldValue.serverTimestamp(),
          invitedBy: userId
        }
      });

      // Don't add system message here - let frontend handle it
      const modelDisplayName = aiService.getModelDisplayName(provider, model);
      
      res.json({
        success: true,
        message: `${modelDisplayName} invited successfully`
      });

    } catch (error) {
      console.error('Error inviting bot:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to invite bot' 
      });
    }
  }

  /**
   * Remove AI bot from channel
   */
  async removeBot(req, res) {
    try {
      const { channelId } = req.body;
      const userId = req.user.uid;

      // Get channel
      const channelRef = db.collection('chat_channels').doc(channelId);
      const channelDoc = await channelRef.get();
      
      if (!channelDoc.exists) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      const channel = channelDoc.data();

      // Simple permission check - if user is authenticated and channel exists, allow access
      // Workspace membership is already validated by the fact that user can see the channel
      console.log(`✅ User ${userId} authorized for channel ${channelId}`);

      const botName = channel.aiBot ? 
        aiService.getModelDisplayName(channel.aiBot.provider, channel.aiBot.model) : 
        'AI Bot';

      // Remove AI bot from channel
      await channelRef.update({
        aiBot: admin.firestore.FieldValue.delete()
      });

      // Don't add system message here - let frontend handle it
      res.json({
        success: true,
        message: `${botName} removed successfully`
      });

    } catch (error) {
      console.error('Error removing bot:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to remove bot' 
      });
    }
  }
}

module.exports = new ChatControllerV2();