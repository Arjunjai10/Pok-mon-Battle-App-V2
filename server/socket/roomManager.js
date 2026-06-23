const { resolveTurn } = require('../engine/battleEngine');
const { hydrateTeam } = require('../engine/hydrateTeam');

const rooms = new Map();

const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

function createRoom(hostId, hostTeam) {
  const roomId = generateRoomId();
  rooms.set(roomId, {
    roomId,
    players: {
      player1: { id: hostId, team: hostTeam, connected: true },
      player2: null
    },
    gameState: null,
    turnBuffer: {},
    disconnectTimer: null,
    countdownInterval: null
  });
  return roomId;
}

function joinRoom(roomId, guestId, guestTeam) {
  const room = rooms.get(roomId);
  if (!room) throw new Error('Room not found');
  if (room.players.player2) throw new Error('Room is full');
  if (room.players.player1.id === guestId) throw new Error('Cannot join your own room');
  
  room.players.player2 = { id: guestId, team: guestTeam, connected: true };
  
  const hydratedP1 = hydrateTeam(room.players.player1.team);
  const hydratedP2 = hydrateTeam(guestTeam);

  room.gameState = {
    p1: { active: hydratedP1[0], team: hydratedP1 },
    p2: { active: hydratedP2[0], team: hydratedP2 },
    turnCount: 0
  };
  return room;
}

function submitAction(roomId, playerId, action) {
  const room = rooms.get(roomId);
  if (!room) throw new Error('Room not found');
  
  let isP1 = room.players.player1.id === playerId;
  let isP2 = room.players.player2 && room.players.player2.id === playerId;
  
  if (!isP1 && !isP2) throw new Error('Player not in room');
  
  const pKey = isP1 ? 'p1' : 'p2';
  
  if (room.turnBuffer[pKey]) {
    throw new Error('Action already submitted for this turn');
  }
  
  room.turnBuffer[pKey] = action;
  
    if (room.turnBuffer.p1 && room.turnBuffer.p2) {
      const p1Action = { ...room.turnBuffer.p1 };
      const p2Action = { ...room.turnBuffer.p2 };
      
      room.turnBuffer = {};
      
      // Map move names to full move objects
      if (p1Action.type === 'move') {
        const moveName = typeof p1Action.move === 'string' ? p1Action.move : p1Action.move.name;
        p1Action.move = room.gameState.p1.active.moves.find(m => m.name === moveName) || room.gameState.p1.active.moves[0];
      }
      if (p2Action.type === 'move') {
        const moveName = typeof p2Action.move === 'string' ? p2Action.move : p2Action.move.name;
        p2Action.move = room.gameState.p2.active.moves.find(m => m.name === moveName) || room.gameState.p2.active.moves[0];
      }
      
      // Engine call
    const { newState, turnEvents, log } = resolveTurn(room.gameState, p1Action, p2Action);

    room.gameState = newState;
    
    return {
      resolved: true,
      turnData: { newState, turnEvents, log }
    };
  }
  
  return { resolved: false };
}

function handleDisconnect(roomId, playerId, emitCallback, destroyCallback) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  let isP1 = room.players.player1.id === playerId;
  let isP2 = room.players.player2 && room.players.player2.id === playerId;
  
  if (isP1) room.players.player1.connected = false;
  else if (isP2) room.players.player2.connected = false;
  else return;

  let secondsRemaining = 90;
  
  if (room.countdownInterval) clearInterval(room.countdownInterval);
  if (room.disconnectTimer) clearTimeout(room.disconnectTimer);
  
  emitCallback(secondsRemaining);
  room.countdownInterval = setInterval(() => {
    secondsRemaining -= 1;
    if (secondsRemaining > 0 && secondsRemaining % 10 === 0) {
      emitCallback(secondsRemaining);
    }
    if (secondsRemaining <= 0) {
      clearInterval(room.countdownInterval);
    }
  }, 1000);
  
  room.disconnectTimer = setTimeout(() => {
    clearInterval(room.countdownInterval);
    rooms.delete(roomId);
    destroyCallback();
  }, 90000);
}

function handleReconnect(roomId, playerId) {
  const room = rooms.get(roomId);
  if (!room) throw new Error('Room not found');
  
  let isP1 = room.players.player1.id === playerId;
  let isP2 = room.players.player2 && room.players.player2.id === playerId;
  
  if (!isP1 && !isP2) throw new Error('Player not in room');
  
  if (isP1) room.players.player1.connected = true;
  if (isP2) room.players.player2.connected = true;
  
  if (room.disconnectTimer) {
    clearTimeout(room.disconnectTimer);
    room.disconnectTimer = null;
  }
  if (room.countdownInterval) {
    clearInterval(room.countdownInterval);
    room.countdownInterval = null;
  }
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

module.exports = {
  createRoom,
  joinRoom,
  submitAction,
  handleDisconnect,
  handleReconnect,
  getRoom
};
