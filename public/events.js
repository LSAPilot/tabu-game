import { getPlayerRole, getActiveTeam } from './socket.js';

export function initializeEventListeners(socket) {
    document.getElementById('startTimerButton').addEventListener('click', () => {
        const playerRole = getPlayerRole();
        const activeTeam = getActiveTeam();
        const lobbyId = window.location.pathname.split('/').pop();

        if ((activeTeam === 'A' && playerRole === 'Team A Speaker') || 
            (activeTeam === 'B' && playerRole === 'Team B Speaker')) {
            console.log("Starting Timer");

            const startTimerButton = document.getElementById('startTimerButton');
            startTimerButton.disabled = true;
            startTimerButton.classList.add('inactive-button');
            startTimerButton.classList.remove('active-button');

            socket.emit('startTimer', lobbyId, 60); // Start a 60-second timer
        }
    });
}
