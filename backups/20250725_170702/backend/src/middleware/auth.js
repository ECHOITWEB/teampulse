const jwt = require('jsonwebtoken');
const db = require('../utils/database');

exports.authenticateUser = async (req, res, next) => {
  try {
    // For development, use a demo user if no token
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      // Auto-login as demo user for development
      const [demoUser] = await db.query(
        'SELECT * FROM users WHERE email = ?',
        ['demo@teampulse.com']
      );
      
      if (demoUser) {
        req.user = demoUser;
        return next();
      }
      
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [user] = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next(error);
  }
};