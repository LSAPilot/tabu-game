const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const fs = require('fs');
const path = require('path');

// Create an Express app
const app = express();

// Create an HTTP server
const server = http.createServer(app);

// Integrate Socket.io with the server
const io = socketIo(server);

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Lobby system
let lobbies = {};

function getRandomPhrase(callback) {
    fs.readFile(path.join(__dirname, 'public/phrases.json'), 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading phrases file:', err);
            return callback(null);
        }

        const phrases = JSON.parse(data).Begriffe;
        console.log('Phrases loaded from JSON:', phrases);

        const randomIndex = Math.floor(Math.random() * phrases.length);
        const selectedPhrase = phrases[randomIndex];
        console.log('Selected phrase:', selectedPhrase);

        callback(selectedPhrase);
    });
}

// Function to start a new round and select a word
function startNewRound(lobbyId) {
    getRandomPhrase((phrase) => {
        if (phrase) {
            // Store the phrase in the lobby's state
            lobbies[lobbyId].currentPhrase = phrase;
            console.log(`Phrase stored in lobby ${lobbyId}:`, phrase);

            // Broadcast the word and forbidden words to all players in the lobby
            io.to(lobbyId).emit('newRound', {
                word: phrase.Begriff,
                forbiddenWords: phrase["Tabu-Wörter"]
            });
            console.log(`Broadcasting new phrase to lobby ${lobbyId}`);
        } else {
            console.error('Failed to retrieve a phrase.');
        }
    });
}

function startTimer(socket, lobbyId, duration) {
    let timeLeft = duration;

    const timerInterval = setInterval(() => {
        timeLeft--;

        // Emit the time left to all players in the lobby
        io.to(lobbyId).emit('timerUpdate', timeLeft);

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            io.to(lobbyId).emit('timerEnd');
        }
    }, 1000);
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinLobby', ({ lobbyId, playerName }) => {
        if (!lobbies[lobbyId]) {
            lobbies[lobbyId] = { players: [] };
        }

        // Find the player by name, not socket ID
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
    });

    socket.on('selectRole', ({ lobbyId, playerName, team, role }) => {
        const lobby = lobbies[lobbyId];
        if (!lobby) return;  // Safety check
    
        const player = lobby.players.find(p => p.name === playerName);
    
        if (player) {
            const roleName = `${team} ${role}`;
            const roleTaken = lobby.players.some(p => p.role === roleName);
    
            if (!roleTaken) {
                console.log('Before assigning role:', JSON.stringify(lobby.players));
                player.role = roleName;
                console.log('After assigning role:', JSON.stringify(lobby.players));
                io.to(lobbyId).emit('roleSelected', { team, role, name: playerName });
                socket.emit('roleAssigned', { role: roleName });
                console.log(`${playerName} selected role ${roleName}`);
            } else {
                socket.emit('roleTaken', { team, role });
            }
        }
    });

    socket.on('requestPlayerData', ({ lobbyId, playerName }) => {
        const lobby = lobbies[lobbyId];
        if (!lobby) {
            console.log(`Lobby ${lobbyId} not found`);
            return;  // Safety check
        }
    
        const player = lobby.players.find(p => p.name === playerName);
        if (player) {
            console.log(`Sending data for player ${playerName}:`, player);
            socket.emit('playerData', {
                name: player.name,
                role: player.role  // Send the stored role
            });
        } else {
            console.log(`Player ${playerName} not found in lobby ${lobbyId}`);
        }
    });

    // Handle start game event
    socket.on('startGame', (lobbyId) => {
        const lobby = lobbies[lobbyId];

        if (lobby) {
            // Ensure that all players have selected roles
            const allRolesAssigned = lobby.players.every(player => player.role !== null);
            if (allRolesAssigned) {
                io.to(lobbyId).emit('gameStarted');
                console.log(`Game started in lobby ${lobbyId}`);
            } else {
                socket.emit('roleAssignmentIncomplete');
            }
        }
    });

    socket.on('startTimer', (lobbyId, duration) => {
        console.log(`Timer started for lobby ${lobbyId} with duration ${duration} seconds`);
        startNewRound(lobbyId); // Select and send a new word at the start of the timer
        startTimer(socket, lobbyId, duration);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const [lobbyId, lobby] of Object.entries(lobbies)) {
            const player = lobby.players.find(player => player.id === socket.id);
            if (player) {
                player.id = null; // Mark player as disconnected, but keep their role and other data
                console.log(`Player ${player.name} marked as disconnected in lobby ${lobbyId}`);
                break;
            }
        }
    });

    // Handle gameplay events (buzz, confirm, etc.)
    socket.on('buzz', (lobbyId) => {
        io.to(lobbyId).emit('buzz');
    });

    socket.on('confirmWord', (lobbyId) => {
        io.to(lobbyId).emit('confirmWord');
    });
});

// Generate a unique lobby ID and redirect to the name page
app.get('/create-lobby', (req, res) => {
    const lobbyId = uuidv4();
    res.redirect(`/name?lobbyId=${lobbyId}`);
});

// Handle name selection page
app.get('/name', (req, res) => {
    res.sendFile(__dirname + '/public/name.html');
});

// Handle lobby page
app.get('/lobby/:id', (req, res) => {
    res.sendFile(__dirname + '/public/lobby.html');
});

// Handle game page
app.get('/game/:id', (req, res) => {
    res.sendFile(__dirname + '/public/game.html');
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
