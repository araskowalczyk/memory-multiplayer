const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let rooms = {};

io.on('connection', (socket) => {
  console.log(`Połączono: ${socket.id}`);

  socket.on('joinGame', () => {
    const roomName = findOrCreateRoom(socket);
    const room = rooms[roomName];

    socket.emit('gameJoined', { name: roomName, board: room.board });

    if (Object.keys(room.players).length === 2 && !room.currentTurn) {
      room.currentTurn = Object.keys(room.players)[0];
      io.to(roomName).emit('playersInRoom', Object.keys(room.players));
      io.to(roomName).emit('turnUpdate', room.currentTurn);
    }
  });

  socket.on('flipCard', ({ roomName, index }) => {
    io.to(roomName).emit('cardFlipped', { index, player: socket.id });
  });

  socket.on('matchResult', ({ roomName, matched }) => {
    const room = rooms[roomName];
    if (!room || !room.players) return;

    io.to(roomName).emit('matchChecked', { matched, player: socket.id });

    // Niezależnie od trafienia: zmiana tury
    const players = Object.keys(room.players);
    const nextPlayer = players.find(id => id !== socket.id);

    setTimeout(() => {
      if (nextPlayer) {
        room.currentTurn = nextPlayer;
        io.to(roomName).emit('turnUpdate', nextPlayer);
      }
    }, 1000);
  });

  socket.on('disconnect', () => {
    for (let r in rooms) {
      if (rooms[r].players[socket.id]) {
        delete rooms[r].players[socket.id];
        if (Object.keys(rooms[r].players).length === 0) {
          delete rooms[r];
        }
        break;
      }
    }
  });
});

function findOrCreateRoom(socket) {
  for (let r in rooms) {
    if (Object.keys(rooms[r].players).length < 2) {
      rooms[r].players[socket.id] = true;
      socket.join(r);
      return r;
    }
  }

  const roomName = 'room_' + Math.random().toString(36).substring(7);
  rooms[roomName] = {
    players: {},
    board: generateBoard(),
    currentTurn: null
  };
  rooms[roomName].players[socket.id] = true;
  socket.join(roomName);
  return roomName;
}

function generateBoard() {
  const cards = [...'AABBCCDDEEFFGGHH'];
  return cards.sort(() => 0.5 - Math.random());
}

server.listen(3000, () => {
  console.log('✅ Serwer działa na porcie 3000');
});
