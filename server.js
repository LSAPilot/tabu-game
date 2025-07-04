// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const lobbies = {};

// Utility Modules
const {
    getRandomPhrase,
    startNewRound,
    startTimer,
    evaluateRoundOutcome,
    checkRoundScore
} = require('./utils/gameLogic')(io, lobbies);

const {
    handleJoinLobby,
    handleSelectRole,
    handleDisconnect,
    handleConfirmWord
} = require('./utils/lobbyHandlers')(io, lobbies, startNewRound);

// Socket.io Event Listeners
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinLobby', ({ lobbyId, playerName }) => handleJoinLobby(socket, lobbyId, playerName));
    socket.on('selectRole', ({ lobbyId, playerName, team, role }) => handleSelectRole(socket, lobbyId, playerName, team, role));

    socket.on('requestPlayerData', ({ lobbyId, playerName }) => {
        const lobby = lobbies[lobbyId];
        if (!lobby) return;
        const player = lobby.players.find(p => p.name === playerName);
        if (player) {
            socket.emit('playerData', { name: player.name, role: player.role });
        }
    });

    socket.on('startGame', (lobbyId) => {
        const lobby = lobbies[lobbyId];
        if (lobby && lobby.players.every(player => player.role !== null)) {
            io.to(lobbyId).emit('gameStarted');
        } else {
            socket.emit('roleAssignmentIncomplete');
        }
    });

    socket.on('startTimer', (lobbyId, duration) => {
        const lobby = lobbies[lobbyId];
        if (!lobby) return;
        lobby.activeTeam = lobby.activeTeam === 'A' ? 'B' : 'A';
        startNewRound(lobbyId);
        startTimer(lobbyId, duration);
    });

    socket.on('confirmWord', (lobbyId) => {
        handleConfirmWord(socket, lobbyId);
        io.to(lobbyId).emit('confirm');
    });

    socket.on('buzzWord', (lobbyId) => {
        startNewRound(lobbyId);
        io.to(lobbyId).emit('buzz');
    });

    socket.on('disconnect', () => handleDisconnect(socket));
});

// Routes
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
