const mongoose = require('mongoose');
const User = require('./server/models/User');
const SavedTeam = require('./server/models/SavedTeam');
const bcrypt = require('bcrypt');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pokemonbattle_v2';

async function seed() {
  let uri = MONGODB_URI;
  if (!process.env.MONGODB_URI) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
  }

  await mongoose.connect(uri);

  const pass = await bcrypt.hash('pass', 10);
  
  const user3 = await User.create({ userID: 'user3', password: pass });
  const user4 = await User.create({ userID: 'user4', password: pass });

  const team = [
    { pokemonId: 6, nickname: 'Charizard', moveset: ['Flamethrower', 'Slash', 'Fire Spin', 'Earthquake'], heldItem: '' },
    { pokemonId: 3, nickname: 'Venusaur', moveset: ['Razor Leaf', 'Sleep Powder', 'Body Slam', 'Swords Dance'], heldItem: '' },
    { pokemonId: 9, nickname: 'Blastoise', moveset: ['Surf', 'Blizzard', 'Body Slam', 'Rest'], heldItem: '' },
    { pokemonId: 25, nickname: 'Pikachu', moveset: ['Thunderbolt', 'Thunder Wave', 'Surf', 'Seismic Toss'], heldItem: '' },
    { pokemonId: 143, nickname: 'Snorlax', moveset: ['Body Slam', 'Amnesia', 'Blizzard', 'Rest'], heldItem: '' },
    { pokemonId: 150, nickname: 'Mewtwo', moveset: ['Psychic', 'Recover', 'Amnesia', 'Ice Beam'], heldItem: '' }
  ];

  await SavedTeam.create({ userId: user3._id, teamName: 'Team 3', pokemon: team });
  await SavedTeam.create({ userId: user4._id, teamName: 'Team 4', pokemon: team });

  console.log('Seeded DB');
  process.exit(0);
}

seed().catch(console.error);
