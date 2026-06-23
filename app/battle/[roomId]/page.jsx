'use client';
import { useEffect, useState } from 'react';
import { getSocket } from '../../../lib/socket';

export default function Battle({ params }) {
  const roomId = params.roomId;
  const [gameState, setGameState] = useState(null);
  const [log, setLog] = useState([]);
  const [waiting, setWaiting] = useState(false);
  const [userKey, setUserKey] = useState(null); // 'p1' or 'p2'

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      const socket = getSocket();
      socket.emit('auth', { userId: data.user.id });
      // Re-join room just in case we refreshed the page
      socket.emit('reconnect-room', { roomId });
      setTimeout(() => {
        socket.emit('request-state');
      }, 500);
    });
  }, [roomId]);

  useEffect(() => {
    const socket = getSocket();
    
    // In a real app we'd fetch the initial gameState from the server on load.
    // For now, we rely on the turn-result events. 
    // Wait, how do we get initial state? 
    socket.on('initial-state', data => {
      setGameState(data.gameState);
    });

    socket.on('turn-result', data => {
      setGameState(data.newState);
      setLog(prev => [...prev, ...data.log]);
      setWaiting(false);
    });

    return () => {
      socket.off('turn-result');
    };
  }, []);

  const handleAction = (action) => {
    setWaiting(true);
    getSocket().emit('submit-action', { action });
  };

  const handleMove = (moveName) => {
    handleAction({ type: 'move', move: moveName });
  };

  const handleSwitch = (index) => {
    handleAction({ type: 'switch', switchTo: index });
  };

  // Determine state
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

  return (
    <div>
      <h1>Battle: {roomId}</h1>
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ flex: 1, border: '1px solid #000', padding: 10 }}>
          <h3>Opponent</h3>
          {gameState && gameState.p2.active && (
            <div>
              <p>{gameState.p2.active.name}</p>
              <p>HP: {gameState.p2.active.hp}</p>
            </div>
          )}
        </div>
        <div style={{ flex: 1, border: '1px solid #000', padding: 10 }}>
          <h3>You</h3>
          {gameState && gameState.p1.active && (
            <div>
              <p>{gameState.p1.active.name}</p>
              <p>HP: {gameState.p1.active.hp}</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 20, height: 150, overflowY: 'scroll', border: '1px solid #ccc' }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>

      {waiting ? (
        <p>Waiting for opponent...</p>
      ) : isForceSwitch ? (
        <div style={{ marginTop: 20, border: '2px solid red', padding: 10 }}>
          <h2>FORCE SWITCH</h2>
          <p>Your Pokemon fainted! You must switch.</p>
          <button onClick={() => handleSwitch(1)}>Switch to Slot 2</button>
          <button onClick={() => handleSwitch(2)}>Switch to Slot 3</button>
          <button onClick={() => handleSwitch(3)}>Switch to Slot 4</button>
          <button onClick={() => handleSwitch(4)}>Switch to Slot 5</button>
          <button onClick={() => handleSwitch(5)}>Switch to Slot 6</button>
        </div>
      ) : isOpponentForceSwitch ? (
        <div style={{ marginTop: 20 }}>
          <p>Waiting for opponent to switch...</p>
        </div>
      ) : (
        <div style={{ marginTop: 20 }}>
          {gameState && gameState.p1.active && gameState.p1.active.moves.map(m => (
            <button key={m.id} onClick={() => handleMove(m.name)}>{m.name}</button>
          ))}
          <hr />
          <p>Switch:</p>
          <button onClick={() => handleSwitch(1)}>Slot 2</button>
          <button onClick={() => handleSwitch(2)}>Slot 3</button>
        </div>
      )}
    </div>
  );
}
