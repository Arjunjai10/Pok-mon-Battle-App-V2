'use client';
import { useEffect, useState } from 'react';
import { getSocket } from '../../lib/socket';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const RoomCodeDisplay = ({ roomId }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const shouldReduceMotion = useReducedMotion();
  return (
    <div style={{ position: 'relative', display: 'inline-block', margin: '15px 0' }}>
      <div 
        onClick={handleCopy} 
        style={{ fontFamily: 'monospace', fontSize: 32, cursor: 'pointer', background: 'var(--surface-2)', padding: '10px 20px', borderRadius: 8, letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }}
      >
        {roomId}
      </div>
      <AnimatePresence>
        {copied && (
          <motion.div 
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0 }} 
            transition={shouldReduceMotion ? { duration: 0 } : undefined}
            style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-purple)', color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: 12, pointerEvents: 'none', fontWeight: 'bold' }}
          >
            Copied!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const WaitingIndicator = () => {
  const shouldReduceMotion = useReducedMotion();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 }}>
      <span style={{ fontSize: 18, color: 'var(--text-secondary)' }}>Waiting for opponent</span>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map(i => (
          <motion.div 
            key={i} 
            animate={shouldReduceMotion ? undefined : { opacity: [0.2, 1, 0.2] }} 
            transition={shouldReduceMotion ? undefined : { repeat: Infinity, duration: 1.5, delay: i * 0.2 }} 
            style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-purple)' }} 
          />
        ))}
      </div>
    </div>
  );
};

