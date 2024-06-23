const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const app = express();
const url = require('url');
const WebSocket = require('ws');

// Initialize WebSocket server
const wss = new WebSocket.Server({ port: 8000 });

const clients = {};
const clientReady = {};
const clientReady_qr = {};
const SECRET_KEY = process.env.SECRET_KEY;

const activeClients = {};

wss.on('connection', (ws, req) => {
  const parsedUrl = url.parse(req.url, true);
  const phoneNumber = parsedUrl.query.phone;

  if (activeClients[phoneNumber]) {
    activeClients[phoneNumber] = activeClients[phoneNumber].filter((client) => client !== ws);
    if (activeClients[phoneNumber].length === 0) {
      delete activeClients[phoneNumber];
    }
  }

  if (!phoneNumber) {
    console.log('Invalid connection request without phone number');
    ws.terminate(); // Terminate connection if phone number is missing
    return;
  }
  ws.clientId = phoneNumber;
  // Store WebSocket connection in activeClients mapped by phone number
  if (!activeClients[phoneNumber]) {
    activeClients[phoneNumber] = [];
  }
  activeClients[phoneNumber].push(ws);

  console.log(`Client connected with phone number ${phoneNumber}`);


  ws.on('close', () => {
    console.log(`Client with phone number ${phoneNumber} disconnected`);
    // Remove WebSocket connection from activeClients
    if (activeClients[phoneNumber]) {
      activeClients[phoneNumber] = activeClients[phoneNumber].filter((client) => client !== ws);
      if (activeClients[phoneNumber].length === 0) {
        delete activeClients[phoneNumber];
      }
    }
  });
});



function deleteSession(phoneNumber) {
  const sessionPath = path.join(__dirname, `.wwebjs_auth/session-${phoneNumber}`);
  if (fs.existsSync(sessionPath)) {
    fs.rmdirSync(sessionPath, { recursive: true });
    console.log(`Deleted session for ${phoneNumber}`);
  } else {
    console.log(`No session found for ${phoneNumber}`);
  }
}

// const initializeClient = async (phoneNumber, req, res) => {
//   // Ensure that res.json is called only once
//   let responseSent = false;

//   const sendResponse = (response) => {
//     if (!responseSent) {
//       responseSent = true;
//       res.json(response);
//     }
//   };

//   clients[phoneNumber] = new Client({
//     authStrategy: new LocalAuth({ clientId: phoneNumber }),
//     puppeteer: {
//       headless: true,
//       args: ['--no-sandbox', '--disable-gpu'],
//     },
//     webVersionCache: {
//       type: 'remote',
//       remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
//     }
//   });



//   clients[phoneNumber].on('ready', async () => {
//     console.log(`Client for ${phoneNumber} is ready!`);
//     clientReady[phoneNumber] = true;

//     const userInfo = clients[phoneNumber].info;
//     const trimmedPhoneNumber = phoneNumber.trim().slice(-10);
//     const userPhoneNumber = userInfo.me.user.slice(-10);
//     const loginToken = jwt.sign({ login: true }, SECRET_KEY);

//     if (userPhoneNumber !== trimmedPhoneNumber) {
//       await clients[phoneNumber].logout();
//       deleteSession(phoneNumber);
//       delete clients[phoneNumber];
//       delete clientReady[phoneNumber];
//       delete clientReady_qr[phoneNumber];
//       sendResponse({
//         status: 0,
//         message: 'Invalid Client',
//         invalid: 1
//       });
//     } else {
//       sendResponse({
//         status: 1,
//         message: `Client for ${phoneNumber} is ready!`,
//         loginToken: loginToken,
//         user_info: {
//           id: userInfo.wid._serialized,
//           name: userInfo.pushname,
//           phone: userInfo.me.user
//         }
//       });
//     }
//   });

//   await clients[phoneNumber].on('qr', async (qr) => {
//     console.log("qr");
//     const qrImageUrl = await qrcode.toDataURL(qr);
//     clientReady_qr[phoneNumber] = qrImageUrl;
//     sendResponse({
//       status: 1,
//       message: `Client for ${phoneNumber} is being initialized.`,
//       qrCodeUrl: qrImageUrl
//     });
//   });

//   clients[phoneNumber].on('auth_failure', (msg) => {
//     sendResponse({
//       status: 0,
//       message: `Authentication failed for ${phoneNumber}: ${msg}`
//     });
//   });

//   clients[phoneNumber].on('disconnected', async (reason) => {
//     await clients[phoneNumber].logout();
//     deleteSession(phoneNumber);
//     delete clients[phoneNumber];
//     delete clientReady[phoneNumber];
//     delete clientReady_qr[phoneNumber];
//     sendResponse({
//       status: 0,
//       message: `Client for ${phoneNumber} disconnected: ${reason}`
//     });
//   });

