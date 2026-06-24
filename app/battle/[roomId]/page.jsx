'use client';
import { useEffect, useState } from 'react';
import { getSocket } from '../../../lib/socket';
import { motion, AnimatePresence } from 'framer-motion';

const HpBar = ({ hp, maxHp }) => {
  const percent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  let colorVar = '--hp-high';
  if (percent <= 50 && percent > 20) colorVar = '--hp-medium';
  if (percent <= 20) colorVar = '--hp-low';

  return (
    <div style={{ width: '100%', height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
      <motion.div
        initial={{ width: `${percent}%`, backgroundColor: `var(${colorVar})` }}
        animate={{ width: `${percent}%`, backgroundColor: `var(${colorVar})` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ height: '100%' }}
      />
    </div>
  );
};

const PokemonSprite = ({ isP1, active, events }) => {
  if (!active) return null;

  const spriteUrl = isP1 
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${active.id}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${active.id}.png`;

  const myEvents = events.filter(e => e.target === (isP1 ? 'p1' : 'p2'));
  const damageEvents = myEvents.filter(e => e.type === 'damage');
  const isFainted = myEvents.some(e => e.type === 'faint') || active.hp === 0;

  const statusColors = { burn: '#EE8130', poison: '#A33EA1', paralysis: '#F7D02C', sleep: '#A0A0A0', freeze: '#96D9D6' };

  return (
    <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto' }}>
      <motion.img 
        src={spriteUrl}
        initial={{ x: 0, y: 0, opacity: 1 }}
        animate={
          isFainted 
            ? { x: [0, -10, 10, -10, 10, 0], y: [0, 0, 0, 0, 0, 50], opacity: [1, 1, 1, 1, 1, 0] } 
            : { x: 0, y: 0, opacity: 1 }
        }
        transition={
          isFainted 
            ? { duration: 0.4, times: [0, 0.1, 0.2, 0.3, 0.4, 1] } 
            : { duration: 0 }
        }
        style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
        alt={active.name}
      />

      {/* Status Badge */}
      {active.status && (
        <div style={{
          position: 'absolute', bottom: 10, right: 10,
          background: statusColors[active.status], padding: '2px 6px',
          borderRadius: 4, color: '#fff', fontSize: 10, fontWeight: 'bold',
          textTransform: 'uppercase', border: '1px solid rgba(0,0,0,0.5)', zIndex: 5
        }}>
          {active.status}
        </div>
      )}

      {/* Damage & Effectiveness Overlays */}
      <AnimatePresence>
        {damageEvents.map((evt, i) => (
          <div key={evt.id} style={{ position: 'absolute', top: '20%', left: 0, right: 0, pointerEvents: 'none', zIndex: 10 }}>
            {evt.amount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 1, 0], y: -50, scale: 1 }}
                transition={{ duration: 1.5, delay: i * 1.2 }}
                style={{ textAlign: 'center', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontWeight: 'bold', fontSize: 24, padding: 4 }}
                className="hp-number"
              >
                -{evt.amount}
              </motion.div>
            )}
            
            {evt.effectiveness !== 1 && evt.effectiveness > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: [0, 1, 1, 0], x: 0 }}
                transition={{ duration: 1.5, delay: (i * 1.2) + 0.3 }}
                style={{ 
                  textAlign: 'center', 
                  color: evt.effectiveness > 1 ? '#FBBF24' : '#A0A0A0', 
                  fontWeight: 'bold', fontStyle: 'italic', fontSize: 14,
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                }}
              >
                {evt.effectiveness > 1 ? 'Super effective!' : 'Not very effective...'}
              </motion.div>
            )}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default function Battle({ params }) {
  const roomId = params.roomId;
  const [gameState, setGameState] = useState(null);
  const [log, setLog] = useState([]);
  const [waiting, setWaiting] = useState(false);
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      const socket = getSocket();
      socket.emit('auth', { userId: data.user.id });
      socket.emit('reconnect-room', { roomId });
      setTimeout(() => {
        socket.emit('request-state');
      }, 500);
    });
  }, [roomId]);

  useEffect(() => {
    const socket = getSocket();
    
    socket.on('initial-state', data => {
      setGameState(data.gameState);
    });

    socket.on('turn-result', data => {
      setGameState(data.newState);
      setLog(prev => [...prev, ...data.log]);
      
      const eventsWithId = data.turnEvents.map(e => ({...e, id: Math.random().toString(36).substr(2, 9)}));
      setRecentEvents(eventsWithId);
      
      setWaiting(false);
    });

    return () => {
      socket.off('turn-result');
      socket.off('initial-state');
    };
  }, []);

  const handleAction = (action) => {
    setWaiting(true);
    setRecentEvents([]); // Clear events on new action
    getSocket().emit('submit-action', { action });
  };

  const handleMove = (moveName) => {
    handleAction({ type: 'move', move: moveName });
  };

  const handleSwitch = (index) => {
    handleAction({ type: 'switch', switchTo: index });
  };

  let isForceSwitch = false;
  if (gameState && gameState.p1.active && gameState.p1.active.hp === 0) {
    isForceSwitch = true;
  }
  let isOpponentForceSwitch = false;
  if (gameState && gameState.p2.active && gameState.p2.active.hp === 0) {
    isOpponentForceSwitch = true;
  }

  useEffect(() => {
    if (isOpponentForceSwitch && !waiting) {
      handleAction({ type: 'pass' });
    }
  }, [isOpponentForceSwitch, waiting]);

  if (!gameState) return <div style={{ padding: 20 }}>Loading battle...</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100vh', padding: 20 }}>
      {/* Top Section - Opponent */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
        <div style={{ width: 250, background: 'var(--surface-1)', padding: 15, borderRadius: 12, border: '1px solid var(--surface-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <strong style={{ fontSize: 18 }}>{gameState.p2.active?.name}</strong>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Lv.{gameState.p2.active?.level}</span>
          </div>
          <HpBar hp={gameState.p2.active?.hp} maxHp={gameState.p2.active?.maxHp} />
        </div>
        <div style={{ flex: 1 }}>
          <PokemonSprite isP1={false} active={gameState.p2.active} events={recentEvents} />
        </div>
      </div>

      {/* Middle Section - Player */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
           <PokemonSprite isP1={true} active={gameState.p1.active} events={recentEvents} />
        </div>
        <div style={{ width: 250, background: 'var(--surface-1)', padding: 15, borderRadius: 12, border: '1px solid var(--surface-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <strong style={{ fontSize: 18 }}>{gameState.p1.active?.name}</strong>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Lv.{gameState.p1.active?.level}</span>
          </div>
          <HpBar hp={gameState.p1.active?.hp} maxHp={gameState.p1.active?.maxHp} />
          <div style={{ textAlign: 'right', marginTop: 4, fontSize: 14, color: 'var(--text-secondary)' }} className="hp-number">
            {gameState.p1.active?.hp} / {gameState.p1.active?.maxHp}
          </div>
        </div>
      </div>

      {/* Battle Log */}
      <div style={{ flex: 1, background: 'var(--surface-1)', borderRadius: 12, padding: 15, overflowY: 'auto', marginBottom: 20, border: '1px solid var(--surface-2)', display: 'flex', flexDirection: 'column-reverse' }}>
        <div>
          {log.map((l, i) => <div key={i} style={{ marginBottom: 4 }}>{l}</div>)}
        </div>
      </div>

      {/* Controls */}
      <div style={{ minHeight: 120 }}>
        {waiting ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>Waiting for opponent...</div>
        ) : isOpponentForceSwitch ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>Waiting for opponent to switch...</div>
        ) : !isForceSwitch && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {gameState.p1.active?.moves.map(m => (
                <button 
                  key={m.id} 
                  onClick={() => handleMove(m.name)}
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--type-${m.type.toLowerCase()}) 20%, transparent)`,
                    border: `2px solid var(--type-${m.type.toLowerCase()})`,
                    color: '#fff',
                    padding: '12px 16px',
                    borderRadius: 8,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'transform 0.1s, opacity 0.1s'
                  }}
                  onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseOut={e => e.currentTarget.style.opacity = '1'}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {m.name}
                  <div style={{ fontSize: 10, fontWeight: 'normal', marginTop: 4, color: 'rgba(255,255,255,0.7)' }}>
                    {m.type} • {m.pp}/{m.maxPp} PP
                  </div>
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {gameState.p1.team.map((poke, index) => (
                <button
                  key={index}
                  disabled={poke.hp === 0 || poke.id === gameState.p1.active?.id}
                  onClick={() => handleSwitch(index)}
                  style={{
                    background: poke.id === gameState.p1.active?.id ? 'var(--surface-2)' : 'var(--surface-1)',
                    border: '1px solid var(--surface-2)',
                    color: poke.hp === 0 ? 'var(--text-secondary)' : '#fff',
                    padding: '8px',
                    borderRadius: 8,
                    cursor: poke.hp === 0 || poke.id === gameState.p1.active?.id ? 'not-allowed' : 'pointer',
                    opacity: poke.hp === 0 ? 0.5 : 1
                  }}
                >
                  <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.id}.png`} alt={poke.name} style={{ width: 40, height: 40, display: 'block', margin: '0 auto' }} />
                  <div style={{ fontSize: 10, textAlign: 'center' }} className="hp-number">{poke.hp}/{poke.maxHp}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Force Switch Drawer */}
      <AnimatePresence>
        {isForceSwitch && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100 }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--surface-1)', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: '0 -4px 20px rgba(0,0,0,0.5)' }}
            >
              <h2 style={{ textAlign: 'center', marginBottom: 20 }}>Choose next Pokémon</h2>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 15, flexWrap: 'wrap' }}>
                {gameState.p1.team.map((poke, index) => {
                  if (poke.hp === 0 || poke.id === gameState.p1.active?.id) return null;
                  return (
                    <button
                      key={index}
                      onClick={() => handleSwitch(index)}
                      style={{
                        background: 'var(--surface-2)',
                        border: '2px solid var(--accent-purple)',
                        color: '#fff',
                        padding: '10px 20px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                      }}
                    >
                      <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.id}.png`} alt={poke.name} style={{ width: 60, height: 60 }} />
                      <div style={{ fontWeight: 'bold' }}>{poke.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }} className="hp-number">{poke.hp}/{poke.maxHp} HP</div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
