import { kv } from '@vercel/kv';

// In-memory store fallback
global.rooms = global.rooms || {};

export const getRooms = async () => {
    if (process.env.KV_REST_API_URL) {
        return {}; // Uniqueness check fallback
    }
    return global.rooms;
};

export const getRoom = async (code) => {
    if (process.env.KV_REST_API_URL) {
        return await kv.get(`room:${code}`);
    }
    return global.rooms[code];
};

export const setRoom = async (code, data) => {
    if (process.env.KV_REST_API_URL) {
        await kv.set(`room:${code}`, data, { ex: 30 * 60 }); // 30 mins expiry
    } else {
        global.rooms[code] = data;
    }
};

export const deleteRoom = async (code) => {
    if (process.env.KV_REST_API_URL) {
        await kv.del(`room:${code}`);
    } else {
        delete global.rooms[code];
    }
};

// Cleanup inactive rooms (older than 30 mins) for memory store
setInterval(() => {
    if (process.env.KV_REST_API_URL) return;
    const now = Date.now();
    for (const code in global.rooms) {
        if (now - global.rooms[code].lastActive > 30 * 60 * 1000) {
            delete global.rooms[code];
        }
    }
}, 60 * 1000);
