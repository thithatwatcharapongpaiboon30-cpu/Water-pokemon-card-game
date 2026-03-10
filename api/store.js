// In-memory store fallback
global.rooms = global.rooms || {};

export const getRooms = () => global.rooms;
export const getRoom = (code) => global.rooms[code];
export const setRoom = (code, data) => { global.rooms[code] = data; };
export const deleteRoom = (code) => { delete global.rooms[code]; };

// Cleanup inactive rooms (older than 30 mins)
setInterval(() => {
    const now = Date.now();
    for (const code in global.rooms) {
        if (now - global.rooms[code].lastActive > 30 * 60 * 1000) {
            delete global.rooms[code];
        }
    }
}, 60 * 1000);
