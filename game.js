import { fetchWaterPokemon } from './pokemonData.js';
import { generateDeck, insertKyogres, shuffleArray, CardTypes, getLaprasCard, insertCardIntoDeck } from './cards.js';
import { triggerRandomEvent } from './events.js';
import { playAITurn, aiChooseTarget, aiChooseCardToDiscard, aiChooseKyogrePlacement } from './ai.js';
import { Network } from './network.js';

let gameState = {
    players: [],
    deck: [],
    discardPile: [],
    turnIndex: 0,
    turnDirection: 1,
    turnsRemaining: 1,
    mode: 'normal',
    turnCount: 0,
    activeEvent: null,
    pokemonList: [],
    logs: [],
    isOnline: false
};

let ui = {};
let localPlayerName = null;

document.addEventListener('DOMContentLoaded', async () => {
    ui = {
        mainMenu: document.getElementById('main-menu'),
        localSetup: document.getElementById('local-setup-screen'),
        hostSetup: document.getElementById('host-setup-screen'),
        joinSetup: document.getElementById('join-setup-screen'),
        lobbyScreen: document.getElementById('lobby-screen'),
        gameScreen: document.getElementById('game-screen'),
        passScreen: document.getElementById('pass-screen'),
        loadingMsg: document.getElementById('loading-msg'),
        
        // Buttons
        btnLocal: document.getElementById('btn-local'),
        btnHost: document.getElementById('btn-host'),
        btnJoin: document.getElementById('btn-join'),
        backBtns: document.querySelectorAll('.back-btn'),
        startLocalBtn: document.getElementById('start-local-btn'),
        createRoomBtn: document.getElementById('create-room-btn'),
        joinRoomBtn: document.getElementById('join-room-btn'),
        startOnlineBtn: document.getElementById('start-online-btn'),
        leaveRoomBtn: document.getElementById('leave-room-btn'),
        copyCodeBtn: document.getElementById('copy-code-btn'),
        readyBtn: document.getElementById('ready-btn'),
        drawBtn: document.getElementById('draw-btn'),
        
        // Game UI
        deckPile: document.getElementById('deck-pile'),
        discardPile: document.getElementById('discard-pile'),
        playerHand: document.getElementById('player-hand'),
        playersStatus: document.getElementById('players-status'),
        turnIndicator: document.getElementById('turn-indicator'),
        eventIndicator: document.getElementById('event-indicator'),
        deckInfo: document.getElementById('deck-info'),
        currentPlayerName: document.getElementById('current-player-name'),
        gameLogs: document.getElementById('game-logs'),
        
        // Modals
        modalOverlay: document.getElementById('modal-overlay'),
        modalTitle: document.getElementById('modal-title'),
        modalBody: document.getElementById('modal-body'),
        modalClose: document.getElementById('modal-close'),
    };

    // Navigation
    ui.btnLocal.onclick = () => showScreen(ui.localSetup);
    ui.btnHost.onclick = () => showScreen(ui.hostSetup);
    ui.btnJoin.onclick = () => showScreen(ui.joinSetup);
    ui.backBtns.forEach(btn => btn.onclick = () => showScreen(ui.mainMenu));

    // Actions
    ui.startLocalBtn.onclick = startLocalGame;
    ui.createRoomBtn.onclick = hostOnlineGame;
    ui.joinRoomBtn.onclick = joinOnlineGame;
    ui.startOnlineBtn.onclick = startOnlineGame;
    ui.leaveRoomBtn.onclick = leaveOnlineRoom;
    ui.copyCodeBtn.onclick = () => {
        navigator.clipboard.writeText(Network.roomCode);
        ui.copyCodeBtn.innerText = "Copied!";
        setTimeout(() => ui.copyCodeBtn.innerText = "Copy", 2000);
    };
    
    ui.drawBtn.onclick = handleDrawClick;
    ui.readyBtn.onclick = () => {
        ui.passScreen.classList.add('hidden');
        ui.gameScreen.classList.remove('hidden');
        renderGame();
        checkAITurn();
    };
    ui.modalClose.onclick = closeModal;

    // Preload Pokemon
    gameState.pokemonList = await fetchWaterPokemon();
});

