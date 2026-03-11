import { getRoom, setRoom } from './store.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    try {
        const { code, playerName } = req.body;
        if (!code || !playerName) return res.status(400).json({ error: 'Code and player name required' });

        const room = await getRoom(code.toUpperCase());
        if (!room) return res.status(404).json({ error: 'Room not found' });
        
        room.lastActive = Date.now();

        const existingPlayer = room.players.find(p => p.name === playerName);
        if (existingPlayer) {
            existingPlayer.connected = true;
            await setRoom(code.toUpperCase(), room);
            return res.status(200).json({ room, message: 'Rejoined successfully' });
        }

        if (room.started) return res.status(403).json({ error: 'Game already started' });
        if (room.players.length >= 10) return res.status(403).json({ error: 'Room is full' });
        if (room.players.find(p => p.name === playerName)) return res.status(403).json({ error: 'Username taken' });

        room.players.push({ id: playerName, name: playerName, isHuman: true, hand: [], isAlive: true, connected: true });
        
        await setRoom(code.toUpperCase(), room);
        res.status(200).json({ room });
    } catch (error) {
        console.error("Error joining room:", error);
        res.status(500).json({ error: error.message || "Failed to join room. Please check your KV environment variables if using Vercel KV." });
    }
}
