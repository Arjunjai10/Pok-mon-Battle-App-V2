const { io } = require('socket.io-client');

const URL = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runTest() {
  console.log('--- STARTING SOCKET TEST ---');
  
  const p1 = io(URL);
  const p2 = io(URL);

  let roomId = null;

  p1.on('auth-success', (data) => console.log('P1 Auth Success:', data));
  p2.on('auth-success', (data) => console.log('P2 Auth Success:', data));
  p1.on('error', err => console.log('P1 Error:', err));
  p2.on('error', err => console.log('P2 Error:', err));

  await sleep(500);

  console.log('\n--- AUTHENTICATING ---');
  p1.emit('auth', { userId: 'player_one' });
  p2.emit('auth', { userId: 'player_two' });

  await sleep(500);

  const team1 = [{
    pokemonId: 25,
    nickname: 'Sparky',
    moveset: ['thunderbolt', 'quick-attack', 'thunder-wave', 'surf'],
    heldItem: 'Magnet'
  }];

  const team2 = [{
    pokemonId: 1,
    nickname: 'Bulba',
    moveset: ['tackle', 'vine-whip', 'growl', 'leech-seed'],
    heldItem: 'Miracle Seed'
  }];

  console.log('\n--- CREATING ROOM ---');
  p1.emit('create-room', { team: team1 });
  
  p1.on('room-created', (data) => {
    console.log('Room Created:', data.roomId);
    roomId = data.roomId;
  });

  await sleep(500);

  console.log('\n--- JOINING ROOM ---');
  p2.emit('join-room', { roomId, team: team2 });

  p2.on('room-joined', (data) => {
    console.log('P2 Joined Room:', data.room.roomId);
  });

  await sleep(500);

  console.log('\n--- SUBMITTING ACTIONS ---');
  // Need to listen to turn-result
  p1.on('turn-result', data => {
    console.log('P1 Turn Result received:', JSON.stringify(data, null, 2));
  });
  p2.on('turn-result', data => {
    console.log('P2 Turn Result received:', JSON.stringify(data, null, 2));
  });

  // Action format from our engine test: { type: 'switch', switchTo: 1 } or { type: 'move', move: {...} }
  // We just pass dummy moves
  p1.emit('submit-action', { action: { type: 'move', move: 'thunderbolt' } });
  console.log('P1 submitted action (waiting for P2...)');
  await sleep(500);
  console.log('P2 submitting action...');
  p2.emit('submit-action', { action: { type: 'move', move: 'tackle' } });

  await sleep(500);

  console.log('\n--- DISCONNECT & RECONNECT TEST ---');
  p2.on('opponent-reconnecting', (data) => {
    console.log('P2 received opponent-reconnecting. Seconds remaining:', data.secondsRemaining);
  });

  p2.on('opponent-reconnected', () => {
    console.log('P2 received opponent-reconnected!');
  });

  p1.on('reconnect-success', (data) => {
    console.log('P1 reconnected to room successfully.');
  });

  console.log('P1 Disconnecting...');
  p1.disconnect();

  await sleep(2500); // wait for a couple of timer ticks

  console.log('P1 Reconnecting...');
  p1.connect();
  p1.emit('auth', { userId: 'player_one' });
  await sleep(500);
  p1.emit('reconnect-room', { roomId });

  await sleep(1000);

  console.log('\n--- FINISHED TEST ---');
  p1.disconnect();
  p2.disconnect();
}

runTest();
