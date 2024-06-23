const express = require('express');
const router = express.Router();
const { getChats } = require('../controllers/chatController');
const authenticateToken = require('../middleware/authenticateToken');

router.get('/', authenticateToken, getChats);

module.exports = router;
