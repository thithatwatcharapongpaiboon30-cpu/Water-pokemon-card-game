import { kv } from '@vercel/kv';

// In-memory fallback for development or single-instance serverless
const globalStore = globalThis.__ROOMS_STORE__ || {};
globalThis.__ROOMS_STORE__ = globalStore;

export const getRoom = async (code) => {
    if (process.env.KV_REST_API_URL) {
        try {
            return await kv.get(`room:${code}`);
        } catch (e) {
            console.error("KV get error:", e);
            throw new Error("Failed to connect to Vercel KV. Please check your KV_REST_API_URL and KV_REST_API_TOKEN environment variables.");
        }
    }
    return globalStore[code];
};

export const setRoom = async (code, data) => {
    if (process.env.KV_REST_API_URL) {
        try {
            await kv.set(`room:${code}`, data, { ex: 30 * 60 }); // 30 mins expiry
        } catch (e) {
            console.error("KV set error:", e);
            throw new Error("Failed to connect to Vercel KV. Please check your KV_REST_API_URL and KV_REST_API_TOKEN environment variables.");
        }
    } else {
        globalStore[code] = data;
    }
};

export const deleteRoom = async (code) => {
    if (process.env.KV_REST_API_URL) {
        try {
            await kv.del(`room:${code}`);
        } catch (e) {
            console.error("KV del error:", e);
            throw new Error("Failed to connect to Vercel KV. Please check your KV_REST_API_URL and KV_REST_API_TOKEN environment variables.");
        }
    } else {
        delete globalStore[code];
    }
};

// Cleanup inactive rooms (older than 30 mins) for local DB
setInterval(() => {
    if (process.env.KV_REST_API_URL) return;
    const now = Date.now();
    for (const code in globalStore) {
        if (now - globalStore[code].lastActive > 30 * 60 * 1000) {
            delete globalStore[code];
        }
    }
}, 60 * 1000);
