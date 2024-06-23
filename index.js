const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const dotenv = require('dotenv');
const cors = require('cors');
const formidable = require('formidable');
const fileUpload = require('express-fileupload');
const multer = require('multer');
dotenv.config();
const clientRoutes = require('./routes/clientRoutes');
const messageRoutes = require('./routes/messageRoutes');
const app = express();
app.use(cors()); // Enable CORS
const upload = multer({ dest: 'uploads/' });
app.use(fileUpload());
const port = process.env.PORT || 9000;



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_KEY, // Replace with your secret key
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

app.use('/', clientRoutes);
app.use('/', messageRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