function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active', 'hidden'));
    document.querySelectorAll('.screen').forEach(s => {
        if (s !== screen) s.classList.add('hidden');
    });
    screen.classList.add('active');
    screen.classList.remove('hidden');
}

function logAction(msg) {
    gameState.logs.push(msg);
    if (gameState.logs.length > 10) gameState.logs.shift();
    renderLogs();
}

function renderLogs() {
    ui.gameLogs.innerHTML = '';
    gameState.logs.forEach(log => {
        const el = document.createElement('div');
        el.className = 'log-entry';
        el.innerText = log;
        ui.gameLogs.appendChild(el);
    });
    ui.gameLogs.scrollTop = ui.gameLogs.scrollHeight;
}

// --- LOCAL GAME ---
async function startLocalGame() {
    const mode = document.getElementById('local-game-mode').value;
    const totalPlayers = parseInt(document.getElementById('local-total-players').value);
    const humanPlayers = parseInt(document.getElementById('local-human-players').value);

    if (totalPlayers < 3 || totalPlayers > 10) return alert("Players must be between 3 and 10.");
    if (humanPlayers < 0 || humanPlayers > totalPlayers) return alert("Invalid human player count.");

    gameState.isOnline = false;
    gameState.mode = mode;
    
    gameState.players = [];
    for (let i = 0; i < totalPlayers; i++) {
        gameState.players.push({
            id: `player_${i}`,
            name: i < humanPlayers ? `Player ${i + 1}` : `AI ${i + 1}`,
            isHuman: i < humanPlayers,
            hand: [],
            isAlive: true
        });
    }

    setupDeckAndDeal();
    
    if (gameState.players[0].isHuman && humanPlayers > 1) {
        showPassScreen();
    } else {
        showScreen(ui.gameScreen);
        renderGame();
        checkAITurn();
    }
}

// --- ONLINE GAME ---
async function hostOnlineGame() {
    const username = document.getElementById('host-username').value.trim();
    const mode = document.getElementById('host-game-mode').value;
    if (!username) return alert("Enter a username");

    try {
        ui.createRoomBtn.disabled = true;
        const room = await Network.createRoom(username, mode);
        localPlayerName = username;
        gameState.isOnline = true;
        enterLobby(room);
    } catch (e) {
        alert(e.message);
    } finally {
        ui.createRoomBtn.disabled = false;
    }
}

async function joinOnlineGame() {
    const code = document.getElementById('join-room-code').value.trim().toUpperCase();
    const username = document.getElementById('join-username').value.trim();
    if (!code || !username) return alert("Enter code and username");

    try {
        ui.joinRoomBtn.disabled = true;
        const room = await Network.joinRoom(code, username);
        localPlayerName = username;
        gameState.isOnline = true;
        enterLobby(room);
    } catch (e) {
        alert(e.message);
    } finally {
        ui.joinRoomBtn.disabled = false;
    }
}

function enterLobby(room) {
    showScreen(ui.lobbyScreen);
    updateLobbyUI(room);
    
    Network.startPolling((updatedRoom) => {
        if (!updatedRoom) return;
        if (updatedRoom.started && !gameState.started) {
            // Game started by host
            Object.assign(gameState, updatedRoom);
            showScreen(ui.gameScreen);
            renderGame();
            checkAITurn();
        } else if (!updatedRoom.started) {
            updateLobbyUI(updatedRoom);
        } else {
            // Game is ongoing, sync state
            syncGameState(updatedRoom);
        }
    });
}

