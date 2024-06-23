const { clients, clientReady } = require('./clientController');

exports.getChats = async (req, res) => {
  const phoneNumber = req.query.phone;
  if (clients[phoneNumber] && clientReady[phoneNumber]) {
    try {
      const chats = await clients[phoneNumber].getChats();
      const chatList = chats.map(chat => ({
        id: chat.id._serialized,
        name: chat.name,
        isGroup: chat.isGroup,
        contact: chat.isGroup ? null : {
          id: chat.contact.id._serialized,
          name: chat.contact.name,
          number: chat.contact.number
        }
      }));
      res.json({
        status: 1,
        message: `Fetched chats for ${phoneNumber}.`,
        chats: chatList
      });
    } catch (error) {
      console.error(`Error fetching chats for ${phoneNumber}:`, error);
      res.json({
        status: 0,
        message: `Error fetching chats for ${phoneNumber}.`,
        error: error.message
      });
    }
  } else {
    res.json({
      status: 0,
      message: `Client for ${phoneNumber} is not ready.`
    });
  }
};
