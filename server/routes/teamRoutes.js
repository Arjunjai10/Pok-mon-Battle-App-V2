const express = require('express');
const SavedTeam = require('../models/SavedTeam');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const teams = await SavedTeam.find({ userId: req.user._id });
    res.status(200).json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { teamName, pokemon } = req.body;
  if (!teamName || !pokemon || pokemon.length !== 6) {
    return res.status(400).json({ error: 'teamName and exactly 6 pokemon are required' });
  }
  
  try {
    const newTeam = await SavedTeam.create({ userId: req.user._id, teamName, pokemon });
    res.status(201).json(newTeam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const team = await SavedTeam.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { ...req.body },
      { new: true, runValidators: true }
    );
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.status(200).json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const team = await SavedTeam.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.status(200).json({ message: 'Team deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
