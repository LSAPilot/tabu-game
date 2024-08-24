
import { initializeSocket } from './socket.js';
import { updateTurnUI} from './ui.js';
import { initializeEventListeners } from './events.js';

document.addEventListener('DOMContentLoaded', () => {
    const socket = initializeSocket();

    // Initial UI setup
    updateTurnUI();

    // Initialize event listeners
    initializeEventListeners(socket);
});
