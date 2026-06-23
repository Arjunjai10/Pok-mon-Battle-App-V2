const express = require('express');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('friendList.userId', 'userID');
    const pendingRequests = await FriendRequest.find({ to: req.user._id, status: 'pending' }).populate('from', 'userID');
    res.status(200).json({
      friends: user.friendList,
      pendingRequests
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/request', async (req, res) => {
  const { targetUserID } = req.body;
  if (!targetUserID) return res.status(400).json({ error: 'targetUserID required' });

  try {
    const targetUser = await User.findOne({ userID: targetUserID });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    if (targetUser._id.toString() === req.user._id.toString()) return res.status(400).json({ error: 'Cannot add yourself' });

    // Check if already friends
    const isFriend = req.user.friendList.some(f => f.userId.toString() === targetUser._id.toString() && f.status === 'accepted');
    if (isFriend) return res.status(400).json({ error: 'Already friends' });

    // Check if request already exists
    const existingReq = await FriendRequest.findOne({ from: req.user._id, to: targetUser._id, status: 'pending' });
    if (existingReq) return res.status(400).json({ error: 'Request already sent' });

    const newReq = await FriendRequest.create({ from: req.user._id, to: targetUser._id });
    res.status(201).json(newReq);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/accept', async (req, res) => {
  const { requestId } = req.body;
  try {
    const request = await FriendRequest.findOne({ _id: requestId, to: req.user._id, status: 'pending' }).populate('from');
    if (!request) return res.status(404).json({ error: 'Request not found' });

    request.status = 'accepted';
    await request.save();

    // Add to each other's friend list
    const currentUser = await User.findById(req.user._id);
    const fromUser = await User.findById(request.from._id);

    currentUser.friendList.push({ userId: fromUser._id, userID: fromUser.userID, status: 'accepted' });
    fromUser.friendList.push({ userId: currentUser._id, userID: currentUser.userID, status: 'accepted' });

    await currentUser.save();
    await fromUser.save();

    res.status(200).json({ message: 'Friend request accepted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/decline', async (req, res) => {
  const { requestId } = req.body;
  try {
    const request = await FriendRequest.findOne({ _id: requestId, to: req.user._id, status: 'pending' });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    request.status = 'declined';
    await request.save();
    res.status(200).json({ message: 'Friend request declined' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:userId', async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const targetUser = await User.findById(req.params.userId);

    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    currentUser.friendList = currentUser.friendList.filter(f => f.userId.toString() !== targetUser._id.toString());
    targetUser.friendList = targetUser.friendList.filter(f => f.userId.toString() !== currentUser._id.toString());

    await currentUser.save();
    await targetUser.save();

    res.status(200).json({ message: 'Friend removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
