const express = require('express');
const http = require('http');
const os = require('os');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const COLORS = ['#ff4d4d', '#4da6ff', '#4dff88', '#ffd24d'];
const CHARACTERS = ['rabbit', 'gorilla', 'princess', 'ice'];
const WORLD = { w: 1600, h: 900 };

app.use(express.static(__dirname + '/public'));

// slot -> { id, socketId, color, character, x, y, angle, speed, input }
const players = new Array(4).fill(null);

function freeSlot() {
  return players.findIndex((p) => p === null);
}

function spawnPos(slot) {
  const cx = WORLD.w / 2, cy = WORLD.h / 2, r = 250;
  const a = (Math.PI / 2) * slot;
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, angle: a + Math.PI };
}

io.on('connection', (socket) => {
  let slot = -1;

  socket.on('join', () => {
    slot = freeSlot();
    if (slot === -1) {
      socket.emit('full');
      return;
    }
    const pos = spawnPos(slot);
    players[slot] = {
      id: 'P' + (slot + 1),
      socketId: socket.id,
      color: COLORS[slot],
      character: CHARACTERS[slot],
      x: pos.x,
      y: pos.y,
      angle: pos.angle,
      speed: 0,
      input: { steer: 0, accel: false, brake: false },
    };
    socket.emit('joined', { id: players[slot].id, color: players[slot].color, character: players[slot].character });
    io.emit('players_update', publicPlayers());
  });

  socket.on('character', (data) => {
    if (slot === -1 || !players[slot]) return;
    if (!CHARACTERS.includes(data)) return;
    players[slot].character = data;
    io.emit('players_update', publicPlayers());
  });

  socket.on('input', (data) => {
    if (slot === -1 || !players[slot]) return;
    players[slot].input.steer = Math.max(-1, Math.min(1, Number(data.steer) || 0));
    players[slot].input.accel = !!data.accel;
    players[slot].input.brake = !!data.brake;
  });

  socket.on('disconnect', () => {
    if (slot !== -1 && players[slot]) {
      players[slot] = null;
      io.emit('players_update', publicPlayers());
    }
  });
});

function publicPlayers() {
  return players.map((p) =>
    p ? { id: p.id, color: p.color, character: p.character, connected: true } : null
  );
}

// --- Física arcade sencilla ---
const ACCEL = 500;
const BRAKE = 700;
const FRICTION = 250;
const MAX_SPEED = 500;
const MAX_REVERSE = -200;
const TURN_RATE = 2.4;
const TICK_MS = 50;

setInterval(() => {
  const dt = TICK_MS / 1000;
  for (const p of players) {
    if (!p) continue;
    const { input } = p;
    if (input.accel) p.speed += ACCEL * dt;
    else if (input.brake) p.speed -= BRAKE * dt;
    else {
      if (p.speed > 0) p.speed = Math.max(0, p.speed - FRICTION * dt);
      else if (p.speed < 0) p.speed = Math.min(0, p.speed + FRICTION * dt);
    }
    p.speed = Math.max(MAX_REVERSE, Math.min(MAX_SPEED, p.speed));

    if (Math.abs(p.speed) > 5) {
      const dir = p.speed >= 0 ? 1 : -1;
      p.angle += input.steer * TURN_RATE * dt * dir;
    }

    p.x += Math.cos(p.angle) * p.speed * dt;
    p.y += Math.sin(p.angle) * p.speed * dt;

    // mundo toroidal: si sale por un borde, aparece por el otro
    if (p.x < 0) p.x += WORLD.w;
    if (p.x > WORLD.w) p.x -= WORLD.w;
    if (p.y < 0) p.y += WORLD.h;
    if (p.y > WORLD.h) p.y -= WORLD.h;
  }

  io.emit(
    'state',
    players.map((p) =>
      p
        ? { id: p.id, color: p.color, character: p.character, x: p.x, y: p.y, angle: p.angle, speed: p.speed }
        : null
    )
  );
}, TICK_MS);

function getLocalIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

server.listen(PORT, () => {
  const ip = getLocalIp();
  console.log('');
  console.log('BLOCK RACERS MVP corriendo');
  console.log('TV:         http://' + ip + ':' + PORT + '/tv');
  console.log('Controller: http://' + ip + ':' + PORT + '/controller');
  console.log('');
});
