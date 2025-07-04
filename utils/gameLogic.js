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

            lobby.players.forEach(player => {
                io.to(player.id).emit('newRound', {
                    word: player.role === guesserRole ? '???' : phrase.Begriff,
                    forbiddenWords: player.role === guesserRole
                        ? phrase["Tabu-Wörter"].map(() => '???')
                        : phrase["Tabu-Wörter"]
                });
            });
        });
    }

    function startTimer(lobbyId, duration) {
        let timeLeft = duration;
        io.to(lobbyId).emit('timerUpdate', duration);
        io.to(lobbyId).emit('enableButtons', timeLeft);

        const interval = setInterval(() => {
            if (--timeLeft <= 0) {
                clearInterval(interval);
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
