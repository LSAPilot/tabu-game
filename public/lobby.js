const socket = io();
const lobbyId = window.location.pathname.split('/').pop();
const lobbyInfo = document.getElementById('lobbyInfo');
const startGameButton = document.getElementById('startGameButton');

const playerName = localStorage.getItem('playerName');

socket.emit('joinLobby', { lobbyId, playerName });

socket.on('updateLobby', (lobby) => {
    lobby.players.forEach(player => {
        if (player.role) {
            const button = document.querySelector(`button[data-role="${player.role}"]`);
            if (button) {
                button.textContent = player.name; // Display player's name in the button
                button.disabled = true; // Disable the button for other users
            }
        }
    });
});

startGameButton.addEventListener('click', () => {
    socket.emit('startGame', lobbyId);
});

function selectRole(team, role) {
    socket.emit('selectRole', { lobbyId, playerName, team, role });
    
}

socket.on('roleSelected', ({ team, role, name }) => {
    const button = document.querySelector(`button[data-role="${team} ${role}"]`);
    if (button) {
        button.textContent = name; // Display player's name in the button
        button.disabled = true; // Disable the button for other users
    }
});

socket.on('startGame', () => {
    // Redirect to the game page or start the game logic here
    alert('Game started!');
});

socket.on('gameStarted', () => {
    window.location.href = `/game/${lobbyId}`;
});

