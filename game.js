import { fetchWaterPokemon } from './pokemonData.js';
import { generateDeck, insertKyogres, shuffleArray, CardTypes } from './cards.js';
import { triggerRandomEvent } from './events.js';
import { playAITurn, aiChooseTarget, aiChooseCardToDiscard, aiChooseKyogrePlacement } from './ai.js';

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
    pokemonList: []
};

let ui = {};

document.addEventListener('DOMContentLoaded', async () => {
    ui = {
        startScreen: document.getElementById('start-screen'),
        gameScreen: document.getElementById('game-screen'),
        passScreen: document.getElementById('pass-screen'),
        loadingMsg: document.getElementById('loading-msg'),
        startBtn: document.getElementById('start-btn'),
        readyBtn: document.getElementById('ready-btn'),
        deckPile: document.getElementById('deck-pile'),
        discardPile: document.getElementById('discard-pile'),
        playerHand: document.getElementById('player-hand'),
        playersStatus: document.getElementById('players-status'),
        turnIndicator: document.getElementById('turn-indicator'),
        eventIndicator: document.getElementById('event-indicator'),
        deckInfo: document.getElementById('deck-info'),
        drawBtn: document.getElementById('draw-btn'),
        endTurnBtn: document.getElementById('end-turn-btn'),
        currentPlayerName: document.getElementById('current-player-name'),
        modalOverlay: document.getElementById('modal-overlay'),
        modalTitle: document.getElementById('modal-title'),
        modalBody: document.getElementById('modal-body'),
        modalClose: document.getElementById('modal-close'),
    };

    ui.startBtn.addEventListener('click', startGame);
    ui.drawBtn.addEventListener('click', () => handleDrawClick());
    ui.readyBtn.addEventListener('click', () => {
        ui.passScreen.classList.add('hidden');
        ui.gameScreen.classList.remove('hidden');
        renderGame();
        checkAITurn();
    });
    ui.modalClose.addEventListener('click', closeModal);
});

async function startGame() {
    const mode = document.getElementById('game-mode').value;
    const totalPlayers = parseInt(document.getElementById('total-players').value);
    const humanPlayers = parseInt(document.getElementById('human-players').value);

    if (totalPlayers < 3 || totalPlayers > 10) return alert("Players must be between 3 and 10.");
    if (humanPlayers < 0 || humanPlayers > totalPlayers) return alert("Invalid human player count.");

    ui.startBtn.classList.add('hidden');
    ui.loadingMsg.classList.remove('hidden');

    gameState.pokemonList = await fetchWaterPokemon();
    gameState.mode = mode;
    
    // Initialize Players
    gameState.players = [];
    for (let i = 0; i < totalPlayers; i++) {
        gameState.players.push({
            id: i,
            name: i < humanPlayers ? `Player ${i + 1}` : `AI ${i + 1}`,
            isHuman: i < humanPlayers,
            hand: [],
            isAlive: true,
            shields: 0
        });
    }

    // Initialize Deck
    gameState.deck = generateDeck(totalPlayers, mode, gameState.pokemonList);
    
    // Deal 4 cards to each player, ensuring 1 Lapras
    gameState.players.forEach(p => {
        const defuseIndex = gameState.deck.findIndex(c => c.action === 'defuse');
        if(defuseIndex > -1) {
            p.hand.push(gameState.deck.splice(defuseIndex, 1)[0]);
        }
        for (let i = 0; i < 3; i++) p.hand.push(gameState.deck.pop());
    });

    // Insert Kyogres
    gameState.deck = insertKyogres(gameState.deck, totalPlayers, gameState.pokemonList);

    gameState.turnIndex = 0;
    gameState.turnDirection = 1;
    gameState.turnsRemaining = 1;
    gameState.turnCount = 0;
    gameState.activeEvent = null;
    gameState.discardPile = [];

    ui.startScreen.classList.remove('active');
    
    if (gameState.players[0].isHuman && humanPlayers > 1) {
        showPassScreen();
    } else {
        ui.gameScreen.classList.remove('hidden');
        renderGame();
        checkAITurn();
    }
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

    // Render Players Status
    ui.playersStatus.innerHTML = '';
    gameState.players.forEach((p, i) => {
        const badge = document.createElement('div');
        badge.className = `status-badge ${i === gameState.turnIndex ? 'active' : ''} ${!p.isAlive ? 'dead' : ''}`;
        badge.innerText = `${p.name} (${p.hand.length} cards)`;
        ui.playersStatus.appendChild(badge);
    });

    // Render Discard Pile
    ui.discardPile.innerHTML = '';
    if (gameState.discardPile.length > 0) {
        const topCard = gameState.discardPile[gameState.discardPile.length - 1];
        ui.discardPile.appendChild(createCardElement(topCard));
    }

    // Render Hand
    ui.playerHand.innerHTML = '';
    ui.currentPlayerName.innerText = `${currentPlayer.name}'s Hand`;
    
    if (currentPlayer.isHuman) {
        currentPlayer.hand.forEach((card, index) => {
            const cardEl = createCardElement(card);
            cardEl.addEventListener('click', () => handlePlayCard(currentPlayer, card, index));
            ui.playerHand.appendChild(cardEl);
        });
        ui.drawBtn.disabled = false;
    } else {
        ui.drawBtn.disabled = true;
        // Show card backs for AI
        currentPlayer.hand.forEach(() => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card back';
            cardEl.innerText = 'Tidal';
            ui.playerHand.appendChild(cardEl);
        });
    }
}

