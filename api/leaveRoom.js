import { getRoom, setRoom } from './store.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { code, playerName } = req.body;
    const room = await getRoom(code?.toUpperCase());
    if (room) {
        const player = room.players.find(p => p.name === playerName);
        if (player) {
            player.connected = false;
            await setRoom(code.toUpperCase(), room);
        }
    }
    res.status(200).json({ success: true });
}
