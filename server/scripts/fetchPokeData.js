const fs = require('fs');
const path = require('path');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const API_BASE = 'https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2';
const DATA_DIR = path.join(__dirname, '../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function fetchJson(url) {
  // Convert standard pokeapi urls to static github urls
  if (url.startsWith('https://pokeapi.co/api/v2/')) {
    url = url.replace('https://pokeapi.co/api/v2/', API_BASE + '/');
  } else if (url.startsWith('/api/v2/')) {
    url = 'https://raw.githubusercontent.com/PokeAPI/api-data/master/data' + url;
  }

  if (url.startsWith('https://raw.githubusercontent.com') && !url.endsWith('/index.json')) {
    if (url.endsWith('/')) {
      url += 'index.json';
    } else {
      url += '/index.json';
    }
  }

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

async function run() {
  console.log('Fetching Pokemon 1-251...');
  const pokemonList = [];
  const moveUrls = new Set();
  
  for (let i = 1; i <= 251; i += 10) {
    const batch = [];
    for (let j = i; j < i + 10 && j <= 251; j++) {
      batch.push(fetchJson(`${API_BASE}/pokemon/${j}/index.json`));
    }
    const results = await Promise.all(batch);
    for (const p of results) {
      const allowedVersions = ['gold-silver', 'crystal'];
      
      const filteredMoves = [];
      p.moves.forEach(m => {
        const hasGen2Learnset = m.version_group_details.some(vgd => 
          allowedVersions.includes(vgd.version_group.name)
        );
        if (hasGen2Learnset) {
          filteredMoves.push(m.move.name);
          moveUrls.add(m.move.url);
        }
      });
      
      const stats = {};
      p.stats.forEach(s => {
        stats[s.stat.name] = s.base_stat;
      });

      const mappedStats = {
        maxHp: stats.hp,
        atk: stats.attack,
        def: stats.defense,
        spcAtk: stats['special-attack'],
        spcDef: stats['special-defense'],
        spe: stats.speed
      };

      pokemonList.push({
        id: p.id,
        name: p.name,
        types: p.types.map(t => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)),
        stats: mappedStats,
        moves: Array.from(new Set(filteredMoves)),
        sprite: p.sprites.front_default
      });
    }
    process.stdout.write(`\rFetched ${Math.min(i + 9, 251)} / 251`);
  }
  console.log('\nFetching unique moves...');
  
  const movesDict = {};
  const urlsArray = Array.from(moveUrls);
  let leakFound = false;

  const physicalTypes = ['Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel'];
  
  for (let i = 0; i < urlsArray.length; i += 20) {
    const batch = urlsArray.slice(i, i + 20).map(url => fetchJson(url));
    const results = await Promise.all(batch);
    for (const m of results) {
      if (m.generation.name !== 'generation-i' && m.generation.name !== 'generation-ii') {
        console.error(`\nLEAK DETECTED: Move ${m.name} is from ${m.generation.name}`);
        leakFound = true;
      }
      
      const typeStr = m.type.name.charAt(0).toUpperCase() + m.type.name.slice(1);
      let category = 'Status';
      if (m.damage_class && m.damage_class.name !== 'status') {
        category = physicalTypes.includes(typeStr) ? 'Physical' : 'Special';
      }

      movesDict[m.name] = {
        id: m.id,
        name: m.name,
        type: typeStr,
        power: m.power || 0,
        accuracy: m.accuracy || 100,
        pp: m.pp,
        category: category,
        priority: m.priority || 0
      };
    }
  }

  if (leakFound) {
    throw new Error('Gen 3+ move leak detected! Failing the pipeline.');
  }

  console.log('Running orphan check...');
  let orphans = 0;
  let learnsetSizes = [];
  pokemonList.forEach(p => {
    learnsetSizes.push(p.moves.length);
    p.moves.forEach(m => {
      if (!movesDict[m]) {
        console.error(`ORPHAN DETECTED: Move ${m} used by ${p.name} not in movesDict`);
        orphans++;
      }
    });
  });

  if (orphans > 0) {
    throw new Error(`Orphan check failed: ${orphans} orphan moves found.`);
  }

  console.log('Fetching items...');
  const items = [];
  try {
    const itemUrls = [];
    for(let i=1; i<=250; i++) {
      itemUrls.push(`${API_BASE}/item/${i}/index.json`);
    }

    for (let i = 0; i < itemUrls.length; i += 20) {
      const batch = itemUrls.slice(i, i + 20).map(url => fetchJson(url).catch(() => null));
      const results = await Promise.all(batch);
      for (const itm of results) {
        if (!itm) continue;
        if (!itm.game_indices) continue;
        const hasGen12 = itm.game_indices.some(gi => 
          gi.generation && (gi.generation.name === 'generation-i' || gi.generation.name === 'generation-ii')
        );
        if (hasGen12) {
          let effect = '';
          if (itm.effect_entries && itm.effect_entries.length > 0) {
            const entry = itm.effect_entries.find(e => e.language.name === 'en');
            effect = entry ? entry.short_effect : '';
          }
          items.push({
            id: itm.id,
            name: itm.name,
            effect: effect
          });
        }
      }
    }
  } catch (e) {
    console.error('Item fetch failed', e);
  }

  learnsetSizes.sort((a,b) => a - b);
  const minLearn = learnsetSizes[0];
  const maxLearn = learnsetSizes[learnsetSizes.length - 1];
  const medianLearn = learnsetSizes[Math.floor(learnsetSizes.length / 2)];

  fs.writeFileSync(path.join(DATA_DIR, 'pokemon.json'), JSON.stringify(pokemonList, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'moves.json'), JSON.stringify(movesDict, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'items.json'), JSON.stringify(items, null, 2));

  const hasMew = pokemonList.find(p => p.id === 151 && p.name === 'mew') !== undefined;
  const hasCelebi = pokemonList.find(p => p.id === 251 && p.name === 'celebi') !== undefined;

  console.log('----------------------------------------------------');
  console.log(`Pipeline Complete!`);
  console.log(`Total Pokemon: ${pokemonList.length}`);
  console.log(`Total Moves: ${Object.keys(movesDict).length}`);
  console.log(`Total Items: ${items.length}`);
  console.log(`Learnset Size - Min: ${minLearn}, Max: ${maxLearn}, Median: ${medianLearn}`);
  console.log(`Mew (151) Present: ${hasMew}`);
  console.log(`Celebi (251) Present: ${hasCelebi}`);
  console.log('No Gen 3+ move leaks found.');
  console.log('No orphan moves found.');
  console.log('----------------------------------------------------');
}

run().catch(console.error);
