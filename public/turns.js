document.addEventListener('DOMContentLoaded', function () {
    const socket = io();
    let teamAScore = 0;
    let teamBScore = 0;
    let activeTeam = 'A';
    let playerRole = null;

    const playerName = localStorage.getItem('playerName');
    const lobbyId = window.location.pathname.split('/').pop();

    // Join the lobby with the stored player name
    socket.emit('joinLobby', { lobbyId, playerName });

    // Listen for the role assigned by the server
    socket.on('roleAssigned', (data) => {
        playerRole = data.role;
        console.log('Assigned role:', playerRole);
        updateTurnUI();
    });

    // Update the UI based on the active team and player role
    function updateTurnUI() {
        const teamAElement = document.getElementById('teamA');
        const teamBElement = document.getElementById('teamB');
        const startTimerButton = document.getElementById('startTimerButton');

        if (activeTeam === 'A') {
            teamAElement.classList.add('active-team');
            teamBElement.classList.remove('active-team');
            startTimerButton.disabled = playerRole !== 'Team A Speaker';
            startTimerButton.classList.toggle('active-button', playerRole === 'Team A Speaker');
            startTimerButton.classList.toggle('inactive-button', playerRole !== 'Team A Speaker');
        } else {
            teamAElement.classList.remove('active-team');
            teamBElement.classList.add('active-team');
            startTimerButton.disabled = playerRole !== 'Team B Speaker';
            startTimerButton.classList.toggle('active-button', playerRole === 'Team B Speaker');
            startTimerButton.classList.toggle('inactive-button', playerRole !== 'Team B Speaker');
        }
    }

    // Handle the start timer button click
    document.getElementById('startTimerButton').addEventListener('click', function () {
        if ((activeTeam === 'A' && playerRole === 'Team A Speaker') || 
            (activeTeam === 'B' && playerRole === 'Team B Speaker')) {
            socket.emit('startTimer', lobbyId, 60); // Start a 60-second timer
        }
    });

    // Listen for timer updates from the server
    socket.on('timerUpdate', (timeLeft) => {
        document.getElementById('timer').textContent = timeLeft;
    });

    // Handle the end of the timer
    socket.on('timerEnd', () => {
        console.log('Timer ended');
        endTurn(); // End the current turn and switch to the other team
    });

    // Function to end the current turn and switch teams
    function endTurn() {
        activeTeam = activeTeam === 'A' ? 'B' : 'A';
        updateTurnUI();
    }

    // Initial UI setup
    updateTurnUI();
});