//   clients[phoneNumber].on('message_create', async (message) => {
//     wss.clients.forEach(async (client) => {
//       if (client.readyState === WebSocket.OPEN && client.clientId.slice(-10) === phoneNumber.slice(-10)) {
//         console.log(message);
//         if (message && message.hasMedia) {
//           const mediaUrl = await message.downloadMedia();
//           message.mediaData = mediaUrl;
//         }
//         console.log("message");
//         client.send(JSON.stringify(message));
//         return;
//       }
//     });
//   });

//   if (!clients[phoneNumber]) {
//     sendResponse({
//       status: 0,
//       message: `Failed to initialize client for ${phoneNumber}.`
//     });
//   } else {
//     const loginToken = jwt.sign({ login: true }, SECRET_KEY);
//     console.log(clientReady_qr);
//     sendResponse({
//       status: 1,
//       message: `Client for ${phoneNumber} is being initialized.`,
//       qrCodeUrl: clientReady_qr[phoneNumber],
//       loginToken: loginToken
//     });
//   }

//   await clients[phoneNumber].initialize();



// };

const initializeClient = (phoneNumber) => {
  return new Promise((resolve, reject) => {
    let responseSent = false;

    const sendResponse = (response) => {
      if (!responseSent) {
        responseSent = true;
        resolve(response);
      }
    };

    clients[phoneNumber] = new Client({
      authStrategy: new LocalAuth({ clientId: phoneNumber }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-gpu'],
      },
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
      }
    });

    clients[phoneNumber].on('ready', async () => {
      console.log(`Client for ${phoneNumber} is ready!`);
      clientReady[phoneNumber] = true;

      const userInfo = clients[phoneNumber].info;
      const trimmedPhoneNumber = phoneNumber.trim().slice(-10);
      const userPhoneNumber = userInfo.me.user.slice(-10);
      const loginToken = jwt.sign({ login: true }, SECRET_KEY);

      if (userPhoneNumber !== trimmedPhoneNumber) {
        await clients[phoneNumber].logout();
        delete clients[phoneNumber];
        delete clientReady[phoneNumber];
        delete clientReady_qr[phoneNumber];
        sendResponse({
          status: 0,
          message: 'Invalid Client',
          invalid: 1
        });
      } else {
        sendResponse({
          status: 1,
          message: `Client for ${phoneNumber} is ready!`,
          loginToken: loginToken,
          user_info: {
            id: userInfo.wid._serialized,
            name: userInfo.pushname,
            phone: userInfo.me.user
          }
        });
      }
    });

    clients[phoneNumber].on('qr', async (qr) => {
      console.log("QR received");
      const qrImageUrl = await qrcode.toDataURL(qr);
      clientReady_qr[phoneNumber] = qrImageUrl;
      sendResponse({
        status: 1,
        message: `Client for ${phoneNumber} is being initialized.`,
        qrCodeUrl: qrImageUrl
      });
    });

    clients[phoneNumber].on('auth_failure', (msg) => {
      sendResponse({
        status: 0,
        message: `Authentication failed for ${phoneNumber}: ${msg}`
      });
    });

    clients[phoneNumber].on('disconnected', async (reason) => {
      await clients[phoneNumber].logout();
      delete clients[phoneNumber];
      delete clientReady[phoneNumber];
      delete clientReady_qr[phoneNumber];
      sendResponse({
        status: 0,
        message: `Client for ${phoneNumber} disconnected: ${reason}`
      });
    });

    clients[phoneNumber].on('message_create', async (message) => {
      wss.clients.forEach(async (client) => {
        if (client.readyState === WebSocket.OPEN && client.clientId.slice(-10) === phoneNumber.slice(-10)) {
          console.log(message);
          if (message && message.hasMedia) {
            const mediaUrl = await message.downloadMedia();
            message.mediaData = mediaUrl;
          }
          client.send(JSON.stringify(message));
        }
      });
    });

    clients[phoneNumber].initialize()
      .then(() => {
        // Initializing the client succeeded
        print_r(clients);
      })
      .catch((err) => {
        reject(err);
      });
  });
};



const getUserProfile = async (phoneNumber, chatId) => {
  if (!clients[phoneNumber] || !clientReady[phoneNumber]) {
    throw new Error(`Client for ${phoneNumber} is not ready.`);
  }

  const chat = await clients[phoneNumber].getChatById(chatId);
  const profilePicUrl = await clients[phoneNumber].getProfilePicUrl(chatId);

  return {
    id: chat.id._serialized,
    name: chat.name || chat.formattedTitle,
    profilePicUrl: profilePicUrl,
    isGroup: chat.isGroup
  };
};



// function sendWebSocketAlert(phoneNumber,type, data) {
//   wss.clients.forEach((client) => {
//     if (client.readyState === WebSocket.OPEN) {
//       client.send(JSON.stringify({ type, data }));
//     }
//   });
// }

module.exports = {
  initializeClient,
  deleteSession,
  getUserProfile,
  clients,
  clientReady,
  clientReady_qr
};
