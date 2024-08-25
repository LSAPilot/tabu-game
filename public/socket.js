// socket.js

import { updateTurnUI, handleTimerUpdate, handleNewRound, handleTimerEnd, updateScoreUi, activateButtons, updateRoundsUi, updateWinner } from './ui.js';

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

    socket.on('enableButtons', (timeLeft) => {
        activateButtons(timeLeft);
    });

    socket.on('timerEnd', () => {
        handleTimerEnd(socket, playerRole, activeTeam);
        activeTeam = activeTeam === 'A' ? 'B' : 'A';
        updateTurnUI(playerRole, activeTeam);
    });

    socket.on('newRound', (data) => {
        handleNewRound(data);
    });

    socket.on('clearWords', () => {
        console.log('Received clearWords event from server. Clearing current words.');

        document.getElementById('word').textContent = '';
        const forbiddenList = document.getElementById('forbidden-list');
        forbiddenList.innerHTML = '';
    });

    socket.on('updateScores', (data) => {
        updateScoreUi(data);
    })

    socket.on('updateRounds', (data) => {
        updateRoundsUi(data);
    })

    socket.on('gameEnd', (data) => {
        updateWinner(data);
    })

    socket.on('buzz', ()=> {            //TODO: Add animation for buzzing and confirming
        console.log("buzzed");
        const overlay = document.getElementById('red-overlay');
        const body = document.body;

        // Show red overlay
        overlay.classList.add('show');

        // Add screen shake effect
        body.classList.add('shake');

        // Remove both effects after 1 second
        setTimeout(() => {
            overlay.classList.remove('show');
            body.classList.remove('shake');
        }, 300);
    })

    socket.on('confirm', ()=> {
        console.log("confirmed");
        const overlay = document.getElementById('green-overlay');
        overlay.classList.add('show');

        setTimeout(() => {
        overlay.classList.remove('show');
        }, 300); 
    })

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