function updateLobbyUI(room) {
    document.getElementById('lobby-room-code').innerText = room.code;
    document.getElementById('lobby-mode').innerText = room.mode;
    document.getElementById('lobby-player-count').innerText = room.players.length;
    
    const list = document.getElementById('lobby-player-list');
    list.innerHTML = '';
    room.players.forEach(p => {
        const div = document.createElement('div');
        div.className = 'player-item';
        div.innerHTML = `<span>${p.name} ${p.name === room.host ? '(Host)' : ''} ${!p.connected ? '(Offline)' : ''}</span>`;
        if (Network.isHost && p.name !== room.host) {
            const kickBtn = document.createElement('button');
            kickBtn.className = 'btn small danger';
            kickBtn.innerText = 'Kick';
            kickBtn.onclick = () => Network.updateState('KICK_PLAYER', { targetName: p.name });
            div.appendChild(kickBtn);
        }
        list.appendChild(div);
    });

    if (Network.isHost) {
        document.getElementById('host-controls').classList.remove('hidden');
        document.getElementById('waiting-msg').classList.add('hidden');
        ui.startOnlineBtn.disabled = room.players.length < 3 && (room.players.length + parseInt(document.getElementById('lobby-ai-count').value)) < 3;
    } else {
        document.getElementById('host-controls').classList.add('hidden');
        document.getElementById('waiting-msg').classList.remove('hidden');
    }
}

async function startOnlineGame() {
    const aiCount = parseInt(document.getElementById('lobby-ai-count').value) || 0;
    const room = await Network.getState();
    
    gameState.players = [...room.players];
    for (let i = 0; i < aiCount; i++) {
        gameState.players.push({
            id: `ai_${i}`,
            name: `AI ${i + 1}`,
            isHuman: false,
            hand: [],
            isAlive: true,
            connected: true
        });
    }

    gameState.mode = room.mode;
    setupDeckAndDeal();
    
    await Network.updateState('START_GAME', { state: gameState });
}

async function leaveOnlineRoom() {
    await Network.leaveRoom();
    showScreen(ui.mainMenu);
}

function syncGameState(serverRoom) {
    const currentPlayer = gameState.players[gameState.turnIndex];
    if (currentPlayer && currentPlayer.name !== localPlayerName && !(!currentPlayer.isHuman && Network.isHost)) {
        Object.assign(gameState, serverRoom);
        renderGame();
    }
}

async function broadcastState() {
    if (gameState.isOnline) {
        await Network.updateState('UPDATE_FULL_STATE', { state: gameState });
    }
}

// --- CORE GAME LOGIC ---
function setupDeckAndDeal() {
    gameState.deck = generateDeck(gameState.players.length, gameState.mode, gameState.pokemonList);
    
    gameState.players.forEach(p => {
        for (let i = 0; i < 3; i++) {
            if (gameState.deck.length > 0) p.hand.push(gameState.deck.pop());
        }
        p.hand.push(getLaprasCard(gameState.pokemonList));
    });

    gameState.deck = insertKyogres(gameState.deck, gameState.players.length, gameState.pokemonList);

    gameState.turnIndex = 0;
    gameState.turnDirection = 1;
    gameState.turnsRemaining = 1;
    gameState.turnCount = 0;
    gameState.activeEvent = null;
    gameState.discardPile = [];
    gameState.started = true;
    gameState.logs = ["Game started!"];
}

function showPassScreen() {
    ui.gameScreen.classList.add('hidden');
    ui.passScreen.classList.remove('hidden');
    document.getElementById('pass-msg').innerText = `Pass device to ${gameState.players[gameState.turnIndex].name}`;
}

