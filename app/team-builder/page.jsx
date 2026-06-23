'use client';
import { useEffect, useState } from 'react';

export default function TeamBuilder() {
  const [pokemonData, setPokemonData] = useState([]);
  const [movesData, setMovesData] = useState({});
  const [itemsData, setItemsData] = useState([]);
  
  const [teamName, setTeamName] = useState('My Awesome Team');
  const [team, setTeam] = useState(
    Array(6).fill(null).map(() => ({ pokemonId: '', nickname: '', moveset: ['', '', '', ''], heldItem: '' }))
  );

  useEffect(() => {
    fetch('/api/auth/me').then(r => { if (!r.ok) window.location.href = '/login'; });
    fetch('/api/data/pokemon').then(r => r.json()).then(setPokemonData);
    fetch('/api/data/moves').then(r => r.json()).then(setMovesData);
    fetch('/api/data/items').then(r => r.json()).then(setItemsData);
  }, []);

  const updatePokemon = (index, field, value) => {
    const newTeam = [...team];
    newTeam[index][field] = value;
    setTeam(newTeam);
  };

  const updateMove = (pIndex, mIndex, value) => {
    const newTeam = [...team];
    newTeam[pIndex].moveset[mIndex] = value;
    setTeam(newTeam);
  };

  const randomizeTeam = () => {
    if (pokemonData.length === 0) return;
    
    const newTeam = Array(6).fill(null).map(() => {
      const randomPk = pokemonData[Math.floor(Math.random() * pokemonData.length)];
      const moves = [...randomPk.moves];
      moves.sort(() => 0.5 - Math.random());
      const selectedMoves = moves.slice(0, 4);
      while (selectedMoves.length < 4) selectedMoves.push('');
      
      const item = itemsData.length > 0 ? itemsData[Math.floor(Math.random() * itemsData.length)].name : '';
      
      return {
        pokemonId: randomPk.id,
        nickname: '',
        moveset: selectedMoves,
        heldItem: Math.random() > 0.5 ? item : '' // 50% chance to hold an item
      };
    });
    
    setTeam(newTeam);
  };

  const handleSave = async () => {
    for (let p of team) {
      if (!p.pokemonId) return alert('Select 6 Pokemon');
      if (p.moveset.filter(m => m !== '').length !== 4) return alert('Each Pokemon needs 4 moves');
    }

    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName, pokemon: team })
    });
    
    if (res.ok) {
      alert('Team Saved!');
      window.location.href = '/lobby';
    } else {
      const data = await res.json();
      alert('Error: ' + data.error);
    }
  };

  if (pokemonData.length === 0) return <div>Loading data...</div>;

  return (
    <div>
      <h1>Team Builder</h1>
      <input value={teamName} onChange={e => setTeamName(e.target.value)} />
      <button onClick={randomizeTeam} style={{ marginLeft: 10 }}>Randomize Team</button>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        {team.map((p, i) => (
          <div key={i} style={{ border: '1px solid #ccc', padding: 10 }}>
            <h3>Slot {i + 1}</h3>
            <select value={p.pokemonId} onChange={e => updatePokemon(i, 'pokemonId', parseInt(e.target.value))}>
              <option value="">Select Pokemon</option>
              {pokemonData.map(pk => <option key={pk.id} value={pk.id}>{pk.name}</option>)}
            </select>
            <input placeholder="Nickname" value={p.nickname} onChange={e => updatePokemon(i, 'nickname', e.target.value)} />
            
            <select value={p.heldItem} onChange={e => updatePokemon(i, 'heldItem', e.target.value)}>
              <option value="">No Item</option>
              {itemsData.map(itm => <option key={itm.name} value={itm.name}>{itm.name}</option>)}
            </select>

            <div>
              {p.moveset.map((m, mi) => {
                const pkData = pokemonData.find(x => x.id === p.pokemonId);
                const availableMoves = pkData ? pkData.moves : [];
                return (
                  <select key={mi} value={m} onChange={e => updateMove(i, mi, e.target.value)}>
                    <option value="">Select Move</option>
                    {availableMoves.map(mv => <option key={mv} value={mv}>{mv}</option>)}
                  </select>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button onClick={handleSave} style={{ marginTop: 20 }}>Save Team</button>
    </div>
  );
}
