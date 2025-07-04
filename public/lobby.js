const socket = io();
const lobbyId = window.location.pathname.split('/').pop();
const lobbyInfo = document.getElementById('lobbyInfo');
const startGameButton = document.getElementById('startGameButton');

const playerName = localStorage.getItem('playerName');

socket.emit('joinLobby', { lobbyId, playerName });

socket.on('updateLobby', (lobby) => {
    document.querySelectorAll('button[data-role]').forEach(btn => {
        btn.textContent = 'Choose';
        btn.disabled = false;
    });

    const unassignedList = document.getElementById('unassignedPlayers');
    unassignedList.innerHTML = '';

    lobby.players.forEach(player => {
        if (player.role === 'Unassigned') {
            // Add to unassigned list
            const li = document.createElement('li');
            li.textContent = player.name;
            unassignedList.appendChild(li);
        } else if (player.role && player.role.startsWith('Team')) {
            const button = document.querySelector(`button[data-role="${player.role}"]`);
            if (button) {
                button.textContent = player.name;
                button.disabled = true;
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
        button.textContent = name; 
        button.disabled = true; 
    }
});

socket.on('roleFreed', ({ role }) => {
    const button = document.querySelector(`button[data-role="${role}"]`);
    if (button) {
        button.textContent = "Choose"; 
        button.disabled = false; 
    }
});

socket.on('startGame', () => {
    alert('Game started!');
});

socket.on('gameStarted', () => {
    window.location.href = `/game/${lobbyId}`;
});
