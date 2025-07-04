module.exports = (io, lobbies, startNewRound) => {
    function handleJoinLobby(socket, lobbyId, playerName) {
        if (!lobbies[lobbyId]) lobbies[lobbyId] = { players: [] };
        let player = lobbies[lobbyId].players.find(p => p.name === playerName);

        if (player) player.id = socket.id;
        else lobbies[lobbyId].players.push({ id: socket.id, name: playerName, role: 'Unassigned' });

        socket.join(lobbyId);
        io.to(lobbyId).emit('updateLobby', lobbies[lobbyId]);
    }

    function handleSelectRole(socket, lobbyId, playerName, team, role) {
        const lobby = lobbies[lobbyId];
        if (!lobby) return;

        const player = lobby.players.find(p => p.name === playerName);
        if (!player) return;

        const roleName = team === 'Unassigned' ? 'Unassigned' : `${team} ${role}`;

        if (roleName === 'Unassigned') {
            if (player.role?.startsWith('Team')) {
                io.to(lobbyId).emit('roleFreed', { role: player.role });
            }
            player.role = 'Unassigned';
            io.to(lobbyId).emit('updateLobby', lobby);
            return;
        }

        const roleTaken = lobby.players.some(p => p.role === roleName);
        if (!roleTaken) {
            if (player.role?.startsWith('Team')) {
                io.to(lobbyId).emit('roleFreed', { role: player.role });
            }
            player.role = roleName;
            io.to(lobbyId).emit('roleSelected', { team, role, name: playerName });
            io.to(lobbyId).emit('updateLobby', lobby);
            socket.emit('roleAssigned', { role: roleName });
        } else {
            socket.emit('roleTaken', { team, role });
        }
    }

    function handleDisconnect(socket) {
        for (const [lobbyId, lobby] of Object.entries(lobbies)) {
            const player = lobby.players.find(p => p.id === socket.id);
            if (player) {
                player.id = null;
                break;
            }
        }
    }

    function handleConfirmWord(socket, lobbyId) {
        const lobby = lobbies[lobbyId];
        if (!lobby) return;
        const team = lobby.activeTeam;

        lobby.teamAScore = lobby.teamAScore || 0;
        lobby.teamBScore = lobby.teamBScore || 0;

        if (team === 'A') lobby.teamAScore++;
        else lobby.teamBScore++;

        io.to(lobbyId).emit('updateScores', {
            teamAScore: lobby.teamAScore,
            teamBScore: lobby.teamBScore
        });

        startNewRound(lobbyId);
    }

    return { handleJoinLobby, handleSelectRole, handleDisconnect, handleConfirmWord };
};
