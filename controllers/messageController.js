const { MessageMedia } = require('whatsapp-web.js');
const fetch = require('node-fetch');
const path = require('path');

const { clients, clientReady } = require('./clientController');

const sendMessage = async (req, res) => {
  const { phoneNumber, contact, message, mediaUrls, mediaFiles } = req.body;
  if (!phoneNumber || !contact || (!message && !mediaFiles && !mediaUrls)) {
    return res.status(400).json({
      status: 0,
      message: 'Invalid parameters. Please provide phone number, contact, and at least one of message, media, or mediaUrl.'
    });
  }

  try {
    const sanitizedNumber = contact.replace(/[- )(]/g, '');
    const finalNumber = `91${sanitizedNumber.slice(-10)}`;

    const numberDetails = await clients[phoneNumber].getNumberId(finalNumber);
    if (!numberDetails) {
      return res.status(404).json({
        status: 0,
        message: `Mobile number ${contact} is not registered on WhatsApp.`
      });
    }

    let mediaMessages = [];
    if (mediaUrls) {
      const mediaUrlList = JSON.parse(mediaUrls);
      for (const mediaUrl of mediaUrlList) {
        const response = await fetch(mediaUrl);
        const buffer = await response.buffer();
        const base64 = buffer.toString('base64');
        const mimeType = response.headers.get('content-type');
        const filename = path.basename(mediaUrl);

        mediaMessages.push(new MessageMedia(mimeType, base64, filename));
      }
    }

    if (mediaFiles) {
      try {
        let mediaFilesArray = JSON.parse(mediaFiles, true);
        if (Array.isArray(mediaFilesArray) && mediaFilesArray.length > 0) {
          for (let i = 0; i < mediaFilesArray.length; i++) {
            let file = mediaFilesArray[i];
            if (file) {
              mediaMessages.push(new MessageMedia(file.type, file.base64, file.name, file.size));
            }
          }
        }
      } catch (error) {
        console.error('Error parsing media files JSON:', error);
        return res.status(400).json({
          status: 0,
          message: 'Invalid media files format.'
        });
      }
    }

    for (const media of mediaMessages) {
      await clients[phoneNumber].sendMessage(numberDetails._serialized, media, { caption: message });
    }

    if (mediaMessages.length === 0) {
      await clients[phoneNumber].sendMessage(numberDetails._serialized, message);
    }

    return res.json({
      status: 1,
      message: `Message sent to ${contact} successfully.`
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({
      status: 0,
      message: `Error sending message: ${error.message}`
    });
  }
};

const getChats = async (req, res) => {
  const phoneNumber = req.params.phoneNumber;
  const limit_start = req.params.limit_start ? parseInt(req.params.limit_start) : 0;

  if (!clients[phoneNumber] || !clientReady[phoneNumber]) {
    return res.json({
      status: 0,
      message: `Client for ${phoneNumber} is not ready.`
    });
  }



  try {
    const chats = await clients[phoneNumber].getChats();
    const limit_chat = chats.slice(limit_start, limit_start + 10);
    const chatPromises = limit_chat.map(async (chat) => ({
      id: chat.id._serialized,
      name: chat.name || chat.formattedTitle,
      unreadCount: chat.unreadCount,
      isGroup: chat.isGroup,
      timestamp: chat.timestamp,
      lastMessage: chat.lastMessage ? chat.lastMessage._data : null,
      profile: ''
    }));

    var unreadMessages = [];
    for (let chat of chats) {
      if (chat.unreadCount > 0 && !chat.isGroup) {
        unreadMessages.push({ "phonenumber": chat.id.user.split("@")[0], "data": await chat.fetchMessages({ limit: chat.unreadCount }), "message_count": chat.unreadCount });
      }
    }

    const chatsWithProfiles = await Promise.all(chatPromises);

    res.json({
      status: 1,
      message: `Chats for ${phoneNumber} retrieved successfully.`,
      chats: chatsWithProfiles,
      all_chats: chats,
      totalChats: chats.length,
      unreadMessages: unreadMessages
    });
  } catch (error) {
    res.status(500).json({
      status: 0,
      message: "Internal Server Error"
    });
  }
};  

const getUserProfile = async (req, res) => {
  const phoneNumber = req.params.phoneNumber;
  const chatId = req.params.chatId;
  try {
    const profile = await getUserProfile(phoneNumber, chatId);
    // console.log(profile.name);
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
};

const getCommunicationChat = async (req, res) => {
  // console.log(req.params);
  const phoneNumber = req.params.phoneNumber;
  const lastmessage_id = req.params.lastmessage_id;
  const chatId = req.params.chat_id;

  if (!clients[phoneNumber] || !clientReady[phoneNumber]) {
    return res.status(400).json({
      status: 0,
      message: `Client for ${phoneNumber} is not ready.`
    });
  }

  try {
    let chat = null;

    // First check if chatId is provided
    if (chatId) {
      try {
        // Attempt to fetch chat by chatId
        chat = await clients[phoneNumber].getChatById(chatId);
      } catch (error) {
        // If fetching chat by chatId fails, assume chatId might be a contact number
        console.warn(`Failed to fetch chat by chatId, assuming chatId is a contact number: ${chatId}`);
      }
    }

    // If chat is still null and contact is provided or assumed from chatId
    if (!chat && chatId) {
      const contactNumber = chatId; // Use contact if provided, else use chatId as contact
      // Assuming getContacts returns a list of contacts
      const contacts = await clients[phoneNumber].getContacts();

      // Finding the contact object
      const contactObj = contacts.find(c => {
        const number = c.number || '';
        if (number.length > 10) {
          return number.slice(-10) === contactNumber.slice(-10); // Matching last 10 digits
        } else {
          return number === contactNumber; // Exact match if the number is 10 characters or less
        }
      });

      if (contactObj) {
        chat = await clients[phoneNumber].getChatById(contactObj.id._serialized);
      } else {
        console.error("Contact not found.");
      }
    }

    if (!chat) {
      return res.status(400).json({
        status: 0,
        message: "chatId or contact is required."
      });
    }

    // Fetch messages from the chat
    // console.log(lastmessage_id);
    const messageOptions = lastmessage_id ? { limit: 10, before: lastmessage_id } : { limit: 10 };
    // console.log(messageOptions);
    let messages = await chat.fetchMessages(messageOptions);

    messages = await Promise.all(messages.map(async (message) => {

      try {
        if (message.hasMedia) {
          const mediaUrl = await message.downloadMedia();
          message.mediaData = mediaUrl;

          // Optionally, fetch additional media details using getMediaDataFromWhatsApp
          // if (mediaType !== 'chat') {
          //   const mediaData = await getMediaDataFromWhatsApp(message._data);
          //   message.mimetype = mediaData.mimetype;
          //   message.mediaUrl = mediaData.data;
          //   message.filesize = mediaData.filesize;
          //   message.filename = mediaData.filename;
          // }
        }
        return message;
      } catch (error) {
        console.error('Error processing message:', error);
        throw error; // Propagate the error to the caller if necessary
      }
    }));

    res.json({
      status: 1,
      message: `Messages for chat ${chatId || contact} of ${phoneNumber} retrieved successfully.`,
      messages: messages
    });

  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      status: 0,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  sendMessage,
  getChats,
  getUserProfile,
  getCommunicationChat
};
