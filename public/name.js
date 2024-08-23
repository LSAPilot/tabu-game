function submitName() {
    const name = document.getElementById('playerName').value.trim();
    if (name) {
        localStorage.setItem('playerName', name);
        window.location.href = '/lobby/' + getLobbyId();
    } else {
        alert('Please enter a name');
    }
}

function getLobbyId() {
    // Assuming the lobby ID is passed in the URL query (e.g., ?lobbyId=xyz)
    const params = new URLSearchParams(window.location.search);
    return params.get('lobbyId');
}