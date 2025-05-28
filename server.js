const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let rooms = {};

io.on('connection', (socket) => {
  console.log(`[Nowe połączenie] ${socket.id}`);

  socket.on('joinGame', (nickname) => {
    const roomName = findOrCreateRoom(socket, nickname);
    const room = rooms[roomName];

    socket.emit('gameJoined', {
      name: roomName,
      board: room.board,
      players: room.nicknames,
      yourId: socket.id
    });

    if (Object.keys(room.players).length === 2) {
      io.to(roomName).emit('playersInRoom', room.nicknames);
      room.currentTurn = Object.keys(room.players)[0];
      io.to(roomName).emit('turnUpdate', room.currentTurn);
      io.to(roomName).emit('scoreUpdate', room.scores);
    }
  });

  socket.on('flipCard', ({ roomName, index }) => {
    const room = rooms[roomName];
    if (!room || room.currentTurn !== socket.id) return;

    io.to(roomName).emit('cardFlipped', { index, player: socket.id });
  });

  socket.on('matchResult', ({ roomName, matched }) => {
    const room = rooms[roomName];
    if (!room) return;

    if (matched) {
      room.scores[socket.id]++;
    }

    io.to(roomName).emit('matchChecked', { matched, player: socket.id });
    io.to(roomName).emit('scoreUpdate', room.scores);

    const totalFound = Object.values(room.scores).reduce((a, b) => a + b, 0);
    if (totalFound >= room.board.length / 2) {
      // KONIEC GRY
      const [p1, p2] = Object.keys(room.players);
      const s1 = room.scores[p1];
      const s2 = room.scores[p2];
      const nick1 = room.nicknames[p1];
      const nick2 = room.nicknames[p2];

      let winner;
      if (s1 > s2) winner = nick1;
      else if (s2 > s1) winner = nick2;
      else winner = null;

      io.to(roomName).emit('gameOver', {
        scores: room.scores,
        nicknames: room.nicknames,
        winner
      });

      delete rooms[roomName]; // opcjonalnie
    } else {
      const next = Object.keys(room.players).find(id => id !== socket.id);
      room.currentTurn = next;
      io.to(roomName).emit('turnUpdate', next);
    }
  });

  socket.on('disconnect', () => {
    for (let r in rooms) {
      if (rooms[r].players[socket.id]) {
        delete rooms[r].players[socket.id];
        delete rooms[r].nicknames[socket.id];
        delete rooms[r].scores[socket.id];
        io.to(r).emit('playersInRoom', rooms[r].nicknames);
      }
    }
  });
});

function findOrCreateRoom(socket, nickname) {
  for (let r in rooms) {
    if (Object.keys(rooms[r].players).length < 2) {
      rooms[r].players[socket.id] = true;
      rooms[r].nicknames[socket.id] = nickname;
      rooms[r].scores[socket.id] = 0;
      socket.join(r);
      return r;
    }
  }

  const roomName = 'room_' + Math.random().toString(36).substring(7);
  rooms[roomName] = {
    players: {},
    nicknames: {},
    scores: {},
    board: generateBoard(),
    currentTurn: null
  };
  rooms[roomName].players[socket.id] = true;
  rooms[roomName].nicknames[socket.id] = nickname;
  rooms[roomName].scores[socket.id] = 0;
  socket.join(roomName);
  return roomName;
}

function generateBoard() {
  const images = Array.from({ length: 20 }, (_, i) => `img${i + 1}.png`);
  const cards = [...images, ...images]; // 2 kopie = 40 kart
  return cards.sort(() => 0.5 - Math.random());
}

server.listen(3000, () => {
  console.log('✅ Serwer działa na porcie 3000');
});
