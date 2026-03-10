import { CardTypes } from './cards.js';

export async function playAITurn(player, gameState, playCardCallback, drawCardCallback, endTurnCallback) {
    if (!player.isAlive) return;

    const delay = (ms) => new Promise(res => setTimeout(res, ms));
    await delay(1000); // Thinking pause

    const difficulty = gameState.mode === 'normal' ? 'easy' : (gameState.mode === 'chaos' ? 'medium' : 'hard');

    let cardsPlayed = 0;
    let maxCards = gameState.activeEvent?.action === 'limit_play' ? 1 : 99;

    // AI Logic
    while (cardsPlayed < maxCards) {
        let cardToPlay = null;

        if (difficulty === 'easy') {
            // Randomly play a card 30% of the time
            if (Math.random() < 0.3 && player.hand.length > 0) {
                const playable = player.hand.filter(c => c.type !== CardTypes.DEFENSE && c.type !== CardTypes.KYOGRE);
                if (playable.length > 0) {
                    cardToPlay = playable[Math.floor(Math.random() * playable.length)];
                }
            }
        } else if (difficulty === 'medium') {
            // Play action cards if hand is large, save strategy
            if (player.hand.length > 4) {
                const playable = player.hand.filter(c => c.type === CardTypes.ACTION || c.type === CardTypes.CHAOS);
                if (playable.length > 0) {
                    cardToPlay = playable[0];
                }
            }
        } else {
            // Hard: Use attacks, skips, target strikes strategically
            const attacks = player.hand.filter(c => c.action === 'attack' || c.action === 'skip' || c.action === 'target_strike' || c.action === 'trap');
            const utility = player.hand.filter(c => c.action === 'peek' || c.action === 'future_sight' || c.action === 'shuffle' || c.action === 'delivery');
            
            if (attacks.length > 0) {
                cardToPlay = attacks[0];
            } else if (utility.length > 0 && Math.random() < 0.4) {
                cardToPlay = utility[0];
            } else if (player.hand.length > 5) {
                const playable = player.hand.filter(c => c.type !== CardTypes.DEFENSE && c.type !== CardTypes.KYOGRE);
                if (playable.length > 0) cardToPlay = playable[0];
            }
        }

        if (cardToPlay) {
            await playCardCallback(player, cardToPlay);
            cardsPlayed++;
            await delay(1000);
        } else {
            break;
        }
    }

    // Draw card to end turn
    if (player.isAlive) {
        await drawCardCallback(player);
    }
}

export function aiChooseTarget(players, currentPlayer) {
    const validTargets = players.filter(p => p.isAlive && p.id !== currentPlayer.id);
    return validTargets[Math.floor(Math.random() * validTargets.length)];
}

export function aiChooseCardToDiscard(player) {
    const nonDefuse = player.hand.filter(c => c.action !== 'defuse');
    if (nonDefuse.length > 0) return nonDefuse[0];
    return player.hand[0];
}

export function aiChooseKyogrePlacement(deckLength) {
    // AI places Kyogre near the top to kill next player
    return Math.floor(Math.random() * Math.min(5, deckLength));
}
