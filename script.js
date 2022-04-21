const urlInput = document.getElementById("urlInput");
const intentInput = document.getElementById("intentInput");
const connectBtn = document.getElementById("connectBtn");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const pieceImages = {};
for (let i = 1; i <= 6; i++) {
    pieceImages[[i, 0]] = { image: new Image(), loaded: false };
    pieceImages[[i, 0]].image.src = `/assets/pieces/${i}_0.png`;
    pieceImages[[i, 0]].image.addEventListener("load", function () {
        pieceImages[[i, 0]].loaded = true;
    }, false);

    pieceImages[[i, 1]] = { image: new Image(), loaded: false };
    pieceImages[[i, 1]].image.src = `/assets/pieces/${i}_1.png`;
    pieceImages[[i, 1]].image.addEventListener("load", function () {
        pieceImages[[i, 1]].loaded = true;
    }, false);
}

let toast = document.getElementById("toast");
let toastHeader = document.getElementById("toastHeader");
let toastBody = document.getElementById("toastBody");
let previousToastTimeout;
let previousShakeTimeout;

let board = [];
let selection = { x: 0, y: 0, active: false };
let mpos = { x: 0, y: 0 };

urlInput.value = localStorage.getItem("url");
if (localStorage.hasOwnProperty("intent")) { intentInput.value = localStorage.getItem("intent"); }
urlInput.addEventListener("keyup", function (e) {
    if (e.key === "Enter") {
        connect();
    }
});

function notify(header, message, duration = 5000) {
    toastHeader.innerText = header;
    toastBody.innerText = message;
    toast.style.animation = "appear 1s";
    toast.style.animationFillMode = "forwards";
    clearTimeout(previousToastTimeout);
    previousToastTimeout = setTimeout(function () {
        toast.style.animation = "disappear 1s";
        toast.style.animationFillMode = "forwards";
    }, duration);
}

function shake() {
    canvas.style.animation = "shake 0.82s cubic-bezier(.36,.07,.19,.97) both";
    clearTimeout(previousShakeTimeout);
    previousShakeTimeout = setTimeout(function () {
        canvas.style.animation = null;
    }, 820);
}

function aabb(x1, y1, x2, y2, w, h) {
    return (x1 >= x2) && (y1 >= y2) && (x1 < x2 + w) && (y1 < y2 + h);
}

function draw() {
    let cellSize = Math.min(canvas.width, canvas.height) / 8;

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            ctx.fillStyle = ((x + y) % 2) ? "#b58863" : "#f0d9b5";
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }

    if (intentInput.value == "player") {
        if (selection.active) {
            ctx.fillStyle = "#37bf5c77";
            ctx.fillRect(selection.x * cellSize, selection.y * cellSize, cellSize, cellSize);
        }
    }

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            if (aabb(mpos.x, mpos.y, x * cellSize, y * cellSize, cellSize, cellSize)) {
                ctx.fillStyle = "#469ce377";
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
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

function getMousePosition(canvas, event) {
    let rect = canvas.getBoundingClientRect();
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;
    return { x, y };
}

canvas.onmousemove = function (e) {
    mpos = getMousePosition(canvas, e);
}

canvas.onmousedown = function () {
    let cellSize = Math.min(canvas.width, canvas.height) / 8;

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            if (aabb(mpos.x, mpos.y, x * cellSize, y * cellSize, cellSize, cellSize)) {
                if (!selection.active) {
                    selection.x = x;
                    selection.y = y;
                    selection.active = true;
                } else {
                    if ((selection.x != x || selection.y != y) &&
                        window.ws &&
                        intentInput.value == "player") {
                        window.ws.send(JSON.stringify({
                            type: "make_move",
                            from: [selection.x, selection.y],
                            to: [x, y]
                        }));
                    }
                    selection.active = false;
                }
                return;
            }
        }
    }
}

function setInputDisabled(state) {
    connectBtn.disabled = state;
    urlInput.disabled = state;
    intentInput.disabled = state;
}

function connect() {
    let url = urlInput.value;
    localStorage.setItem("url", url);
    localStorage.setItem("intent", intentInput.value);
    if ((!url.startsWith("ws://")) && (!url.startsWith("wss://"))) {
        url = "ws://" + url;
    }

    window.ws = null;
    try {
        ws = new WebSocket(url);
    } catch {
        notify("WebSocket Error", "The WebSocket connection has failed.");
        shake();
        setInputDisabled(false);
        connectBtn.innerText = "Connect";
        window.ws = null;
        return;
    }

    ws.onopen = function () {
        setInputDisabled(true);
        connectBtn.innerText = "Connected";
        ws.send(JSON.stringify({
            type: "join",
            intent: intentInput.value
        }));
    }
    ws.onclose = function () {
        setInputDisabled(false);
        connectBtn.innerText = "Connect";
        window.ws = null;
    }
    ws.onerror = function () {
        notify("WebSocket Error", "The WebSocket connection has failed.");
        shake();
        setInputDisabled(false);
        connectBtn.innerText = "Connect";
        window.ws = null;
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