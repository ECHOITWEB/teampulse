const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Demo login (for development)
router.post('/demo-login', userController.demoLogin);

// Get current user
router.get('/me', userController.getCurrentUser);

module.exports = router;