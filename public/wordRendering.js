document.addEventListener('DOMContentLoaded', function () {
    // Fetch the JSON data
    fetch('/phrases.json') // Ensure this path is correct
        .then(response => response.json())
        .then(data => {
            // Select a random phrase from the JSON data
            const randomIndex = Math.floor(Math.random() * data.Begriffe.length);
            const phrase = data.Begriffe[randomIndex];

            // Inject the 'Begriff' into the word-to-guess element
            document.getElementById('word').textContent = phrase.Begriff;

            // Inject the forbidden words into the forbidden-list element
            const forbiddenList = document.getElementById('forbidden-list');
            forbiddenList.innerHTML = ''; // Clear any existing content
            phrase["Tabu-Wörter"].forEach(word => {
                const listItem = document.createElement('li');
                listItem.textContent = word;
                forbiddenList.appendChild(listItem);
            });
        })
        .catch(error => console.error('Error fetching JSON:', error));
});

