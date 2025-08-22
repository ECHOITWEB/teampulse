const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { firebaseAuth } = require('../middleware/firebaseAuth');

// Public routes
router.post('/sync', firebaseAuth, authController.syncUser);

// Protected routes
router.get('/me', firebaseAuth, authController.getCurrentUser);
router.put('/profile', firebaseAuth, authController.updateProfile);
router.delete('/account', firebaseAuth, authController.deleteAccount);

module.exports = router;