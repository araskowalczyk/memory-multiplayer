window.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  let roomName = '';
  let turn = false;
  let flippedCards = [];
  let matched = [];
  let values = [];

  const board = document.getElementById('board');
  const status = document.getElementById('status');

  socket.emit('joinGame');

  socket.on('gameJoined', (room) => {
    roomName = room.name;
    values = room.board;
    renderBoard();
    status.innerText = 'Oczekiwanie na drugiego gracza...';
  });

  socket.on('playersInRoom', (players) => {
    if (players.length === 2) {
      status.innerText = 'Gra rozpoczęta!';
    }
  });

  socket.on('turnUpdate', (playerId) => {
    console.log("Tura gracza:", playerId); // DEBUG
    turn = playerId === socket.id;
    status.innerText = turn ? 'Twój ruch!' : 'Tura przeciwnika...';
  });

  socket.on('cardFlipped', ({ index, player }) => {
    const card = document.querySelectorAll('.card')[index];
    card.classList.add('flipped');
    card.textContent = values[index];
    flippedCards.push({ index, player });

    if (flippedCards.length === 2) {
      const [a, b] = flippedCards;
      const match = values[a.index] === values[b.index];
      setTimeout(() => {
        socket.emit('matchResult', { roomName, matched: match });
      }, 1000);
    }
  });

  socket.on('matchChecked', ({ matched: isMatch, player }) => {
    if (!isMatch) {
      flippedCards.forEach(({ index }) => {
        const c = document.querySelectorAll('.card')[index];
        c.classList.remove('flipped');
        c.textContent = '';
      });
    } else {
      matched.push(...flippedCards.map(fc => fc.index));
    }
    flippedCards = [];
  });

  function renderBoard() {
    board.innerHTML = '';
    values.forEach((v, i) => {
      const div = document.createElement('div');
      div.className = 'card';
      div.addEventListener('click', () => {
        if (
          turn &&
          !div.classList.contains('flipped') &&
          flippedCards.length < 2 &&
          !matched.includes(i)
        ) {
          socket.emit('flipCard', { roomName, index: i });
        }
      });
      board.appendChild(div);
    });
  }
});
