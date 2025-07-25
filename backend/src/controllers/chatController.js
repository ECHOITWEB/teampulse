const db = require('../utils/database');

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