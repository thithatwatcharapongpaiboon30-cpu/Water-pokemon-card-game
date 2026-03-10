import { getRoom } from './store.js';

export default function handler(req, res) {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Code required' });

    const room = getRoom(code.toUpperCase());
    if (!room) return res.status(404).json({ error: 'Room not found' });
    
    room.lastActive = Date.now();
    res.status(200).json({ room });
}
