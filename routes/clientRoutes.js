const express = require('express');
const router = express.Router();
const path = require('path');
const {
  initializeClient,
  getUserProfile,
  clients,
  clientReady,
  clientReady_qr
} = require('../controllers/clientController');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY;

router.use(express.static("public"));

router.get('/:phoneNumber', async (req, res) => {
  const phoneNumber = req.params.phoneNumber;
  console.log(phoneNumber);
  res.sendFile(path.join(__dirname, '../public', 'index.html'), { phoneNumber });
});

router.get('/add-client/:phoneNumber', async (req, res) => {
  const loginToken = jwt.sign({ login: true }, SECRET_KEY);
  const phoneNumber = req.params.phoneNumber;
  if (clients[phoneNumber] && clientReady_qr[phoneNumber]) {
    if (clientReady[phoneNumber]) {
      res.json({
        status: 1,
        message: `Client for ${phoneNumber} is already initialized and ready.`,
        qrCodeUrl: clientReady_qr[phoneNumber],
        loginToken: loginToken
      });
    } else {
      res.json({
        status: 1,
        message: `Client for ${phoneNumber} is being initialized.`,
        qrCodeUrl: clientReady_qr[phoneNumber],
        loginToken: loginToken
      });
    }
  } else {
    let data = await initializeClient(phoneNumber, req, res);
    console.log("elseee");
    console.log(data);

  }
});

router.get('/is-client-ready/:phoneNumber', (req, res) => {
  const phoneNumber = req.params.phoneNumber;
  res.json({ ready: clientReady[phoneNumber] ? 1 : 0 });
});

router.get('/get-user-profile/:phoneNumber/:chatId', async (req, res) => {
  const phoneNumber = req.params.phoneNumber;
  const chatId = req.params.chatId;
  try {
    const profile = await getUserProfile(phoneNumber, chatId);
    console.log(profile.name);
    res.json({
      status: 1,
      message: `Profile for chat ${chatId} retrieved successfully.`,
      profile: profile
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      status: 0,
      message: `Error fetching profile for chat ${chatId}: ${error.message}`
    });
  }
});

module.exports = router;
