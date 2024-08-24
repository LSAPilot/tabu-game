document.addEventListener('DOMContentLoaded', function () {
    const socket = io();

    // Listen for the 'newRound' event to receive the word and forbidden words
    socket.on('newRound', (data) => {
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
    });

    // Additional client-side logic...
});