const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');

// Routes d'authentification
router.post('/auth/check-user', authController.checkUser);

// Routes de profil (protégées)
router.post('/profile/setup', 
  authMiddleware,
  upload.single('photo'),
  profileController.setupProfile
);

// Route pour récupérer le profil
router.get('/profile', 
  authMiddleware,
  profileController.getProfile
);

module.exports = router;