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

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Create or join a lobby
    socket.on('joinLobby', ({ lobbyId, playerName }) => {
        if (!lobbies[lobbyId]) {
            lobbies[lobbyId] = { players: [] };
        }

        const player = { id: socket.id, name: playerName, role: null };
        lobbies[lobbyId].players.push(player);

        socket.join(lobbyId);
        io.to(lobbyId).emit('updateLobby', lobbies[lobbyId]);
        console.log(`${playerName} joined lobby ${lobbyId}`);
    });

    // Handle role selection
    socket.on('selectRole', ({ lobbyId, playerName, team, role }) => {
        const lobby = lobbies[lobbyId];
        const player = lobby.players.find(p => p.id === socket.id);

        if (player) {
            const roleName = `${team} ${role}`;
            const roleTaken = lobby.players.some(p => p.role === roleName);

            if (!roleTaken) {
                player.role = roleName;
                io.to(lobbyId).emit('roleSelected', { team, role, name: playerName });
                console.log(`${playerName} selected role ${team} ${role}`);
            } else {
                socket.emit('roleTaken', { team, role });
            }
        }
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

    // Start game event
    socket.on('startGame', (lobbyId) => {
        io.to(lobbyId).emit('startGame');
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

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
