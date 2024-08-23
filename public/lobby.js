const socket = io();
const lobbyId = window.location.pathname.split('/').pop();
const lobbyInfo = document.getElementById('lobbyInfo');
const startGameButton = document.getElementById('startGameButton');

const playerName = localStorage.getItem('playerName');

socket.emit('joinLobby', { lobbyId, playerName });

socket.on('updateLobby', (lobby) => {
    lobbyInfo.innerHTML = `
        <h3>Players in Lobby:</h3>
        <ul>
            ${lobby.players.map(player => `<li>${player.name} (${player.role || 'No role'})</li>`).join('')}
        </ul>
    `;
});

startGameButton.addEventListener('click', () => {
    socket.emit('startGame', lobbyId);
});

function selectRole(team, role) {
    socket.emit('selectRole', { lobbyId, playerName, team, role });
}

socket.on('startGame', () => {
    // Redirect to the game page or start the game logic here
    alert('Game started!');
});
