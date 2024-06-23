const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../controllers/authController');

router.post('/authenticate', authenticateToken);

module.exports = router;
