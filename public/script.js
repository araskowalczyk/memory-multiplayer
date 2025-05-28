window.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  const nickname = localStorage.getItem('nickname') || 'Gracz';
  let roomName = '';
  let turn = false;
  let flippedCards = [];
  let matched = [];
  let values = [];
  let canClick = false;
  let playerId = '';
  let scores = {};
  let nicknames = {};

  const board = document.getElementById('board');
  const status = document.getElementById('status');
  const player1 = document.getElementById('player1');
  const player2 = document.getElementById('player2');
  const scoreDiv = document.getElementById('score');
  const winnerDiv = document.getElementById('winner');

  socket.emit('joinGame', nickname);

  socket.on('gameJoined', (room) => {
    roomName = room.name;
    values = room.board;
    nicknames = room.players;
    playerId = room.yourId;
    renderBoard();

    // Dodajemy przycisk OD NOWA po dołączeniu do gry
  const restartBtn = document.createElement('button');
  restartBtn.innerText = '🔄 Od nowa';
  restartBtn.style.marginTop = '20px';
  restartBtn.style.padding = '10px 20px';
  restartBtn.style.fontSize = '16px';
  restartBtn.style.cursor = 'pointer';
  restartBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  document.body.appendChild(restartBtn);  
// koniec wklejonego kodu
  });

  socket.on('playersInRoom', (nicks) => {
    nicknames = nicks;
    const ids = Object.keys(nicknames);
    player1.innerText = `Gracz 1: ${nicknames[ids[0]] || '---'}`;
    player2.innerText = `Gracz 2: ${nicknames[ids[1]] || '---'}`;
  });

  socket.on('turnUpdate', (playerSocketId) => {
    turn = playerSocketId === playerId;
    canClick = turn;
    status.innerText = turn ? 'Twój ruch!' : `Tura przeciwnika: ${nicknames[playerSocketId]}`;
    flippedCards = [];
  });

  socket.on('cardFlipped', ({ index, player }) => {
  const card = document.querySelectorAll('.card')[index];
  if (!card.classList.contains('flipped')) {
    card.classList.add('flipped');
    card.innerHTML = `<img src="images/${values[index]}" alt="karta">`;
  }
  flippedCards.push({ index, player });

  if (
    flippedCards.length === 2 &&
    flippedCards[0].player === playerId &&
    flippedCards[1].player === playerId
  ) {
    canClick = false;
    const [a, b] = flippedCards;
    const match = values[a.index] === values[b.index];

    setTimeout(() => {
      socket.emit('matchResult', { roomName, matched: match });
    }, 1000);
  }
});


  socket.on('matchChecked', ({ matched: isMatch }) => {
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

  socket.on('scoreUpdate', (newScores) => {
    scores = newScores;
    const ids = Object.keys(nicknames);
    const score1 = scores[ids[0]] || 0;
    const score2 = scores[ids[1]] || 0;
    scoreDiv.innerText = `Wynik: ${score1} : ${score2}`;
  });

  socket.on('gameOver', ({ winner, nicknames: nicks, scores }) => {
    const ids = Object.keys(nicks);
    const score1 = scores[ids[0]];
    const score2 = scores[ids[1]];
    if (winner) {
      winnerDiv.innerText = `🎉 Wygrał: ${winner}! Wynik końcowy: ${score1} : ${score2}`;
    } else {
      winnerDiv.innerText = `🤝 Remis! Wynik końcowy: ${score1} : ${score2}`;
    }
    winnerDiv.style.display = 'block';
    canClick = false;
    turn = false;
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