function renderGame() {
    const currentPlayer = gameState.players[gameState.turnIndex];
    
    ui.turnIndicator.innerText = `Current Turn: ${currentPlayer.name} (${gameState.turnsRemaining} turn(s) left)`;
    ui.deckInfo.innerText = `Deck: ${gameState.deck.length} | Discard: ${gameState.discardPile.length}`;
    
    if (gameState.activeEvent) {
        ui.eventIndicator.classList.remove('hidden');
        ui.eventIndicator.innerText = `Active Event: ${gameState.activeEvent.name}`;
    } else {
        ui.eventIndicator.classList.add('hidden');
    }

    ui.playersStatus.innerHTML = '';
    gameState.players.forEach((p, i) => {
        const badge = document.createElement('div');
        badge.className = `status-badge ${i === gameState.turnIndex ? 'active' : ''} ${!p.isAlive ? 'dead' : ''}`;
        badge.innerText = `${p.name} (${p.hand.length} cards)`;
        ui.playersStatus.appendChild(badge);
    });

    ui.discardPile.innerHTML = '';
    if (gameState.discardPile.length > 0) {
        const topCard = gameState.discardPile[gameState.discardPile.length - 1];
        ui.discardPile.appendChild(createCardElement(topCard));
    }

    ui.playerHand.innerHTML = '';
    
    let viewPlayer = currentPlayer;
    if (gameState.isOnline) {
        viewPlayer = gameState.players.find(p => p.name === localPlayerName);
        if (!viewPlayer.isAlive) viewPlayer = currentPlayer; // Spectate
    }

    ui.currentPlayerName.innerText = `${viewPlayer.name}'s Hand`;
    
    const isMyTurn = gameState.isOnline ? (currentPlayer.name === localPlayerName) : currentPlayer.isHuman;

    if (viewPlayer.isHuman && (isMyTurn || gameState.isOnline)) {
        viewPlayer.hand.forEach((card, index) => {
            const cardEl = createCardElement(card);
            if (isMyTurn) {
                cardEl.addEventListener('click', () => handlePlayCard(viewPlayer, card, index));
            }
            ui.playerHand.appendChild(cardEl);
        });
        ui.drawBtn.disabled = !isMyTurn;
    } else {
        ui.drawBtn.disabled = true;
        viewPlayer.hand.forEach(() => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card back';
            cardEl.innerText = 'Tidal';
            ui.playerHand.appendChild(cardEl);
        });
    }
    
    renderLogs();
}

function createCardElement(card) {
    const el = document.createElement('div');
    el.className = `card ${card.type} ${card.isShiny ? 'shiny' : ''}`;
    el.innerHTML = `
        ${card.isShiny ? '<div class="shiny-badge">✨ SHINY ✨</div>' : ''}
        <div class="card-name">${card.name}</div>
        <img src="${card.sprite}" class="card-img" alt="${card.name}">
        <div class="card-effect"><b>${card.effect}</b><br>${card.desc}</div>
    `;
    return el;
}

async function handlePlayCard(player, card, index) {
    if (card.type === CardTypes.DEFENSE || card.type === CardTypes.KYOGRE) {
        alert("You cannot play this card directly.");
        return;
    }
    
    if (gameState.activeEvent?.action === 'limit_play' && player.cardsPlayedThisTurn >= 1) {
        alert("Deep Sea Pressure: Only 1 card per turn!");
        return;
    }

    player.hand.splice(index, 1);
    gameState.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn || 0) + 1;
    
    logAction(`${player.name} played ${card.name} (${card.effect})`);
    
    renderGame();
    await resolveCardEffect(player, card);
    await broadcastState();
    renderGame();
}

