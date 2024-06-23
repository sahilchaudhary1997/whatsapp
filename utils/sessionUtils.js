const { Client, LocalAuth } = require('../node_modules/whatsapp-web.js');
const path = require('path');
const fs = require('fs');

const clients = {};

function deleteSession(phoneNumber) {
  const sessionPath = path.join(__dirname, `.wwebjs_auth/session-${phoneNumber}`);
  if (fs.existsSync(sessionPath)) {
    fs.rmdirSync(sessionPath, { recursive: true });
    console.log(`Deleted session for ${phoneNumber}`);
  } else {
    console.log(`No session found for ${phoneNumber}`);
  }
}

async function initializeClient(phoneNumber, req, res) {
  console.log(clients);
  clients[phoneNumber] = new Client({
    authStrategy: new LocalAuth({ clientId: phoneNumber }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-gpu'],
    },
  });

  clients[phoneNumber].on('ready', async () => {
    console.log(`Client for ${phoneNumber} is ready!`);
    // Rest of your code...
  });

  // Add other event listeners here...

  try {
    await clients[phoneNumber].initialize();
  } catch (err) {
    console.error('Error initializing client:', err);
    res.json({
      status: 0,
      message: 'Error initializing client.'
    });
  }
}

module.exports = {
  initializeClient,
  deleteSession,
  clients
};
