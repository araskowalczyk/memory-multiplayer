// Kompletny kod klienta (script.js)
window.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  let roomName = '';
  let turn = false;
  let flippedCards = [];
  let matched = [];
  let values = [];
  let canClick = true;

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
    turn = playerId === socket.id;
    canClick = true;
    status.innerText = turn ? 'Twój ruch!' : 'Tura przeciwnika...';
    flippedCards = [];
  });

  socket.on('cardFlipped', ({ index, player }) => {
    const card = document.querySelectorAll('.card')[index];
    if (!card.classList.contains('flipped')) {
      card.classList.add('flipped');
      card.textContent = values[index];
    }
    flippedCards.push({ index, player });

    if (
      flippedCards.length === 2 &&
      flippedCards[0].player === flippedCards[1].player
    ) {
      canClick = false;
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
        const card = document.querySelectorAll('.card')[index];
        card.classList.remove('flipped');
        card.textContent = '';
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
          canClick &&
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
