const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;

exports.authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401); // Return 401 Unauthorized if token is missing
  }

  jwt.verify(token, SECRET_KEY, async (err, user) => {
    if (user && user.login === true) {
      // If user is already logged in, skip the fetch request and proceed
      return next();
    }
    if (err) {
      return res.sendStatus(403); // Return 403 Forbidden if token is invalid
    }
    try {
      const fetch = await import('node-fetch').then(mod => mod.default);
      const url = "https://crm.staging.educationvibes.in/external/login";
      const formdata = new FormData();
      formdata.append("email", user.email);
      formdata.append("password", user.password);

      const response = await fetch(url, {
        method: 'POST',
        body: formdata
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const responseData = await response.json();

      if (responseData.status == 1) {
        next();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
};
