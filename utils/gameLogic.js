const fs = require('fs');
const path = require('path');

module.exports = (io, lobbies) => {
    function getRandomPhrase(callback) {
        const phrasesPath = path.join(__dirname, '../public/phrases.json');
        fs.readFile(phrasesPath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading phrases file:', err);
                return callback(null);
            }
            const phrases = JSON.parse(data).Begriffe;
            const randomIndex = Math.floor(Math.random() * phrases.length);
            callback(phrases[randomIndex]);
        });
    }

    function startNewRound(lobbyId) {
        getRandomPhrase((phrase) => {
            if (!phrase) return;
            const lobby = lobbies[lobbyId];
            if (!lobby) return;
            const guesserRole = `Team ${lobby.activeTeam} Guesser`;
            lobby.currentPhrase = phrase;
            const activeTeam = lobby.activeTeam;
            const speaker = lobby.players.find(p => p.role === `Team ${activeTeam} Speaker`)?.name || '---';
            const guesser = lobby.players.find(p => p.role === `Team ${activeTeam} Guesser`)?.name || '---';

            lobby.players.forEach(player => {
                io.to(player.id).emit('newRound', {
                    word: player.role === guesserRole ? '???' : phrase.Begriff,
                    forbiddenWords: player.role === guesserRole
                        ? phrase["Tabu-Wörter"].map(() => '???')
                        : phrase["Tabu-Wörter"],
                    activeTeam,
                    speaker,
                    guesser
                });
            });
        });
    }

    function cycleTeamRoles(lobby) {
        const team = lobby.activeTeam;
    
        const speakerRole = `Team ${team} Speaker`;
        const guesserRole = `Team ${team} Guesser`;
    
        const speaker = lobby.players.find(p => p.role === speakerRole);
        const guesser = lobby.players.find(p => p.role === guesserRole);
    
        // Swap roles if both exist
        if (speaker && guesser) {
            speaker.role = guesserRole;
            guesser.role = speakerRole;
        }
    }

    function startTimer(lobbyId, duration) {
        const lobby = lobbies[lobbyId];
        lobby.turnCount = (lobby.turnCount || 0) + 1;
        if (!lobby || lobby.timerRunning) return;
        
        if (lobby.turnCount > 2) {
            cycleTeamRoles(lobby);
            io.to(lobbyId).emit('updateLobby', lobby);
        }

        io.to(lobbyId).emit('updateLobby', lobby);

        lobby.timerRunning = true;
        
        let timeLeft = duration;
        io.to(lobbyId).emit('timerUpdate', duration);
        io.to(lobbyId).emit('enableButtons', timeLeft);

        const interval = setInterval(() => {
            if (--timeLeft <= 0) {
                clearInterval(interval);
                lobby.timerRunning = false;
                io.to(lobbyId).emit('timerEnd');
                evaluateRoundOutcome(lobbyId);
                checkRoundScore(lobbyId);
            }
        }, 1000);
    }

    function evaluateRoundOutcome(lobbyId) {
        const lobby = lobbies[lobbyId];
        if (!lobby) return;
        lobby.teamARounds = lobby.teamARounds || 0;
        lobby.teamBRounds = lobby.teamBRounds || 0;

        if (lobby.activeTeam === 'B') {
            if (lobby.teamAScore > lobby.teamBScore) lobby.teamARounds++;
            else if (lobby.teamBScore > lobby.teamAScore) lobby.teamBRounds++;
            else {
                lobby.teamARounds++;
                lobby.teamBRounds++;
            }
            lobby.teamAScore = 0;
            lobby.teamBScore = 0;
            io.to(lobbyId).emit('updateRounds', {
                teamARounds: lobby.teamARounds,
                teamBRounds: lobby.teamBRounds
            });
        }
    }

    function checkRoundScore(lobbyId) {
        const lobby = lobbies[lobbyId];
        if (!lobby) return;
        lobby.teamARounds = lobby.teamARounds || 0;
        lobby.teamBRounds = lobby.teamBRounds || 0;

        if (lobby.teamARounds >= 5 || lobby.teamBRounds >= 5) {
            const result = (lobby.teamARounds === lobby.teamBRounds)
                ? { result: 'draw', message: 'The game ended in a draw!' }
                : (lobby.teamARounds > lobby.teamBRounds)
                    ? { result: 'teamA', message: 'Team A has won the game!' }
                    : { result: 'teamB', message: 'Team B has won the game!' };

            io.to(lobbyId).emit('gameEnd', result);
            lobby.teamARounds = 0;
            lobby.teamBRounds = 0;
            lobby.teamAScore = 0;
            lobby.teamBScore = 0;
        }
    }

    return { getRandomPhrase, startNewRound, startTimer, evaluateRoundOutcome, checkRoundScore };
};
