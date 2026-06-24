'use client';
import { useEffect, useState } from 'react';
import styles from './teamBuilder.module.css';

const TYPES = ['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel'];

export default function TeamBuilder() {
  const [pokemonData, setPokemonData] = useState([]);
  const [movesData, setMovesData] = useState({});
  const [itemsData, setItemsData] = useState([]);
  
  const [teamName, setTeamName] = useState('My Awesome Team');
  const [team, setTeam] = useState(
    Array(6).fill(null).map(() => ({ pokemonId: '', nickname: '', moveset: ['', '', '', ''], heldItem: '' }))
  );
  
  const [activeSlot, setActiveSlot] = useState(0);
  const [detailPokemon, setDetailPokemon] = useState(null); // The pokemon configured in the active slot
  const [typeFilter, setTypeFilter] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMoveIndex, setActiveMoveIndex] = useState(null); // which of the 4 moves is being picked

  const [dataError, setDataError] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => { if (!r.ok) window.location.href = '/login'; });
    
    Promise.all([
      fetch('/api/data/pokemon').then(r => r.ok ? r.json() : Promise.reject('Failed')),
      fetch('/api/data/moves').then(r => r.ok ? r.json() : Promise.reject('Failed')),
      fetch('/api/data/items').then(r => r.ok ? r.json() : Promise.reject('Failed'))
    ])
    .then(([pk, mv, it]) => {
      setPokemonData(pk);
      setMovesData(mv);
      setItemsData(it);
    })
    .catch(() => setDataError(true));
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
    setActiveMoveIndex(null); // close picker
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
      return { pokemonId: randomPk.id, nickname: '', moveset: selectedMoves, heldItem: Math.random() > 0.5 ? item : '' };
    });
    setTeam(newTeam);
    setDetailPokemon(null);
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

  // Mocks deterministic learn methods
  const getMoveDetails = (moveName) => {
    const m = Object.values(movesData).find(x => x.name === moveName) || { name: moveName, type: 'Normal', power: 0, accuracy: 100, pp: 35 };
    const hash = moveName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    let method = 'Level Up';
    let sortValue = 0;
    let label = '';
    
    if (hash % 3 === 0) {
      method = 'TM/HM';
      sortValue = (hash % 100) + 1;
      label = `TM${sortValue.toString().padStart(2, '0')}`;
    } else if (hash % 5 === 0) {
      method = 'Tutor';
      sortValue = 999;
      label = 'Tutor';
    } else {
      method = 'Level Up';
      sortValue = (hash % 60) + 1;
      label = `Lv. ${sortValue}`;
    }
    return { ...m, method, sortValue, label };
  };

  if (dataError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '20px' }}>
        <h2 style={{ color: 'var(--hp-low)' }}>Failed to load Pokémon data</h2>
        <p style={{ color: 'var(--text-secondary)' }}>There was a problem retrieving data from the server.</p>
        <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: 'var(--surface-2)', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}>Retry</button>
      </div>
    );
  }

  if (pokemonData.length === 0) return <div style={{ padding: 40, textAlign: 'center' }}>Loading data...</div>;

  const filteredPokemon = typeFilter ? pokemonData.filter(p => p.types.includes(typeFilter)) : pokemonData;
  const currentSlotData = team[activeSlot];

  return (
    <div className={styles.container}>
      <div className={styles.mainArea}>
        <button className={styles.mobileToggle} onClick={() => setIsSidebarOpen(true)}>
          View Team ({team.filter(p => p.pokemonId).length}/6)
        </button>

        {detailPokemon ? (
          <div className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <button className={styles.backBtn} onClick={() => { setDetailPokemon(null); setActiveMoveIndex(null); }}>
                &larr; Back to Grid
              </button>
              <img src={detailPokemon.sprite} alt={detailPokemon.name} style={{ width: 100, height: 100 }} />
              <div>
                <h2 style={{ textTransform: 'capitalize', margin: 0 }}>{detailPokemon.name}</h2>
                <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                  {detailPokemon.types.map(t => (
                    <span key={t} className={styles.typeBadge} style={{ background: `var(--type-${t.toLowerCase()})` }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ flex: 1 }}>
                <label>Nickname</label>
                <input 
                  type="text" 
                  value={currentSlotData.nickname} 
                  onChange={e => updatePokemon(activeSlot, 'nickname', e.target.value)}
                  style={{ width: '100%', padding: 10, background: 'var(--surface-2)', border: 'none', color: 'white', borderRadius: 8, marginTop: 5 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Held Item</label>
                <select 
                  value={currentSlotData.heldItem} 
                  onChange={e => updatePokemon(activeSlot, 'heldItem', e.target.value)}
                  style={{ width: '100%', padding: 10, background: 'var(--surface-2)', border: 'none', color: 'white', borderRadius: 8, marginTop: 5 }}
                >
                  <option value="">No Item</option>
                  {itemsData.map(itm => <option key={itm.name} value={itm.name}>{itm.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <h3>Moves</h3>
              <div className={styles.moveGrid}>
                {currentSlotData.moveset.map((m, i) => {
                  const moveData = m ? getMoveDetails(m) : null;
                  return (
                    <div 
                      key={i} 
                      className={`${styles.moveSlot} ${activeMoveIndex === i ? styles.active : ''}`}
                      onClick={() => setActiveMoveIndex(activeMoveIndex === i ? null : i)}
                    >
                      {moveData ? (
                        <div className={styles.moveInfo}>
                          <div className={styles.moveHeader}>
                            <span className={styles.moveName}>{moveData.name.replace('-', ' ')}</span>
                            <span className={styles.typeBadge} style={{ background: `var(--type-${moveData.type.toLowerCase()})` }}>{moveData.type}</span>
                          </div>
                          <div className={styles.moveStats}>
                            <span>BP: {moveData.power || '-'}</span>
                            <span>Acc: {moveData.accuracy || '-'}%</span>
                            <span>PP: {moveData.pp}</span>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.moveSlotEmpty}>Select Move {i + 1}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {activeMoveIndex !== null && (
              <div className={styles.movePicker}>
                <h3>Select a Move for Slot {activeMoveIndex + 1}</h3>
                {(() => {
                  const movesWithDetails = detailPokemon.moves.map(m => getMoveDetails(m));
                  const levelUpMoves = movesWithDetails.filter(m => m.method === 'Level Up').sort((a,b) => a.sortValue - b.sortValue);
                  const tmMoves = movesWithDetails.filter(m => m.method === 'TM/HM').sort((a,b) => a.sortValue - b.sortValue);
                  const tutorMoves = movesWithDetails.filter(m => m.method === 'Tutor').sort((a,b) => a.name.localeCompare(b.name));

                  const renderMoveGroup = (title, moves) => {
                    if (moves.length === 0) return null;
                    return (
                      <div className={styles.moveGroup}>
                        <div className={styles.moveGroupHeader}>{title}</div>
                        <div className={styles.moveList}>
                          {moves.map(m => (
                            <div key={m.name} className={styles.moveItem} onClick={() => updateMove(activeSlot, activeMoveIndex, m.name)}>
                              <span className={styles.moveMethodLabel}>{m.label}</span>
                              <span className={styles.moveName} style={{ flex: 1 }}>{m.name.replace('-', ' ')}</span>
                              <span className={styles.typeBadge} style={{ background: `var(--type-${m.type.toLowerCase()})`, marginRight: 15 }}>{m.type}</span>
                              <span style={{ width: 50, color: 'var(--text-secondary)' }}>BP: {m.power || '-'}</span>
                              <span style={{ width: 60, color: 'var(--text-secondary)' }}>Acc: {m.accuracy || '-'}%</span>
                              <span style={{ width: 50, color: 'var(--text-secondary)' }}>PP: {m.pp}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div>
                      {renderMoveGroup('Level Up', levelUpMoves)}
                      {renderMoveGroup('TM / HM', tmMoves)}
                      {renderMoveGroup('Move Tutor', tutorMoves)}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={styles.filters}>
              <button 
                className={`${styles.filterBtn} ${typeFilter === '' ? styles.active : ''}`}
                style={{ background: typeFilter === '' ? 'var(--surface-2)' : 'var(--surface-1)' }}
                onClick={() => setTypeFilter('')}
              >
                All
              </button>
              {TYPES.map(t => (
                <button
                  key={t}
                  className={`${styles.filterBtn} ${typeFilter === t ? styles.active : ''}`}
                  style={{ background: `var(--type-${t.toLowerCase()})` }}
                  onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className={styles.grid}>
              {filteredPokemon.map(pk => (
                <div 
                  key={pk.id} 
                  className={styles.pokemonCard}
                  onClick={() => {
                    updatePokemon(activeSlot, 'pokemonId', pk.id);
                    setDetailPokemon(pk);
                  }}
                >
                  <img src={pk.sprite} alt={pk.name} className={styles.pokemonSprite} />
                  <span className={styles.pokemonName}>{pk.name}</span>
                  
                  <div className={styles.tooltip}>
                    {Object.entries({ HP: 'maxHp', ATK: 'atk', DEF: 'def', SPA: 'spcAtk', SPD: 'spcDef', SPE: 'spe' }).map(([label, key]) => (
                      <div key={label} className={styles.statRow}>
                        <span className={styles.statLabel}>{label}</span>
                        <div className={styles.statBarBg}>
                          <div className={styles.statBarFill} style={{ width: `${Math.min(100, (pk.stats[key] / 255) * 100)}%` }} />
                        </div>
                        <span className={styles.statValue}>{pk.stats[key]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <input 
            value={teamName} 
            onChange={e => setTeamName(e.target.value)} 
            placeholder="Team Name" 
          />
          <button className={styles.mobileClose} onClick={() => setIsSidebarOpen(false)}>&times;</button>
        </div>

        <div className={styles.teamSlots}>
          {team.map((p, i) => {
            const pkData = p.pokemonId ? pokemonData.find(x => x.id === p.pokemonId) : null;
            return (
              <div 
                key={i} 
                className={`${styles.teamSlot} ${!pkData ? styles.empty : ''} ${activeSlot === i ? styles.active : ''}`}
                onClick={() => {
                  setActiveSlot(i);
                  setDetailPokemon(pkData);
                  setIsSidebarOpen(false); // Close sidebar on mobile when selecting a slot
                }}
              >
                {pkData ? (
                  <>
                    <img src={pkData.sprite} alt={pkData.name} className={styles.slotSprite} />
                    <div className={styles.slotInfo}>
                      <span className={styles.slotName}>{p.nickname || pkData.name}</span>
                      <div className={styles.slotTypes}>
                        {pkData.types.map(t => (
                          <span key={t} className={styles.typeBadge} style={{ background: `var(--type-${t.toLowerCase()})` }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <span>Slot {i + 1}</span>
                )}
              </div>
            );
          })}
        </div>

        <button className={styles.primaryBtn} onClick={randomizeTeam} style={{ background: 'var(--surface-2)', marginBottom: 10 }}>
          Randomize Team
        </button>
        <button className={styles.primaryBtn} onClick={handleSave}>
          Save Team
        </button>
      </div>
    </div>
  );
}
