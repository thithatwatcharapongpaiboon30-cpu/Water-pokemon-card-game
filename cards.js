import { getSpriteUrl } from './pokemonData.js';

export const CardTypes = {
    ACTION: 'action',
    STRATEGY: 'strategy',
    DEFENSE: 'defense',
    CHAOS: 'chaos',
    ULTRA: 'ultra',
    KYOGRE: 'kyogre'
};

const CardTemplates = [
    // Action
    { name: "Squirtle", effect: "Peek", desc: "Look at top 3 cards.", type: CardTypes.ACTION, action: 'peek' },
    { name: "Psyduck", effect: "Shuffle", desc: "Shuffle deck.", type: CardTypes.ACTION, action: 'shuffle' },
    { name: "Mudkip", effect: "Skip", desc: "End turn without drawing.", type: CardTypes.ACTION, action: 'skip' },
    { name: "Greninja", effect: "Attack", desc: "Next player takes 2 turns.", type: CardTypes.ACTION, action: 'attack' },
    { name: "Vaporeon", effect: "Steal", desc: "Steal random card.", type: CardTypes.ACTION, action: 'steal' },
    { name: "Gyarados", effect: "Reverse", desc: "Reverse turn order.", type: CardTypes.ACTION, action: 'reverse' },
    
    // Strategy
    { name: "Tentacruel", effect: "Future Sight", desc: "See top 5 cards.", type: CardTypes.STRATEGY, action: 'future_sight' },
    { name: "Sharpedo", effect: "Target Strike", desc: "Choose player to draw 2 cards.", type: CardTypes.STRATEGY, action: 'target_strike' },
    { name: "Lanturn", effect: "Bottom Draw", desc: "Draw from bottom of deck.", type: CardTypes.STRATEGY, action: 'bottom_draw' },
    { name: "Clawitzer", effect: "Card Sniper", desc: "Force a player to discard.", type: CardTypes.STRATEGY, action: 'sniper' },
    
    // Defense
    { name: "Lapras", effect: "Rescue", desc: "Defuses Kyogre catastrophe.", type: CardTypes.DEFENSE, action: 'defuse' },
    { name: "Mantine", effect: "Shield", desc: "Blocks one attack.", type: CardTypes.DEFENSE, action: 'shield' },
    
    // Chaos
    { name: "Wailord", effect: "Tsunami", desc: "All players draw 1 card.", type: CardTypes.CHAOS, action: 'tsunami' },
    { name: "Wishiwashi", effect: "School", desc: "Swap hands with random player.", type: CardTypes.CHAOS, action: 'swap_hands' },
    { name: "Magikarp", effect: "Disaster", desc: "Discard entire hand.", type: CardTypes.CHAOS, action: 'discard_hand' },
    
    // Ultra
    { name: "Pelipper", effect: "Delivery", desc: "Draw 3 cards then give 1 away.", type: CardTypes.ULTRA, action: 'delivery' },
    { name: "Barraskewda", effect: "Rush", desc: "Take an extra turn.", type: CardTypes.ULTRA, action: 'rush' },
    { name: "Araquanid", effect: "Trap", desc: "Force next player to skip.", type: CardTypes.ULTRA, action: 'trap' }
];

export function generateDeck(playerCount, mode, pokemonList) {
    let deck = [];
    let numCards = 0;
    
    if (mode === 'normal') numCards = playerCount * 12;
    if (mode === 'chaos') numCards = playerCount * 16;
    if (mode === 'ultra') numCards = playerCount * 20;

    const availableTemplates = CardTemplates.filter(t => {
        if (mode === 'normal') return t.type === CardTypes.ACTION || t.type === CardTypes.STRATEGY || t.type === CardTypes.DEFENSE;
        if (mode === 'chaos') return t.type !== CardTypes.ULTRA;
        return true;
    });

    // Fill the rest
    while (deck.length < numCards) {
        const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
        deck.push(createCard(template, pokemonList));
    }

    // Shuffle
    deck = shuffleArray(deck);
    
    return deck;
}

export function getLaprasCard(pokemonList) {
    const template = CardTemplates.find(t => t.action === 'defuse');
    return createCard(template, pokemonList);
}

export function insertKyogres(deck, playerCount, pokemonList) {
    const numKyogre = playerCount - 1;
    const kyogreData = pokemonList.find(p => p.name.toLowerCase() === 'kyogre') || { name: 'kyogre', id: 382 };
    
    // Prevent duplicate insertion
    if (deck.some(c => c.type === CardTypes.KYOGRE)) return deck;

    for (let i = 0; i < numKyogre; i++) {
        const kyogreCard = {
            id: generateId(),
            name: "Kyogre",
            effect: "Catastrophe",
            desc: "Eliminates player unless Lapras Rescue is used.",
            type: CardTypes.KYOGRE,
            action: 'explode',
            sprite: getSpriteUrl(kyogreData.id),
            isShiny: Math.random() < 0.01
        };
        const position = Math.floor(Math.random() * (deck.length + 1));
        deck.splice(position, 0, kyogreCard);
    }
    
    // Safe start buffer: First 3 cards drawn (end of array) cannot be Kyogre
    while(deck.slice(-3).some(c => c.type === CardTypes.KYOGRE)) {
        deck = shuffleArray(deck);
    }
    
    return deck;
}

export function insertCardIntoDeck(deck, card, position) {
    // position 0 means top of the deck (which is the end of the array in our implementation)
    // position deck.length means bottom of the deck (index 0)
    let arrayIndex = deck.length - position;
    arrayIndex = Math.max(0, Math.min(arrayIndex, deck.length));
    deck.splice(arrayIndex, 0, card);
}

function createCard(template, pokemonList) {
    // Find matching pokemon or random water pokemon
    let searchName = template.name.toLowerCase();
    let pData = pokemonList.find(p => p.name.toLowerCase() === searchName || p.name.toLowerCase().startsWith(searchName + '-'));
    if (!pData) pData = pokemonList[Math.floor(Math.random() * pokemonList.length)];
    
    return {
        id: generateId(),
        name: template.name,
        effect: template.effect,
        desc: template.desc,
        type: template.type,
        action: template.action,
        sprite: getSpriteUrl(pData.id),
        isShiny: Math.random() < 0.01
    };
}

export function shuffleArray(array) {
    let curId = array.length;
    while (0 !== curId) {
        let randId = Math.floor(Math.random() * curId);
        curId -= 1;
        let tmp = array[curId];
        array[curId] = array[randId];
        array[randId] = tmp;
    }
    return array;
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}
