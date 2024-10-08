const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the 'public' directory
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// Lobby system to manage lobbies and players
let lobbies = {};

// Helper Functions

// Function to read a random phrase from the JSON file
function getRandomPhrase(callback) {
    const phrasesPath = path.join(__dirname, 'public/phrases.json');
    fs.readFile(phrasesPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading phrases file:', err);
            return callback(null);
        }

        const phrases = JSON.parse(data).Begriffe;
        const randomIndex = Math.floor(Math.random() * phrases.length);
        const selectedPhrase = phrases[randomIndex];
        callback(selectedPhrase);
    });
}

// Function to start a new round and select a word
function startNewRound(lobbyId) {
    getRandomPhrase((phrase) => {
        if (!phrase) {
            console.error('Failed to retrieve a phrase.');
            return;
        }

        const lobby = lobbies[lobbyId];
        if (!lobby) return;

        const activeTeam = lobby.activeTeam; // Determine the active team
        const guesserRole = `Team ${activeTeam} Guesser`;

        // Store the phrase in the lobby's state
        lobby.currentPhrase = phrase;
        console.log(`New phrase for lobby ${lobbyId}:`, phrase);

        // Broadcast the word and forbidden words to all players
        // The guesser of the active team receives question marks instead of the actual phrase
        lobby.players.forEach(player => {
            if (player.role === guesserRole) {
                io.to(player.id).emit('newRound', {
                    word: '???',
                    forbiddenWords: phrase["Tabu-Wörter"].map(() => '???')
                });
            } else {
                io.to(player.id).emit('newRound', {
                    word: phrase.Begriff,
                    forbiddenWords: phrase["Tabu-Wörter"]
                });
                console.log(`Broadcasting phrase to ${player.name} (role: ${player.role})`);
            }
        });
    });
}

// Function to manage the countdown timer
function startTimer(lobbyId, duration) {
    let timeLeft = duration;

    // Notify clients that the timer has started
    io.to(lobbyId).emit('timerUpdate', duration);
    io.to(lobbyId).emit('enableButtons', timeLeft);

    const timerInterval = setInterval(() => {
        timeLeft--;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);

            // Notify clients that the timer has ended
            io.to(lobbyId).emit('timerEnd');

            evaluateRoundOutcome(lobbyId);
            checkRoundScore(lobbyId);
            console.log(`Timer ended for lobby ${lobbyId}`);
        }
    }, 1000);
}

// Function to handle player joining a lobby
function handleJoinLobby(socket, lobbyId, playerName) {
    if (!lobbies[lobbyId]) {
        lobbies[lobbyId] = { players: [] };
    }

    let player = lobbies[lobbyId].players.find(p => p.name === playerName);

    if (player) {
        player.id = socket.id; // Update socket ID for reconnects
    } else {
        player = { id: socket.id, name: playerName, role: null };
        lobbies[lobbyId].players.push(player);
    }

    socket.join(lobbyId);
    io.to(lobbyId).emit('updateLobby', lobbies[lobbyId]);
    console.log(`${playerName} joined lobby ${lobbyId}`);
}

// Function to handle role selection
function handleSelectRole(socket, lobbyId, playerName, team, role) {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    const player = lobby.players.find(p => p.name === playerName);
    if (!player) return;

    const roleName = `${team} ${role}`;
    const roleTaken = lobby.players.some(p => p.role === roleName);

    if (!roleTaken) {
        // Free the old role if the player has one
        if (player.role) {
            const oldRole = player.role;
            io.to(lobbyId).emit('roleFreed', { role: oldRole });
        }

        // Assign the new role
        player.role = roleName;
        io.to(lobbyId).emit('roleSelected', { team, role, name: playerName });
        socket.emit('roleAssigned', { role: roleName });
        console.log(`${playerName} selected role ${roleName}`);
    } else {
        socket.emit('roleTaken', { team, role });
    }
}

// Function to handle player disconnection
function handleDisconnect(socket) {
    console.log('User disconnected:', socket.id);
    for (const [lobbyId, lobby] of Object.entries(lobbies)) {
        const player = lobby.players.find(player => player.id === socket.id);
        if (player) {
            player.id = null; // Mark player as disconnected, but keep their role and other data
            console.log(`Player ${player.name} marked as disconnected in lobby ${lobbyId}`);
            break;
        }
    }
}

// Function to handle the confirm word event
function handleConfirmWord(socket, lobbyId) {
    const lobby = lobbies[lobbyId];
    console.log(lobbies, lobbyId);
    if (!lobby) return; // If the lobby doesn't exist, exit the function

    const activeTeam = lobby.activeTeam;

    // Initialize the scores if they don't exist
    lobby.teamAScore = lobby.teamAScore || 0;
    lobby.teamBScore = lobby.teamBScore || 0;

    // Increment the appropriate team's score
    if (activeTeam === 'A') {
        lobby.teamAScore += 1;
    } else {
        lobby.teamBScore += 1;
    }

    console.log(`Team ${activeTeam} score updated: ${lobby.teamAScore}-${lobby.teamBScore}`);

    // Broadcast the updated score to all players in the lobby TODO: receive on client properly
    io.to(lobbyId).emit('updateScores', {
        teamAScore: lobby.teamAScore,
        teamBScore: lobby.teamBScore
    });

    // Start a new round with a new word
    startNewRound(lobbyId);
    console.log(startNewRound);
}