async function resolveCardEffect(player, card) {
    switch(card.action) {
        case 'peek':
            if (player.isHuman && (!gameState.isOnline || player.name === localPlayerName)) 
                await showModal("Peek", gameState.deck.slice(-3).reverse());
            break;
        case 'shuffle':
            gameState.deck = shuffleArray(gameState.deck);
            logAction("Deck shuffled!");
            break;
        case 'skip':
            gameState.turnsRemaining--;
            if (gameState.turnsRemaining <= 0) nextTurn();
            break;
        case 'attack':
            gameState.turnsRemaining--;
            const attackTargetIdx = getNextPlayerIndex();
            const attackTarget = gameState.players[attackTargetIdx];
            if (await checkShield(attackTarget)) {
                nextTurn(1);
            } else {
                nextTurn(2);
            }
            break;
        case 'reverse':
            gameState.turnDirection *= -1;
            logAction("Turn order reversed!");
            break;
        case 'future_sight':
            if (player.isHuman && (!gameState.isOnline || player.name === localPlayerName)) 
                await showModal("Future Sight", gameState.deck.slice(-5).reverse());
            break;
        case 'bottom_draw':
            if (gameState.deck.length > 0) {
                player.hand.push(gameState.deck.shift());
                gameState.turnsRemaining--;
                if (gameState.turnsRemaining <= 0) nextTurn();
            }
            break;
        case 'target_strike':
            const target = await choosePlayer(player, "Choose player to attack");
            if (target) {
                gameState.turnsRemaining--;
                if (await checkShield(target)) {
                    nextTurn(1);
                } else {
                    logAction(`${player.name} targeted ${target.name} with 2 turns!`);
                    setTurnToPlayer(target.id, 2);
                }
            }
            break;
        case 'steal':
            const stealTarget = await choosePlayer(player, "Choose player to steal from");
            if (stealTarget && stealTarget.hand.length > 0) {
                const randIdx = Math.floor(Math.random() * stealTarget.hand.length);
                player.hand.push(stealTarget.hand.splice(randIdx, 1)[0]);
                logAction(`${player.name} stole a card from ${stealTarget.name}`);
            }
            break;
        case 'sniper':
            const snipeTarget = await choosePlayer(player, "Choose player to discard a card");
            if (snipeTarget && snipeTarget.hand.length > 0) {
                const cardToDiscard = aiChooseCardToDiscard(snipeTarget);
                snipeTarget.hand = snipeTarget.hand.filter(c => c.id !== cardToDiscard.id);
                gameState.discardPile.push(cardToDiscard);
                logAction(`${snipeTarget.name} was sniped and discarded a card!`);
            }
            break;
        case 'tsunami':
            gameState.players.forEach(p => {
                if (p.isAlive && gameState.deck.length > 0) p.hand.push(gameState.deck.pop());
            });
            logAction("Tsunami! Everyone drew a card.");
            break;
        case 'swap_hands':
            const swapTarget = await choosePlayer(player, "Choose player to swap hands with");
            if (swapTarget) {
                const temp = player.hand;
                player.hand = swapTarget.hand;
                swapTarget.hand = temp;
                logAction(`${player.name} swapped hands with ${swapTarget.name}`);
            }
            break;
        case 'discard_hand':
            gameState.discardPile.push(...player.hand);
            player.hand = [];
            logAction(`${player.name} discarded their hand!`);
            break;
        case 'rush':
            gameState.turnsRemaining += 1;
            break;
        case 'trap':
            const nextIdx = getNextPlayerIndex();
            gameState.players[nextIdx].skipNext = true;
            logAction(`${gameState.players[nextIdx].name} is trapped and will skip their turn!`);
            break;
        case 'delivery':
            for (let i = 0; i < 3; i++) {
                if (gameState.deck.length > 0) player.hand.push(gameState.deck.pop());
            }
            logAction(`${player.name} used Delivery! Drew 3 cards.`);
            const giveTarget = await choosePlayer(player, "Choose player to give a card to");
            if (giveTarget && player.hand.length > 0) {
                const cardToGive = await chooseCardFromHand(player, "Choose card to give away");
                if (cardToGive) {
                    const cardIdx = player.hand.findIndex(c => c.id === cardToGive.id);
                    giveTarget.hand.push(player.hand.splice(cardIdx, 1)[0]);
                    logAction(`${player.name} gave ${cardToGive.name} to ${giveTarget.name}`);
                }
            }
            break;
        case 'cancel':
            if (gameState.discardPile.length > 1) {
                const removed = gameState.discardPile.splice(-2, 1)[0];
                logAction(`${player.name} used Hero Mode to cancel ${removed.name}!`);
            }
            break;
    }
}

async function handleDrawClick() {
    const player = gameState.players[gameState.turnIndex];
    if (!player.isHuman || (gameState.isOnline && player.name !== localPlayerName)) return;
    await drawCard(player);
}

async function drawCard(player) {
    if (gameState.deck.length === 0) {
        if (gameState.discardPile.length > 0) {
            gameState.deck = shuffleArray([...gameState.discardPile]);
            gameState.discardPile = [];
            logAction("Discard pile reshuffled into deck.");
        } else {
            alert("No cards left!");
            return;
        }
    }

    const card = gameState.deck.pop();
    logAction(`${player.name} drew a card.`);
    
    if (card.type === CardTypes.KYOGRE) {
        await handleKyogre(player, card);
    } else {
        player.hand.push(card);
        gameState.turnsRemaining--;
        if (gameState.turnsRemaining <= 0) {
            nextTurn();
        } else {
            await broadcastState();
            renderGame();
        }
    }
}

