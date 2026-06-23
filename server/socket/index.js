const {
  createRoom,
  joinRoom,
  submitAction,
  handleDisconnect,
  handleReconnect,
  getRoom
} = require('./roomManager');

const activeUsers = new Map();

function setupSocket(io) {
  io.on('connection', (socket) => {
    let currentRoomId = null;
    let currentUserId = null;

    socket.on('auth', (data) => {
      try {
        if (!data || !data.userId) throw new Error('UserId required for auth');
        currentUserId = data.userId;
        activeUsers.set(currentUserId, socket.id);
        socket.emit('auth-success', { userId: currentUserId });
      } catch (err) {
        socket.emit('error', { type: 'error', message: err.message });
      }
    });

    socket.on('create-room', (data) => {
      try {
        if (!currentUserId) throw new Error('Must be authenticated');
        const { team } = data;
        const roomId = createRoom(currentUserId, team);
        currentRoomId = roomId;
        socket.join(roomId);
        socket.emit('room-created', { roomId });
      } catch (err) {
        socket.emit('error', { type: 'error', message: err.message });
      }
    });

    socket.on('join-room', (data) => {
      try {
        if (!currentUserId) throw new Error('Must be authenticated');
        const { roomId, team } = data;
        const room = joinRoom(roomId, currentUserId, team);
        currentRoomId = roomId;
        socket.join(roomId);
        io.to(roomId).emit('room-joined', { room });
      } catch (err) {
        socket.emit('error', { type: 'error', message: err.message });
      }
    });

    socket.on('submit-action', (data) => {
      try {
        if (!currentUserId || !currentRoomId) throw new Error('Not in a room');
        const { action } = data;
        
        const result = submitAction(currentRoomId, currentUserId, action);
        if (result.resolved) {
          io.to(currentRoomId).emit('turn-result', result.turnData);
        }
      } catch (err) {
        socket.emit('error', { type: 'error', message: err.message });
      }
    });

    socket.on('request-state', () => {
      try {
        if (!currentRoomId) return;
        const room = getRoom(currentRoomId);
        if (room) {
          socket.emit('initial-state', { gameState: room.gameState });
        }
      } catch (err) {
        // ignore
      }
    });

    socket.on('invite-friend', (data) => {
      try {
        if (!currentUserId) throw new Error('Must be authenticated');
        const { targetUserId } = data;
        const targetSocketId = activeUsers.get(targetUserId);
        if (!targetSocketId) {
          throw new Error('Friend is offline');
        }
        io.to(targetSocketId).emit('friend-invite', { fromUserId: currentUserId });
      } catch (err) {
        socket.emit('error', { type: 'error', message: err.message });
      }
    });

    socket.on('reconnect-room', (data) => {
      try {
        if (!currentUserId) throw new Error('Must be authenticated');
        const { roomId } = data;
        handleReconnect(roomId, currentUserId);
        currentRoomId = roomId;
        socket.join(roomId);
        const room = getRoom(roomId);
        socket.to(roomId).emit('opponent-reconnected');
        socket.emit('reconnect-success', { room });
      } catch (err) {
        socket.emit('error', { type: 'error', message: err.message });
      }
    });

    socket.on('disconnect', () => {
      try {
        if (currentUserId) activeUsers.delete(currentUserId);
        
        if (currentRoomId && currentUserId) {
          handleDisconnect(
            currentRoomId,
            currentUserId,
            (secondsRemaining) => {
              io.to(currentRoomId).emit('opponent-reconnecting', { secondsRemaining });
            },
            () => {
              io.to(currentRoomId).emit('opponent-disconnected');
            }
          );
        }
      } catch (err) {
        console.error('Disconnect error:', err);
      }
    });
  });
}

module.exports = setupSocket;