function evaluateRoundOutcome(lobbyId) {
    const lobby = lobbies[lobbyId];
    if (!lobby) return; // If the lobby doesn't exist, exit the function

    // Ensure rounds are initialized as numbers
    lobby.teamARounds = lobby.teamARounds || 0;
    lobby.teamBRounds = lobby.teamBRounds || 0;

    // Only evaluate the round outcome when it's Team A's turn again
    if (lobby.activeTeam === 'B') {
        // Compare scores and increment the appropriate team's round count
        if (lobby.teamAScore > lobby.teamBScore) {
            lobby.teamARounds += 1;
        } else if (lobby.teamBScore > lobby.teamAScore) {
            lobby.teamBRounds += 1;
        } else if (lobby.teamAScore === lobby.teamBScore) {
            // If scores are equal, both teams get a round win
            lobby.teamARounds += 1;
            lobby.teamBRounds += 1;
        }

        // Reset scores for the next round
        lobby.teamAScore = 0;
        lobby.teamBScore = 0;

        // Broadcast the updated round wins to all players in the lobby
        io.to(lobbyId).emit('updateRounds', {
            teamARounds: lobby.teamARounds,
            teamBRounds: lobby.teamBRounds
        });
    }
}

function checkRoundScore(lobbyId) {
    const lobby = lobbies[lobbyId];
    if (!lobby) return; // If the lobby doesn't exist, exit the function

    // Ensure rounds are initialized as numbers
    lobby.teamARounds = lobby.teamARounds || 0;
    lobby.teamBRounds = lobby.teamBRounds || 0;

    // Check if any team has reached 5 rounds
    if (lobby.teamARounds >= 5 || lobby.teamBRounds >= 5) {
        if (lobby.teamARounds >= 5 && lobby.teamBRounds >= 5) {
            // If both teams have 5 rounds, it's a draw
            io.to(lobbyId).emit('gameEnd', {
                result: 'draw',
                message: 'The game ended in a draw!',
            });
        } else if (lobby.teamARounds >= 5) {
            // Team A wins
            io.to(lobbyId).emit('gameEnd', {
                result: 'teamA',
                message: 'Team A has won the game!',
            });
        } else if (lobby.teamBRounds >= 5) {
            // Team B wins
            io.to(lobbyId).emit('gameEnd', {
                result: 'teamB',
                message: 'Team B has won the game!',
            });
        }
        lobby.teamARounds = 0;
        lobby.teamBRounds = 0;
        lobby.teamAScore = 0;
        lobby.teamBScore = 0;    
    }
}


// Socket.io event listeners
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinLobby', ({ lobbyId, playerName }) => handleJoinLobby(socket, lobbyId, playerName));
    socket.on('selectRole', ({ lobbyId, playerName, team, role }) => handleSelectRole(socket, lobbyId, playerName, team, role));

    socket.on('requestPlayerData', ({ lobbyId, playerName }) => {
        const lobby = lobbies[lobbyId];
        if (lobby) {
            const player = lobby.players.find(p => p.name === playerName);
            if (player) {
                socket.emit('playerData', { name: player.name, role: player.role });
            } else {
                console.log(`Player ${playerName} not found in lobby ${lobbyId}`);
            }
        } else {
            console.log(`Lobby ${lobbyId} not found`);
        }
    });

    socket.on('startGame', (lobbyId) => {
        const lobby = lobbies[lobbyId];
        if (lobby && lobby.players.every(player => player.role !== null)) {
            io.to(lobbyId).emit('gameStarted');
            console.log(`Game started in lobby ${lobbyId}`);
        } else {
            socket.emit('roleAssignmentIncomplete');
        }
    });

    socket.on('startTimer', (lobbyId, duration) => {
        console.log(`Timer started for lobby ${lobbyId} with duration ${duration} seconds`);
        
        const lobby = lobbies[lobbyId];
        if (!lobby) return;
    
        // Determine and set the active team (Assuming you have logic to alternate teams)
        // For example, switch active team after each round
        lobby.activeTeam = lobby.activeTeam === 'A' ? 'B' : 'A';
    
        startNewRound(lobbyId);
        startTimer(lobbyId, duration);
    });

    // Correctly handle the confirmWord event
    socket.on('confirmWord', (lobbyId) => {
        console.log("received input to confirm word")
        handleConfirmWord(socket, lobbyId);
        io.to(lobbyId).emit('confirm')
    });

    socket.on('buzzWord', (lobbyId) => {
        console.log("received input to buzz word")
        startNewRound(lobbyId);
        io.to(lobbyId).emit('buzz')
    });

    // Handle disconnection
    socket.on('disconnect', () => handleDisconnect(socket));
});

// Express route handlers
app.get('/create-lobby', (req, res) => {
    const lobbyId = uuidv4();
    res.redirect(`/name?lobbyId=${lobbyId}`);
});

app.get('/name', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/name.html'));
});

app.get('/lobby/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/lobby.html'));
});

app.get('/game/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/game.html'));
});


server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