export default function Lobby() {
  const [user, setUser] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [team, setTeam] = useState(null);
  const [friends, setFriends] = useState([]);
  const [onlineFriendIds, setOnlineFriendIds] = useState([]);
  const [vsData, setVsData] = useState(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => {
        if (!r.ok) throw new Error('Unauth');
        return r.json();
      })
      .then(data => {
        setUser(data.user);
        const socket = getSocket();
        socket.emit('auth', { userId: data.user.id });
      })
      .catch(() => {
        window.location.href = '/login';
      });
      
    fetch('/api/teams')
      .then(r => r.json())
      .then(data => {
        if (data && data.length > 0) {
          setTeam(data[0].pokemon);
        }
      });
      
    fetch('/api/friends')
      .then(r => r.json())
      .then(data => {
        const friendList = data.friends || [];
        setFriends(friendList);
        const friendIds = friendList.map(f => f.userId._id);
        getSocket().emit('check-online-friends', { friendIds });
      });
  }, []);

  useEffect(() => {
    const socket = getSocket();
    
    socket.on('online-friends', data => {
      setOnlineFriendIds(data.onlineIds || []);
    });

    const handleRoomJoined = (data) => {
      if (!user) return;
      const isP1 = data.room.players.player1.id === user.id;
      const myLead = isP1 ? data.room.players.player1.team[0].pokemonId : data.room.players.player2.team[0].pokemonId;
      const oppLead = isP1 ? data.room.players.player2.team[0].pokemonId : data.room.players.player1.team[0].pokemonId;

      setVsData({ roomId: data.room.roomId, myLead, oppLead });
      setWaitingForOpponent(false);
      
      setTimeout(() => {
        window.location.href = '/battle/' + data.room.roomId;
      }, 2000);
    };

    socket.on('room-created', data => {
      setRoomId(data.roomId);
      setWaitingForOpponent(true);
    });

    socket.on('room-joined', handleRoomJoined);
    
    return () => {
      socket.off('online-friends');
      socket.off('room-created');
      socket.off('room-joined', handleRoomJoined);
    }
  }, [user]);

  const handleCreate = () => {
    if (!team) return alert('Build a team first!');
    getSocket().emit('create-room', { team });
  };

  const handleJoin = () => {
    if (!team) return alert('Build a team first!');
    if (!roomId) return alert('Enter a room ID');
    getSocket().emit('join-room', { roomId, team });
  };

  const handleInvite = (friendId) => {
    getSocket().emit('invite-friend', { targetUserId: friendId });
    alert('Invite sent!');
  };

  const skipVs = () => {
    if (vsData) window.location.href = '/battle/' + vsData.roomId;
  };

  if (!user) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 40 }}>
      <h1 style={{ fontSize: 32, marginBottom: 10 }}>Lobby</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 40 }}>Welcome, <strong>{user.userID}</strong></p>
      
      {!team && <p style={{ color: 'var(--hp-low)', padding: 15, background: 'var(--surface-1)', borderRadius: 8, marginBottom: 20 }}>You must build a team before battling!</p>}

      <div style={{ display: 'flex', gap: 40 }}>
        <div style={{ flex: 1, background: 'var(--surface-1)', padding: 30, borderRadius: 16, border: '1px solid var(--surface-2)' }}>
          <h2 style={{ marginTop: 0 }}>Play</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 20 }}>
            <button 
              onClick={handleCreate} 
              disabled={!team || waitingForOpponent}
              style={{ background: 'var(--accent-purple)', color: '#fff', padding: '12px', borderRadius: 8, fontWeight: 'bold', border: 'none', cursor: !team || waitingForOpponent ? 'not-allowed' : 'pointer', opacity: !team || waitingForOpponent ? 0.5 : 1 }}
            >
              Create Room
            </button>
            
            {roomId && waitingForOpponent && (
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <RoomCodeDisplay roomId={roomId} />
                <WaitingIndicator />
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <input 
                placeholder="Room Code" 
                value={roomId} 
                onChange={e => setRoomId(e.target.value.toUpperCase())} 
                maxLength={6}
                style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid var(--surface-2)', background: 'var(--bg-dark)', color: '#fff', fontSize: 16, fontFamily: 'monospace' }}
              />
              <button 
                onClick={handleJoin} 
                disabled={!team || !roomId}
                style={{ background: 'var(--surface-2)', color: '#fff', padding: '0 20px', borderRadius: 8, fontWeight: 'bold', border: 'none', cursor: !team || !roomId ? 'not-allowed' : 'pointer', opacity: !team || !roomId ? 0.5 : 1 }}
              >
                Join
              </button>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, background: 'var(--surface-1)', padding: 30, borderRadius: 16, border: '1px solid var(--surface-2)' }}>
          <h2 style={{ marginTop: 0 }}>Friends Online</h2>
          {friends.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No friends added yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
              {friends.map(f => {
                if (f.status !== 'accepted') return null;
                const isOnline = onlineFriendIds.includes(f.userId._id);
                return (
                  <div key={f.userId._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', padding: '10px 15px', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: isOnline ? 'var(--hp-high)' : 'var(--text-secondary)' }} />
                      <span style={{ fontWeight: 'bold' }}>{f.userId.userID}</span>
                    </div>
                    <button 
                      onClick={() => handleInvite(f.userId._id)}
                      disabled={!isOnline || !team}
                      style={{ background: 'var(--accent-purple)', color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 'bold', border: 'none', cursor: !isOnline || !team ? 'not-allowed' : 'pointer', opacity: !isOnline || !team ? 0.5 : 1 }}
                    >
                      Invite
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* VS Screen Overlay */}
      <AnimatePresence>
        {vsData && (() => {
          const shouldReduceMotion = useReducedMotion();
          return (
          <motion.div 
            onClick={skipVs}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : undefined}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-dark)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <div style={{ position: 'absolute', top: 40, color: 'var(--text-secondary)', fontSize: 14 }}>Tap anywhere to skip</div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 50 }}>
              <motion.img 
                initial={{ x: shouldReduceMotion ? 0 : '-100vw', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', damping: 15, delay: 0.1 }}
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${vsData.myLead}.png`} 
                style={{ width: 300, filter: 'drop-shadow(0 0 20px var(--accent-purple))', imageRendering: 'pixelated' }}
                alt="Player Lead"
              />
              
              <motion.h1 
                initial={{ scale: shouldReduceMotion ? 1 : 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', damping: 10, delay: 0.3 }}
                style={{ fontSize: 80, fontStyle: 'italic', margin: 0, color: '#fff', textShadow: '0 0 20px var(--accent-purple)' }}
              >
                VS
              </motion.h1>
              
              <motion.img 
                initial={{ x: shouldReduceMotion ? 0 : '100vw', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', damping: 15, delay: 0.1 }}
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${vsData.oppLead}.png`} 
                style={{ width: 300, filter: 'drop-shadow(0 0 20px var(--accent-purple))', imageRendering: 'pixelated' }}
                alt="Opponent Lead"
              />
            </div>
          </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
