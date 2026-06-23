const mongoose = require('mongoose');

const savedTeamSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teamName: { type: String, required: true },
  pokemon: {
    type: [{
      pokemonId: Number,
      nickname: String,
      moveset: [String],
      heldItem: String
    }],
    validate: [v => v.length === 6, 'Team must have exactly 6 Pokemon']
  }
}, { timestamps: true });

module.exports = mongoose.models.SavedTeam || mongoose.model('SavedTeam', savedTeamSchema);
