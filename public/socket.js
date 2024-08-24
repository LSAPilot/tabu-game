// socket.js

import { updateTurnUI, handleTimerUpdate, handleNewRound, handleTimerEnd } from './ui.js';

let playerRole = null;
let activeTeam = 'A';

export function initializeSocket() {
    const socket = io();
    const playerName = localStorage.getItem('playerName');
    const lobbyId = window.location.pathname.split('/').pop();

    // Join the lobby with the stored player name
    socket.emit('joinLobby', { lobbyId, playerName });

    // Listen for the role assigned by the server
    socket.emit('requestPlayerData', { lobbyId, playerName });

    socket.on('playerData', (data) => {
        console.log('Received player data:', data);
        playerRole = data.role;
        updateTurnUI(playerRole, activeTeam);
    });

    socket.on('timerUpdate', (timeLeft) => {
        handleTimerUpdate(timeLeft);
    });

    socket.on('timerEnd', () => {
        handleTimerEnd(socket, playerRole, activeTeam);
        activeTeam = activeTeam === 'A' ? 'B' : 'A';
        updateTurnUI(playerRole, activeTeam);
    });

    socket.on('newRound', (data) => {
        handleNewRound(data);
    });

    return socket;
}

export function getPlayerRole() {
    return playerRole;
}

export function getActiveTeam() {
    return activeTeam;
}

export function setActiveTeam(team) {
    activeTeam = team;
}