async function handleKyogre(player, kyogreCard) {
    logAction(`${player.name} drew Kyogre Catastrophe!`);
    
    const defuseIndex = player.hand.findIndex(c => c.action === 'defuse');
    if (defuseIndex > -1) {
        const defuseCard = player.hand.splice(defuseIndex, 1)[0];
        gameState.discardPile.push(defuseCard);
        logAction(`${player.name} used Lapras Rescue!`);
        
        let insertPos = 0;
        if (player.isHuman && (!gameState.isOnline || player.name === localPlayerName)) {
            insertPos = await showKyogrePlacementModal(gameState.deck.length);
        } else {
            insertPos = aiChooseKyogrePlacement(gameState.deck.length);
        }
        
        insertCardIntoDeck(gameState.deck, kyogreCard, insertPos);
        
        gameState.turnsRemaining--;
        if (gameState.turnsRemaining <= 0) nextTurn();
        else {
            await broadcastState();
            renderGame();
        }
    } else {
        logAction(`${player.name} was eliminated!`);
        player.isAlive = false;
        gameState.discardPile.push(...player.hand, kyogreCard);
        player.hand = [];
        
        checkWinCondition();
        if (gameState.players.filter(p=>p.isAlive).length > 1) {
            gameState.turnsRemaining = 1;
            nextTurn();
        }
    }
}

function getNextPlayerIndex() {
    let nextIdx = gameState.turnIndex;
    do {
        nextIdx = (nextIdx + gameState.turnDirection + gameState.players.length) % gameState.players.length;
    } while (!gameState.players[nextIdx].isAlive);
    return nextIdx;
}

async function nextTurn(turns = 1) {
    const currentPlayer = gameState.players[gameState.turnIndex];
    currentPlayer.cardsPlayedThisTurn = 0;

    gameState.turnIndex = getNextPlayerIndex();
    
    if (gameState.players[gameState.turnIndex].skipNext) {
        logAction(`${gameState.players[gameState.turnIndex].name} skipped their turn due to trap!`);
        gameState.players[gameState.turnIndex].skipNext = false;
        gameState.turnIndex = getNextPlayerIndex();
    }

    gameState.turnsRemaining = turns;
    gameState.turnCount++;

    const eventInterval = gameState.mode === 'chaos' ? 5 : (gameState.mode === 'ultra' ? 3 : 999);
    if (gameState.turnCount % eventInterval === 0 && gameState.mode !== 'normal') {
        const event = triggerRandomEvent(gameState);
        logAction(`Event: ${event.name} - ${event.desc}`);
    } else {
        gameState.activeEvent = null;
    }

    await broadcastState();

    const nextPlayer = gameState.players[gameState.turnIndex];
    
    if (!gameState.isOnline) {
        if (nextPlayer.isHuman) {
            const humanCount = gameState.players.filter(p => p.isHuman && p.isAlive).length;
            if (humanCount > 1) showPassScreen();
            else renderGame();
        } else {
            renderGame();
            checkAITurn();
        }
    } else {
        renderGame();
        checkAITurn();
    }
}

function setTurnToPlayer(playerId, turns) {
    gameState.turnIndex = gameState.players.findIndex(p => p.id === playerId);
    gameState.turnsRemaining = turns;
    broadcastState().then(() => {
        renderGame();
        checkAITurn();
    });
}

function checkWinCondition() {
    const alive = gameState.players.filter(p => p.isAlive);
    if (alive.length === 1) {
        alert(`${alive[0].name} wins the game!`);
        if (gameState.isOnline) Network.leaveRoom();
        location.reload();
    }
}

async function checkAITurn() {
    const player = gameState.players[gameState.turnIndex];
    // In online mode, only the host runs AI turns
    if (!player.isHuman && player.isAlive) {
        if (gameState.isOnline && !Network.isHost) return;
        
        await playAITurn(player, gameState, 
            async (p, c) => {
                const idx = p.hand.findIndex(hc => hc.id === c.id);
                p.hand.splice(idx, 1);
                gameState.discardPile.push(c);
                logAction(`${p.name} played ${c.name}`);
                renderGame();
                await resolveCardEffect(p, c);
                await broadcastState();
            },
            async (p) => {
                await drawCard(p);
            }
        );
    }
}

