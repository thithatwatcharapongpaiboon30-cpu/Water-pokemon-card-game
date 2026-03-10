export async function fetchWaterPokemon() {
    try {
        const response = await fetch('https://pokeapi.co/api/v2/type/water');
        if (!response.ok) throw new Error('API failed');
        const data = await response.json();
        return data.pokemon.map(p => {
            const urlParts = p.pokemon.url.split('/');
            const id = urlParts[urlParts.length - 2];
            return { name: p.pokemon.name, id: id };
        });
    } catch (error) {
        console.warn("Using fallback Pokémon data.");
        return [
            {name: "squirtle", id: 7}, {name: "psyduck", id: 54}, {name: "poliwag", id: 60},
            {name: "tentacool", id: 72}, {name: "slowpoke", id: 79}, {name: "seel", id: 86},
            {name: "shellder", id: 90}, {name: "krabby", id: 98}, {name: "horsea", id: 116},
            {name: "goldeen", id: 118}, {name: "staryu", id: 120}, {name: "magikarp", id: 129},
            {name: "gyarados", id: 130}, {name: "lapras", id: 131}, {name: "vaporeon", id: 134},
            {name: "totodile", id: 158}, {name: "chinchou", id: 170}, {name: "marill", id: 183},
            {name: "wooper", id: 194}, {name: "qwilfish", id: 211}, {name: "corsola", id: 222},
            {name: "remoraid", id: 223}, {name: "mantine", id: 226}, {name: "mudkip", id: 258},
            {name: "lotad", id: 270}, {name: "wingull", id: 278}, {name: "surskit", id: 283},
            {name: "carvanha", id: 318}, {name: "wailmer", id: 320}, {name: "barboach", id: 339},
            {name: "corphish", id: 341}, {name: "feebas", id: 349}, {name: "spheal", id: 363},
            {name: "clamperl", id: 366}, {name: "relicanth", id: 369}, {name: "luvdisc", id: 370},
            {name: "kyogre", id: 382}, {name: "piplup", id: 393}, {name: "buizel", id: 418},
            {name: "shellos", id: 422}, {name: "finneon", id: 456}, {name: "mantyke", id: 458},
            {name: "oshawott", id: 501}, {name: "panpour", id: 515}, {name: "tympole", id: 535},
            {name: "basculin", id: 550}, {name: "tirtouga", id: 564}, {name: "ducklett", id: 580},
            {name: "frillish", id: 592}, {name: "alomomola", id: 594}, {name: "froakie", id: 656},
            {name: "clauncher", id: 692}, {name: "popplio", id: 728}, {name: "wishiwashi", id: 746},
            {name: "mareanie", id: 747}, {name: "dewpider", id: 751}, {name: "wimpod", id: 767},
            {name: "bruxish", id: 779}, {name: "sobble", id: 816}, {name: "chewtle", id: 833},
            {name: "arrokuda", id: 846}, {name: "cramorant", id: 845}, {name: "quaxly", id: 912},
            {name: "wiglett", id: 962}, {name: "palafin", id: 964}, {name: "veluza", id: 976},
            {name: "dondozo", id: 977}, {name: "tatsugiri", id: 978}
        ];
    }
}

export function getSpriteUrl(id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}
