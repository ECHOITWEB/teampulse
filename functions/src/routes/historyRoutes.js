const express = require('express');
const router = express.Router();
const authenticateUser = require('../middleware/auth');
const db = require('../utils/database');

// Get chat history summary
router.get('/summary', authenticateUser, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get session count by tool type
    const sessionCounts = await db.query(`
      SELECT tool_type, COUNT(*) as count
      FROM chat_sessions
      WHERE user_id = ?
      GROUP BY tool_type
    `, [userId]);

    // Get total messages
    const [messageStats] = await db.query(`
      SELECT 
        COUNT(cm.id) as total_messages,
        SUM(cm.tokens_used) as total_tokens
      FROM chat_messages cm
      JOIN chat_sessions cs ON cm.session_id = cs.id
      WHERE cs.user_id = ?
    `, [userId]);

    // Get recent activity
    const recentSessions = await db.query(`
      SELECT 
        cs.*,
        COUNT(cm.id) as message_count
      FROM chat_sessions cs
      LEFT JOIN chat_messages cm ON cs.id = cm.session_id
      WHERE cs.user_id = ?
      GROUP BY cs.id
      ORDER BY cs.updated_at DESC
      LIMIT 5
    `, [userId]);

    res.json({
      sessionCounts,
      messageStats,
      recentSessions
    });
  } catch (error) {
    next(error);
  }
});

// Export chat history
router.get('/export', authenticateUser, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { format = 'json', sessionId } = req.query;

    let query = `
      SELECT 
        cs.id as session_id,
        cs.tool_type,
        cs.session_name,
        cs.created_at as session_created_at,
        cm.role,
        cm.content,
        cm.file_info,
        cm.created_at as message_created_at
      FROM chat_sessions cs
      JOIN chat_messages cm ON cs.id = cm.session_id
      WHERE cs.user_id = ?
    `;
    const params = [userId];

    if (sessionId) {
      query += ' AND cs.id = ?';
      params.push(sessionId);
    }

    query += ' ORDER BY cs.created_at DESC, cm.created_at ASC';

    const data = await db.query(query, params);

    if (format === 'json') {
      res.json(data);
    } else {
      // Could implement CSV export here
      res.status(400).json({ error: 'Unsupported format' });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;