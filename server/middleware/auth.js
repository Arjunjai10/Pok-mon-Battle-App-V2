const jwt = require('jsonwebtoken');
const User = require('../models/User');

const requireAuth = async (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token found.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Authentication failed. User not found.' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed. Invalid token.' });
  }
};

module.exports = { requireAuth };
