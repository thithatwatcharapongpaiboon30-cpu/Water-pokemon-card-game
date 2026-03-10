import { getRooms, setRoom } from './store.js';

function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    try {
        const { hostName, mode } = req.body;
        if (!hostName) return res.status(400).json({ error: 'Host name required' });

        let code = generateCode();
        const rooms = await getRooms();
        while (rooms[code]) {
            code = generateCode();
        }

        const room = {
            code,
            host: hostName,
            players: [{ id: hostName, name: hostName, isHuman: true, hand: [], isAlive: true, connected: true }],
            deck: [],
            discardPile: [],
            turnIndex: 0,
            turnDirection: 1,
            turnsRemaining: 1,
            mode: mode || 'normal',
            started: false,
            lastActive: Date.now(),
            turnCount: 0,
            activeEvent: null,
            logs: []
        };

        await setRoom(code, room);
        res.status(200).json({ roomCode: code, room });
    } catch (error) {
        console.error("Error creating room:", error);
        res.status(500).json({ error: "Failed to create room. Please check your KV environment variables if using Vercel KV." });
    }
}
