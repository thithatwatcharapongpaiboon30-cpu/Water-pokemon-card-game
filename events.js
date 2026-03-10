export const ChaosEvents = [
    { name: "Whirlpool", desc: "Turn order randomly reversed.", action: "reverse_order" },
    { name: "Storm Surge", desc: "Everyone draws a card.", action: "everyone_draw" },
    { name: "Deep Sea Pressure", desc: "Players limited to 1 card play.", action: "limit_play" },
    { name: "Ocean Current", desc: "Next player order shifts randomly.", action: "shift_order" }
];

export function triggerRandomEvent(gameState) {
    const event = ChaosEvents[Math.floor(Math.random() * ChaosEvents.length)];
    gameState.activeEvent = event;
    
    // Apply immediate effects
    if (event.action === "reverse_order") {
        gameState.turnDirection *= -1;
    } else if (event.action === "everyone_draw") {
        gameState.players.forEach(p => {
            if (p.isAlive && gameState.deck.length > 0) {
                p.hand.push(gameState.deck.pop());
            }
        });
    } else if (event.action === "shift_order") {
        gameState.turnIndex = Math.floor(Math.random() * gameState.players.length);
        while(!gameState.players[gameState.turnIndex].isAlive) {
            gameState.turnIndex = (gameState.turnIndex + 1) % gameState.players.length;
        }
    }
    
    return event;
}
