const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/check-user', authController.checkUser);

module.exports = router;