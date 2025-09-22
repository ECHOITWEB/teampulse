const cors = require('cors');

// CORS configuration
const corsOptions = {
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-client-info', 
    'apikey',
    'x-firebase-locale',
    'x-firebase-client',
    'x-firebase-gmpid',
    'x-firebase-appcheck',
    'x-goog-api-client',
    'x-goog-api-key',
    'authorization',
    'firebase-instance-id-token',
    'x-firebase-client-log-type',
    'x-firebase-client-version',
    'x-client-version'
  ],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 3600
};

const corsHandler = cors(corsOptions);

// Wrapper function for Firebase Functions to handle CORS properly
function wrapWithCORS(handler) {
  return (req, res) => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      corsHandler(req, res, () => {
        res.status(204).send('');
      });
      return;
    }

    // Handle actual requests
    corsHandler(req, res, async () => {
      try {
        await handler(req, res);
      } catch (error) {
        console.error('Handler error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Internal server error',
            message: error.message
          });
        }
      }
    });
  };
}

module.exports = { wrapWithCORS, corsHandler };