function createCardElement(card) {
    const el = document.createElement('div');
    el.className = `card ${card.type} ${card.isShiny ? 'shiny' : ''}`;
    el.innerHTML = `
        <div class="card-name">${card.name}</div>
        <img src="${card.sprite}" class="card-img" alt="${card.name}">
        <div class="card-effect"><b>${card.effect}</b><br>${card.desc}</div>
    `;
    return el;
}

async function handlePlayCard(player, card, index) {
    if (!player.isHuman || gameState.players[gameState.turnIndex].id !== player.id) return;
    if (card.type === CardTypes.DEFENSE || card.type === CardTypes.KYOGRE) {
        alert("You cannot play this card directly.");
        return;
    }
    
    if (gameState.activeEvent?.action === 'limit_play' && player.cardsPlayedThisTurn >= 1) {
        alert("Deep Sea Pressure: Only 1 card per turn!");
        return;
    }

    // Remove from hand, add to discard
    player.hand.splice(index, 1);
    gameState.discardPile.push(card);
    player.cardsPlayedThisTurn = (player.cardsPlayedThisTurn || 0) + 1;
    
    renderGame();
    await resolveCardEffect(player, card);
    renderGame();
}

async function resolveCardEffect(player, card) {
    switch(card.action) {
        case 'peek':
            if (player.isHuman) await showModal("Peek", gameState.deck.slice(-3).reverse());
            break;
        case 'shuffle':
            gameState.deck = shuffleArray(gameState.deck);
            if (player.isHuman) alert("Deck shuffled!");
            break;
        case 'skip':
            gameState.turnsRemaining--;
            if (gameState.turnsRemaining <= 0) nextTurn();
            break;
        case 'attack':
            gameState.turnsRemaining--;
            nextTurn(2); // Next player takes 2 turns
            break;
        case 'reverse':
            gameState.turnDirection *= -1;
            break;
        case 'future_sight':
            if (player.isHuman) await showModal("Future Sight", gameState.deck.slice(-5).reverse());
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
                setTurnToPlayer(target.id, 2);
            }
            break;
        case 'steal':
            const stealTarget = await choosePlayer(player, "Choose player to steal from");
            if (stealTarget && stealTarget.hand.length > 0) {
                const randIdx = Math.floor(Math.random() * stealTarget.hand.length);
                player.hand.push(stealTarget.hand.splice(randIdx, 1)[0]);
            }
            break;
        case 'sniper':
            const snipeTarget = await choosePlayer(player, "Choose player to discard a card");
            if (snipeTarget && snipeTarget.hand.length > 0) {
                if (snipeTarget.isHuman) {
                    // Simplified: random discard for now to keep flow fast
                    const randIdx = Math.floor(Math.random() * snipeTarget.hand.length);
                    gameState.discardPile.push(snipeTarget.hand.splice(randIdx, 1)[0]);
                    alert(`${snipeTarget.name} discarded a card!`);
                } else {
                    const cardToDiscard = aiChooseCardToDiscard(snipeTarget);
                    snipeTarget.hand = snipeTarget.hand.filter(c => c.id !== cardToDiscard.id);
                    gameState.discardPile.push(cardToDiscard);
                }
            }
            break;
        case 'tsunami':
            gameState.players.forEach(p => {
                if (p.isAlive && gameState.deck.length > 0) p.hand.push(gameState.deck.pop());
            });
            break;
        case 'swap_hands':
            const swapTarget = await choosePlayer(player, "Choose player to swap hands with");
            if (swapTarget) {
                const temp = player.hand;
                player.hand = swapTarget.hand;
                swapTarget.hand = temp;
            }
            break;
        case 'discard_hand':
            gameState.discardPile.push(...player.hand);
            player.hand = [];
            break;
        case 'rush':
            gameState.turnsRemaining += 1;
            break;
        case 'trap':
            // Next player skips
            const nextIdx = getNextPlayerIndex();
            gameState.players[nextIdx].skipNext = true;
            break;
    }
}

