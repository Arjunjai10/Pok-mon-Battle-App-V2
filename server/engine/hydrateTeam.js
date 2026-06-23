const { calculateStat } = require('./statCalc');
const fs = require('fs');
const path = require('path');

const pokemonData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/pokemon.json'), 'utf8'));
const movesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/moves.json'), 'utf8'));
const itemsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/items.json'), 'utf8'));

const pokeDict = {};
pokemonData.forEach(p => pokeDict[p.id] = p);

const moveDict = movesData;

const itemDict = {};
itemsData.forEach(i => itemDict[i.name] = i);

function hydrateTeam(rawTeam) {
  return rawTeam.map(raw => {
    const pData = pokeDict[raw.pokemonId];
    if (!pData) throw new Error(`Pokemon ID ${raw.pokemonId} not found`);

    const level = 100;
    
    // Max DVs (15) and Max Stat EXP (65535) default via calculateStat
    const hp = calculateStat(pData.stats.maxHp, level, true);
    const atk = calculateStat(pData.stats.atk, level, false);
    const def = calculateStat(pData.stats.def, level, false);
    const spcAtk = calculateStat(pData.stats.spcAtk, level, false);
    const spcDef = calculateStat(pData.stats.spcDef, level, false);
    const spe = calculateStat(pData.stats.spe, level, false);

    const moves = raw.moveset.map(mName => {
      const mData = moveDict[mName];
      if (!mData) throw new Error(`Move ${mName} not found`);
      return {
        id: mData.id,
        name: mData.name,
        type: mData.type,
        power: mData.power,
        accuracy: mData.accuracy,
        pp: mData.pp,
        maxPp: mData.pp,
        priority: mData.priority,
        category: mData.category
      };
    });

    const item = raw.heldItem ? itemDict[raw.heldItem] : null;

    return {
      id: raw.pokemonId,
      name: pData.name,
      nickname: raw.nickname || pData.name,
      types: [...pData.types],
      level: level,
      hp: hp,
      maxHp: hp,
      stats: { atk, def, spcAtk, spcDef, spe },
      statStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, evasion: 0, accuracy: 0 },
      moves: moves,
      item: item,
      status: null,
      volatiles: []
    };
  });
}

module.exports = { hydrateTeam };
