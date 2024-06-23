const jwt = require('jsonwebtoken');
// const fetch = require('node-fetch');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.sendStatus(401); // Return 401 Unauthorized if token is missing
  }

  jwt.verify(token, SECRET_KEY, async (err, user) => {
    if (err || !user || !user.login) {
      return res.sendStatus(403); // Return 403 Forbidden if token is invalid or user is not logged in
    }

    if (user.login === true) {
      // If user is already logged in, skip the fetch request and proceed
      return next();
    }

    try {
      const url = "https://crm.staging.educationvibes.in/external/login";

      // Create form data for the POST request
      const formdata = new URLSearchParams();
      formdata.append("email", user.email);
      formdata.append("password", user.password);

      // Configure the fetch request
      const response = await fetch(url, {
        method: 'POST',
        body: formdata, // Set form data as body
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded' // Set content type for form data
        }
      });

      if (!response.ok) {
        throw new Error('Network response was not ok'); // Throw error if response is not ok
      }

      const responseData = await response.json(); // Parse JSON response

      if (responseData.status === 1) {
        // If login is successful, proceed to next middleware or route handler
        next();
      } else {
        throw new Error('Login failed'); // Throw error if login is not successful
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      return res.status(500).json({ error: 'Internal Server Error' }); // Handle fetch or other errors
    }
  });
}

module.exports = authenticateToken;
