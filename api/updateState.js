import { getRoom, setRoom } from './store.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    try {
        const { code, playerName, action, payload } = req.body;
        if (!code || !playerName || !action) return res.status(400).json({ error: 'Missing parameters' });

        const room = await getRoom(code.toUpperCase());
        if (!room) return res.status(404).json({ error: 'Room not found' });
        
        room.lastActive = Date.now();

        if (action === 'START_GAME') {
            if (room.host !== playerName) return res.status(403).json({ error: 'Only host can start' });
            Object.assign(room, payload.state);
            room.started = true;
            await setRoom(code.toUpperCase(), room);
            return res.status(200).json({ room });
        }

        if (action === 'UPDATE_FULL_STATE') {
            const currentPlayer = room.players[room.turnIndex];
            // Allow host to update state for AI turns
            if (currentPlayer.name !== playerName && room.host !== playerName) {
                return res.status(403).json({ error: 'Not your turn' });
            }
            
            // Basic validation: ensure turn index is valid
            if (payload.state.turnIndex < 0 || payload.state.turnIndex >= room.players.length) {
                return res.status(400).json({ error: 'Invalid turn index' });
            }

            Object.assign(room, payload.state);
            await setRoom(code.toUpperCase(), room);
            return res.status(200).json({ room });
        }

        if (action === 'KICK_PLAYER') {
            if (room.host !== playerName) return res.status(403).json({ error: 'Only host can kick' });
            room.players = room.players.filter(p => p.name !== payload.targetName);
            await setRoom(code.toUpperCase(), room);
            return res.status(200).json({ room });
        }

        res.status(400).json({ error: 'Unknown action' });
    } catch (error) {
        console.error("Error updating state:", error);
        res.status(500).json({ error: "Failed to update state. Please check your KV environment variables if using Vercel KV." });
    }
}
