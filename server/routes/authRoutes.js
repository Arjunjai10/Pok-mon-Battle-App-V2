const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '3d'
  });
};

router.post('/signup', async (req, res) => {
  const { userID, password } = req.body;
  if (!userID || !password) return res.status(400).json({ error: 'userID and password required' });

  try {
    const existing = await User.findOne({ userID });
    if (existing) return res.status(400).json({ error: 'userID already taken' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({ userID, passwordHash });
    const token = createToken(user._id);

    res.cookie('jwt', token, { httpOnly: true, maxAge: 3 * 24 * 60 * 60 * 1000 });
    res.status(201).json({ user: { id: user._id, userID: user.userID } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { userID, password } = req.body;
  if (!userID || !password) return res.status(400).json({ error: 'userID and password required' });

  try {
    const user = await User.findOne({ userID });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    const token = createToken(user._id);
    res.cookie('jwt', token, { httpOnly: true, maxAge: 3 * 24 * 60 * 60 * 1000 });
    res.status(200).json({ user: { id: user._id, userID: user.userID } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  res.cookie('jwt', '', { httpOnly: true, maxAge: 1 });
  res.status(200).json({ message: 'Logged out' });
});

router.get('/me', requireAuth, (req, res) => {
  res.status(200).json({ user: { id: req.user._id, userID: req.user.userID } });
});

module.exports = router;
