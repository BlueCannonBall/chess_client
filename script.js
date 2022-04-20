const urlInput = document.getElementById("urlInput");
const connectBtn = document.getElementById("connectBtn");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const pieceImages = {};
pieceImages[[1, 0]] = { image: new Image(), loaded: false };
pieceImages[[1, 1]] = { image: new Image(), loaded: false };
pieceImages[[2, 0]] = { image: new Image(), loaded: false };
pieceImages[[2, 1]] = { image: new Image(), loaded: false };
pieceImages[[3, 0]] = { image: new Image(), loaded: false };
pieceImages[[3, 1]] = { image: new Image(), loaded: false };
pieceImages[[4, 0]] = { image: new Image(), loaded: false };
pieceImages[[4, 1]] = { image: new Image(), loaded: false };
pieceImages[[5, 0]] = { image: new Image(), loaded: false };
pieceImages[[5, 1]] = { image: new Image(), loaded: false };
pieceImages[[6, 0]] = { image: new Image(), loaded: false };
pieceImages[[6, 1]] = { image: new Image(), loaded: false };
for (let i = 1; i <= 6; i++) {
    pieceImages[[i, 0]].image.src = `/assets/pieces/${i}_0.png`;
    pieceImages[[i, 0]].image.addEventListener("load", function () {
        pieceImages[[i, 0]].loaded = true;
    }, false);

    pieceImages[[i, 1]].image.src = `/assets/pieces/${i}_1.png`;
    pieceImages[[i, 1]].image.addEventListener("load", function () {
        pieceImages[[i, 1]].loaded = true;
    }, false);
}

let toast = document.getElementById("toast");
let toastHeader = document.getElementById("toastHeader");
let toastBody = document.getElementById("toastBody");

let board = [];

urlInput.value = localStorage.getItem("url");
urlInput.addEventListener("keyup", function(e) {
    if (e.key === "Enter") {
        connect();
    }
});

function notify(header, message, duration = 5000) {
    toastHeader.innerText = header;
    toastBody.innerText = message;
    toast.style.animation = "appear 1s";
    toast.style.animationFillMode = "forwards";
    setTimeout(function () {
        toast.style.animation = "disappear 1s";
        toast.style.animationFillMode = "forwards";
    }, duration);
}

function shake() {
    canvas.style.animation = "shake 0.82s cubic-bezier(.36,.07,.19,.97) both";
    setTimeout(function () {
        canvas.style.animation = null;
    }, 820);
}

function draw() {
    let cellSize = Math.min(canvas.width, canvas.height) / 8;

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            ctx.fillStyle = ((x + y) % 2) ? "#b58863" : "#f0d9b5";
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }

    if (board.length == 8) {
        for (let y = 0; y < 8; y++) {
            if (board[y].length == 8) {
                for (let x = 0; x < 8; x++) {
                    if (pieceImages[board[y][x]] && pieceImages[board[y][x]].loaded) {
                        ctx.drawImage(pieceImages[board[y][x]].image, x * cellSize, y * cellSize, cellSize, cellSize)
                    }
                }
            }
        }
    }

    requestAnimationFrame(draw);
}

function connect() {
    let url = urlInput.value;
    localStorage.setItem("url", url);
    if ((!url.startsWith("ws://")) && (!url.startsWith("wss://"))) {
        url = "ws://" + url;
    }

    let ws;
    try {
        ws = new WebSocket(url);
    } catch {
        notify("WebSocket Error", "The WebSocket connection has failed.");
        shake();
        connectBtn.disabled = false;
        urlInput.disabled = false;
        connectBtn.innerText = "Connect";
        return;
    }

    ws.onopen = function () {
        connectBtn.disabled = true;
        urlInput.disabled = true;
        connectBtn.innerText = "Connected";
    }
    ws.onerror = function (e) {
        notify("WebSocket Error", "The WebSocket connection has failed.");
        shake();
        connectBtn.disabled = false;
        urlInput.disabled = false;
        connectBtn.innerText = "Connect";
    }
    ws.onmessage = function (message) {
        let packet = JSON.parse(message.data);
        switch (packet.type) {
            case "game_board": {
                board = packet.board;
                notify("Turn", `${packet.turn == 0 ? "White" : "Black"}'s turn`);
                break;
            }

            case "game_begin": {
                notify("Game Info", "Let the game begin!");
                break;
            }

            case "game_end": {
                notify("Game Info", `The game has ended! ${packet.winner == 0 ? "White" : "Black"} has emerged victorious. Reason: ${packet.reason}`);
                break;
            }

            case "error": {
                notify("Error", packet.message);
                shake();
                break;
            }
        }
    }
}

requestAnimationFrame(draw);