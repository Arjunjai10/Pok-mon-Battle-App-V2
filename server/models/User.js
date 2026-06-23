const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userID: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  friendList: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userID: String,
    status: { type: String, enum: ['pending', 'accepted'] }
  }]
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
