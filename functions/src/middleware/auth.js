const jwt = require('jsonwebtoken');
const db = require('../utils/database');

const authenticateUser = async (req, res, next) => {
  try {
    // For development, use a demo user if no token or if using test token
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token || token === 'test-token') {
      // Use demo user for development/testing
      req.user = {
        id: 'demo-user',
        email: 'demo@teampulse.com',
        name: 'Demo User'
      };
      return next();
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

module.exports = authenticateUser;