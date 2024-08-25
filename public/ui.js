// ui.js

import { getPlayerRole, getActiveTeam} from './socket.js';

const confirmButton = document.getElementById('confirmButton');
const buzzButton = document.getElementById('buzzButton');

export function updateTurnUI() {
    const teamAElement = document.getElementById('teamA');
    const teamBElement = document.getElementById('teamB');
    const startTimerButton = document.getElementById('startTimerButton');

    const playerRole = getPlayerRole();
    const activeTeam = getActiveTeam();

    confirmButton.disabled = true;
    buzzButton.disabled = true;

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

export function handleTimerUpdate(timeLeft) {
    document.getElementById('timer').textContent = timeLeft;
}

export function activateButtons(timeLeft) {
    if (timeLeft > 0){
        confirmButton.disabled = false;
        buzzButton.disabled = false;
    } else {
        confirmButton.disabled = true;
        confirmButton.disabled = true;
    }
}

export function handleTimerEnd(playerRole, activeTeam) {
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
}

export function handleNewRound(data) {
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
}

export function updateScoreUi(data) {
    console.log("received new scores from server:", data);
    const { teamAScore, teamBScore } = data;

    // Find the elements in the DOM
    const teamAScoreElement = document.getElementById("teamAScore");
    const teamBScoreElement = document.getElementById("teamBScore");

    // Update the elements with the new scores
    teamAScoreElement.textContent = teamAScore;
    teamBScoreElement.textContent = teamBScore;
}

export function updateRoundsUi(data) {
    console.log("received new rounds from server:", data);
    const { teamARounds, teamBRounds } = data;

    // Find the elements in the DOM
    const teamARoundElement = document.getElementById("teamARounds");
    const teamBRoundElement = document.getElementById("teamBRounds");

    // Update the elements with the new scores
    teamARoundElement.textContent = teamARounds;
    teamBRoundElement.textContent = teamBRounds;
}

export function updateWinner(data) {
    console.log("received new winner from server:", data);
    const { winner, message } = data;

    // Find the elements in the DOM
    const winningHeader = document.getElementById("whoWon");

    // Update the elements with the new scores
    winningHeader.textContent = message;
}