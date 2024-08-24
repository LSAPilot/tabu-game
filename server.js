const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

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

let roleName;

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

    // Handle role selection and store role information
    socket.on('selectRole', ({ lobbyId, playerName, team, role }) => {
        const lobby = lobbies[lobbyId];
        const player = lobby.players.find(p => p.id === socket.id);

        if (player) {
            const roleName = `${team} ${role}`;
            const roleTaken = lobby.players.some(p => p.role === roleName);

            if (!roleTaken) {
                player.role = roleName; // Store the role in the player's data
                io.to(lobbyId).emit('roleSelected', { team, role, name: playerName });
                socket.emit('roleAssigned', { role: roleName });
                console.log(`${playerName} selected role ${team} ${role}`);
            } else {
                socket.emit('roleTaken', { team, role });
            }
        }
    });

    // Handle reconnection by sending the player's stored role back
    socket.on('requestPlayerData', ({ lobbyId, playerName }) => {
        const lobby = lobbies[lobbyId];
        if (lobby) {
            const player = lobby.players.find(p => p.name === playerName);
            if (player) {
                // Emit the player's data back to the client, including the role
                socket.emit('playerData', {
                    name: player.name,
                    role: player.role, // Retrieve the stored role
                    team: player.role ? player.role.split(' ')[0] : null // Extract team from role
                });
            } else {
                console.log(`Player ${playerName} not found in lobby ${lobbyId}`);
            }
        } else {
            console.log(`Lobby ${lobbyId} not found`);
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
        startTimer(socket, lobbyId, duration);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const [lobbyId, lobby] of Object.entries(lobbies)) {
            const index = lobby.players.findIndex(player => player.id === socket.id);
            if (index !== -1) {
                lobby.players.splice(index, 1);
                io.to(lobbyId).emit('updateLobby', lobby);
                if (lobby.players.length === 0) {
                    delete lobbies[lobbyId];
                }
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
