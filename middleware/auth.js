// middleware/auth.js
import jwt from 'jsonwebtoken';

export default (req, res, next) => {
  try {
    const authorizationHeaderString = req.headers.authorization;
    if (!authorizationHeaderString || !authorizationHeaderString.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Cryptographic authorization header signature missing.' });
    }

    // Strip header prefix to isolate token payload
    const bareTokenString = authorizationHeaderString.split(' ')[1];

    // Cryptographically evaluate signature legitimacy using our secure key
    const validatedPayload = jwt.verify(bareTokenString, process.env.JWT_SECRET);

    // Inject identity onto application thread scopes for subsequent route access
    req.user = { id: validatedPayload.userId };

    return next(); // Credentials validated. Move down the router chain.

  } catch (error) {
    return res.status(401).json({ error: 'Session authentication authorization is invalid or has expired.' });
  }
};