const jwt = require('jsonwebtoken');
const db = require('../utils/database');

// Demo login for development
exports.demoLogin = async (req, res, next) => {
  try {
    // Get or create demo user
    let [user] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      ['demo@teampulse.com']
    );

    if (!user) {
      const result = await db.query(
        'INSERT INTO users (email, name) VALUES (?, ?)',
        ['demo@teampulse.com', 'Demo User']
      );
      
      [user] = await db.query(
        'SELECT * FROM users WHERE id = ?',
        [result.insertId]
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get current user
exports.getCurrentUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const [user] = await db.query(
      'SELECT id, email, name, created_at FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next(error);
  }
};