async function handleDrawClick() {
    const player = gameState.players[gameState.turnIndex];
    if (!player.isHuman) return;
    await drawCard(player);
}

async function drawCard(player) {
    if (gameState.deck.length === 0) {
        if (gameState.discardPile.length > 0) {
            gameState.deck = shuffleArray([...gameState.discardPile]);
            gameState.discardPile = [];
        } else {
            alert("No cards left!");
            return;
        }
    }

    const card = gameState.deck.pop();
    
    if (card.type === CardTypes.KYOGRE) {
        await handleKyogre(player, card);
    } else {
        player.hand.push(card);
        gameState.turnsRemaining--;
        if (gameState.turnsRemaining <= 0) {
            nextTurn();
        } else {
            renderGame();
        }
    }
}

async function handleKyogre(player, kyogreCard) {
    if (player.isHuman) {
        alert("You drew Kyogre Catastrophe!");
    }
    
    const defuseIndex = player.hand.findIndex(c => c.action === 'defuse');
    if (defuseIndex > -1) {
        // Defused
        const defuseCard = player.hand.splice(defuseIndex, 1)[0];
        gameState.discardPile.push(defuseCard);
        
        if (player.isHuman) {
            alert("You used Lapras Rescue!");
            // Simplified placement: random for now to avoid complex UI, or prompt
            const pos = parseInt(prompt(`Place Kyogre (0 = top, ${gameState.deck.length} = bottom):`, "0"));
            let insertPos = isNaN(pos) ? 0 : pos;
            insertPos = Math.max(0, Math.min(gameState.deck.length, insertPos));
            gameState.deck.splice(gameState.deck.length - insertPos, 0, kyogreCard);
        } else {
            const pos = aiChooseKyogrePlacement(gameState.deck.length);
            gameState.deck.splice(gameState.deck.length - pos, 0, kyogreCard);
        }
        
        gameState.turnsRemaining--;
        if (gameState.turnsRemaining <= 0) nextTurn();
        else renderGame();
    } else {
        // Exploded
        if (player.isHuman) alert("You have been eliminated!");
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

function nextTurn(turns = 1) {
    const currentPlayer = gameState.players[gameState.turnIndex];
    currentPlayer.cardsPlayedThisTurn = 0;

    gameState.turnIndex = getNextPlayerIndex();
    
    if (gameState.players[gameState.turnIndex].skipNext) {
        gameState.players[gameState.turnIndex].skipNext = false;
        gameState.turnIndex = getNextPlayerIndex();
    }

    gameState.turnsRemaining = turns;
    gameState.turnCount++;

    // Check Events
    const eventInterval = gameState.mode === 'chaos' ? 5 : (gameState.mode === 'ultra' ? 3 : 999);
    if (gameState.turnCount % eventInterval === 0 && gameState.mode !== 'normal') {
        triggerRandomEvent(gameState);
        if (gameState.players[gameState.turnIndex].isHuman) {
            alert(`Event Triggered: ${gameState.activeEvent.name}\n${gameState.activeEvent.desc}`);
        }
    } else {
        gameState.activeEvent = null;
    }

    const nextPlayer = gameState.players[gameState.turnIndex];
    
    if (nextPlayer.isHuman) {
        const humanCount = gameState.players.filter(p => p.isHuman && p.isAlive).length;
        if (humanCount > 1) {
            showPassScreen();
        } else {
            renderGame();
        }
    } else {
        renderGame();
        checkAITurn();
    }
}

function setTurnToPlayer(playerId, turns) {
    gameState.turnIndex = gameState.players.findIndex(p => p.id === playerId);
    gameState.turnsRemaining = turns;
    renderGame();
    checkAITurn();
}

function checkWinCondition() {
    const alive = gameState.players.filter(p => p.isAlive);
    if (alive.length === 1) {
        alert(`${alive[0].name} wins the game!`);
        location.reload();
    }
}

async function checkAITurn() {
    const player = gameState.players[gameState.turnIndex];
    if (!player.isHuman && player.isAlive) {
        await playAITurn(player, gameState, 
            async (p, c) => {
                const idx = p.hand.findIndex(hc => hc.id === c.id);
                p.hand.splice(idx, 1);
                gameState.discardPile.push(c);
                renderGame();
                await resolveCardEffect(p, c);
            },
            async (p) => {
                await drawCard(p);
            }
        );
    }
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

function choosePlayer(currentPlayer, title) {
    return new Promise(resolve => {
        if (!currentPlayer.isHuman) {
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
