'use client';
import { useEffect, useState } from 'react';
import { getSocket } from '../../lib/socket';

export default function Lobby() {
  const [user, setUser] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [team, setTeam] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => {
        if (!r.ok) throw new Error('Unauth');
        return r.json();
      })
      .then(data => {
        setUser(data.user);
        const socket = getSocket();
        socket.emit('auth', { userId: data.user.id }); // Use Mongo ID to match backend? Wait, user.userID is better if we use userID in activeUsers.
        // Let's use user.id just in case, wait, activeUsers uses what? Let's check.
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
  }, []);

  const handleCreate = () => {
    if (!team) return alert('Build a team first!');
    const socket = getSocket();
    socket.emit('auth', { userId: user.id }); // Ensure auth
    setTimeout(() => {
      socket.emit('create-room', { team });
    }, 100);
    socket.on('room-created', data => {
      setRoomId(data.roomId);
    });
  };

  const handleJoin = () => {
    if (!team) return alert('Build a team first!');
    if (!roomId) return alert('Enter a room ID');
    const socket = getSocket();
    socket.emit('auth', { userId: user.id });
    setTimeout(() => {
      socket.emit('join-room', { roomId, team });
    }, 100);
  };

  useEffect(() => {
    const socket = getSocket();
    const handleRoomJoined = (data) => {
      window.location.href = '/battle/' + data.room.roomId;
    };
    socket.on('room-joined', handleRoomJoined);
    return () => {
      socket.off('room-joined', handleRoomJoined);
    }
  }, []);

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h1>Lobby</h1>
      <p>Welcome, {user.userID}</p>
      
      {!team && <p style={{color: 'red'}}>You must build a team before battling!</p>}

      <div style={{ marginTop: 20 }}>
        <button onClick={handleCreate} disabled={!team}>Create Room</button>
        {roomId && (
          <p onClick={() => navigator.clipboard.writeText(roomId)} style={{cursor: 'pointer'}}>
            Room Code: <strong>{roomId}</strong> (Tap to copy)
          </p>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <input placeholder="Room Code" value={roomId} onChange={e => setRoomId(e.target.value)} />
        <button onClick={handleJoin} disabled={!team}>Join Room</button>
      </div>
    </div>
  );
}
