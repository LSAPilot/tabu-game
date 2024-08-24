// ui.js

import { getPlayerRole, getActiveTeam} from './socket.js';

export function updateTurnUI() {
    const teamAElement = document.getElementById('teamA');
    const teamBElement = document.getElementById('teamB');
    const startTimerButton = document.getElementById('startTimerButton');

    const playerRole = getPlayerRole();
    const activeTeam = getActiveTeam();

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
    const { word, forbiddenWords } = data;

    document.getElementById('word').textContent = word;
    console.log('Word to guess updated:', word);

    const forbiddenList = document.getElementById('forbidden-list');
    forbiddenList.innerHTML = ''; // Clear any existing content
    forbiddenWords.forEach(word => {
        const listItem = document.createElement('li');
        listItem.textContent = word;
        forbiddenList.appendChild(listItem);
        console.log('Added forbidden word:', word);
    });
}
