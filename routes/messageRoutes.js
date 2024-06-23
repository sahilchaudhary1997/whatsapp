const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getChats,
  getCommunicationChat
} = require('../controllers/messageController');

router.post('/send-message', sendMessage);

router.get('/get-chats/:phoneNumber/:limit_start?', getChats);

router.get('/communication-chat/:phoneNumber/:chat_id/:lastmessage_id?', getCommunicationChat);
module.exports = router;
