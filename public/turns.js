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
    socket.emit('requestPlayerData', { lobbyId, playerName });

    socket.on('playerData', (data) => {
        console.log('Received player data:', data);  // Debugging log
        playerRole = data.role;
        console.log('Player Role:', playerRole);
        updateTurnUI();
    });

    // Update the UI based on the active team and player role
    function updateTurnUI() {
        const teamAElement = document.getElementById('teamA');
        const teamBElement = document.getElementById('teamB');
        const startTimerButton = document.getElementById('startTimerButton');

        console.log('Updating UI. Active Team:', activeTeam, 'Player Role:', playerRole);

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

        console.log('Button classes:', startTimerButton.className);
    }

    // Handle the start timer button click
    document.getElementById('startTimerButton').addEventListener('click', function () {
        if ((activeTeam === 'A' && playerRole === 'Team A Speaker') || 
            (activeTeam === 'B' && playerRole === 'Team B Speaker')) {
            console.log("Starting Timer");
    
            // Disable the button to prevent multiple clicks
            const startTimerButton = document.getElementById('startTimerButton');
            startTimerButton.disabled = true;
            startTimerButton.classList.add('inactive-button');
            startTimerButton.classList.remove('active-button');
    
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
        endTurn();

        const startTimerButton = document.getElementById('startTimerButton');
        startTimerButton.disabled = false;

        if ((activeTeam === 'A' && playerRole === 'Team A Speaker') || 
            (activeTeam === 'B' && playerRole === 'Team B Speaker')) {
            startTimerButton.classList.add('active-button');
            startTimerButton.classList.remove('inactive-button');
        } else {
            startTimerButton.classList.add('inactive-button');
            startTimerButton.classList.remove('active-button');
        }
    });

    // Function to end the current turn and switch teams
    function endTurn() {
        activeTeam = activeTeam === 'A' ? 'B' : 'A';
        updateTurnUI();
    }

    socket.on('newRound', (data) => {
        console.log('Received newRound event from server:', data);

        const { word, forbiddenWords } = data;

        // Update the word-to-guess element
        document.getElementById('word').textContent = word;
        console.log('Word to guess updated:', word);

        // Update the forbidden-words list
        const forbiddenList = document.getElementById('forbidden-list');
        forbiddenList.innerHTML = ''; // Clear any existing content
        forbiddenWords.forEach(word => {
            const listItem = document.createElement('li');
            listItem.textContent = word;
            forbiddenList.appendChild(listItem);
            console.log('Added forbidden word:', word);
        });
    });

    console.log(playerName)
    console.log(playerRole)
    console.log(activeTeam)
    // Initial UI setup
    updateTurnUI();
});
