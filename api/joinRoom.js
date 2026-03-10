import { getRoom } from './store.js';

export default function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { code, playerName } = req.body;
    if (!code || !playerName) return res.status(400).json({ error: 'Code and player name required' });

    const room = getRoom(code.toUpperCase());
    if (!room) return res.status(404).json({ error: 'Room not found' });
    
    room.lastActive = Date.now();

    const existingPlayer = room.players.find(p => p.name === playerName);
    if (existingPlayer) {
        existingPlayer.connected = true;
        return res.status(200).json({ room, message: 'Rejoined successfully' });
    }

    if (room.started) return res.status(403).json({ error: 'Game already started' });
    if (room.players.length >= 10) return res.status(403).json({ error: 'Room is full' });
    if (room.players.find(p => p.name === playerName)) return res.status(403).json({ error: 'Username taken' });

    room.players.push({ id: playerName, name: playerName, isHuman: true, hand: [], isAlive: true, connected: true });
    
    res.status(200).json({ room });
}
