import { getRoom } from './store.js';

export default function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { code, playerName } = req.body;
    const room = getRoom(code?.toUpperCase());
    if (room) {
        const player = room.players.find(p => p.name === playerName);
        if (player) player.connected = false;
    }
    res.status(200).json({ success: true });
}