async function checkShield(target) {
    const shieldIdx = target.hand.findIndex(c => c.action === 'shield');
    if (shieldIdx > -1) {
        // For simplicity in this version, we'll auto-use shield if it's an AI or if it's online
        // In local human play, we could ask, but let's auto-use for better flow
        const shieldCard = target.hand.splice(shieldIdx, 1)[0];
        gameState.discardPile.push(shieldCard);
        logAction(`${target.name} used Mantine Shield to block!`);
        return true;
    }
    return false;
}

function chooseCardFromHand(player, title) {
    return new Promise(resolve => {
        if (!player.isHuman || (gameState.isOnline && player.name !== localPlayerName)) {
            resolve(player.hand[0]);
            return;
        }

        ui.modalTitle.innerText = title;
        ui.modalBody.innerHTML = '';
        player.hand.forEach(card => {
            const cardEl = createCardElement(card);
            cardEl.onclick = () => {
                closeModal();
                resolve(card);
            };
            ui.modalBody.appendChild(cardEl);
        });
        ui.modalClose.classList.add('hidden');
        ui.modalOverlay.classList.remove('hidden');
    });
}

// UI Helpers
function showModal(title, cards) {
    return new Promise(resolve => {
        ui.modalTitle.innerText = title;
        ui.modalBody.innerHTML = '';
        cards.forEach(card => {
            ui.modalBody.appendChild(createCardElement(card));
        });
        ui.modalClose.classList.remove('hidden');
        ui.modalOverlay.classList.remove('hidden');
        
        ui.modalClose.onclick = () => {
            closeModal();
            resolve();
        };
    });
}

function showKyogrePlacementModal(deckLength) {
    return new Promise(resolve => {
        ui.modalTitle.innerText = "Lapras rescued you from Kyogre!";
        ui.modalBody.innerHTML = `
            <p style="margin-bottom: 15px; width: 100%;">Choose where to place Kyogre back into the deck:</p>
            <div style="display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 300px; margin: 0 auto;">
                <button class="btn primary" id="place-top">Top of Deck</button>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <label>Position (1-${deckLength}):</label>
                    <input type="number" id="place-pos" min="1" max="${deckLength}" value="2" style="width: 60px; padding: 5px;">
                    <button class="btn primary" id="place-custom">Place</button>
                </div>
                <button class="btn primary" id="place-bottom">Bottom of Deck</button>
                <button class="btn primary" id="place-random">Random</button>
            </div>
        `;
        ui.modalClose.classList.add('hidden');
        ui.modalOverlay.classList.remove('hidden');
        
        document.getElementById('place-top').onclick = () => { closeModal(); resolve(0); };
        document.getElementById('place-bottom').onclick = () => { closeModal(); resolve(deckLength); };
        document.getElementById('place-random').onclick = () => { closeModal(); resolve(Math.floor(Math.random() * (deckLength + 1))); };
        document.getElementById('place-custom').onclick = () => { 
            let pos = parseInt(document.getElementById('place-pos').value) - 1;
            if (isNaN(pos)) pos = 0;
            closeModal(); 
            resolve(pos); 
        };
    });
}

function choosePlayer(currentPlayer, title) {
    return new Promise(resolve => {
        if (!currentPlayer.isHuman || (gameState.isOnline && currentPlayer.name !== localPlayerName)) {
            resolve(aiChooseTarget(gameState.players, currentPlayer));
            return;
        }

        ui.modalTitle.innerText = title;
        ui.modalBody.innerHTML = '';
        gameState.players.forEach(p => {
            if (p.isAlive && p.id !== currentPlayer.id) {
                const btn = document.createElement('div');
                btn.className = 'modal-player-select';
                btn.innerText = p.name;
                btn.onclick = () => {
                    closeModal();
                    resolve(p);
                };
                ui.modalBody.appendChild(btn);
            }
        });
        ui.modalClose.classList.add('hidden');
        ui.modalOverlay.classList.remove('hidden');
    });
}

function closeModal() {
    ui.modalOverlay.classList.add('hidden');
}
