import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'rooms.json');

// Initialize local DB file if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}), 'utf-8');
}

// Helper to read local DB
const readLocalDB = () => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
};

// Helper to write local DB
const writeLocalDB = (data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error("Failed to write to local DB", e);
    }
};

export const getRooms = async () => {
    if (process.env.KV_REST_API_URL) {
        return {}; // Uniqueness check fallback
    }
    return readLocalDB();
};

export const getRoom = async (code) => {
    if (process.env.KV_REST_API_URL) {
        return await kv.get(`room:${code}`);
    }
    const rooms = readLocalDB();
    return rooms[code];
};

export const setRoom = async (code, data) => {
    if (process.env.KV_REST_API_URL) {
        await kv.set(`room:${code}`, data, { ex: 30 * 60 }); // 30 mins expiry
    } else {
        const rooms = readLocalDB();
        rooms[code] = data;
        writeLocalDB(rooms);
    }
};

export const deleteRoom = async (code) => {
    if (process.env.KV_REST_API_URL) {
        await kv.del(`room:${code}`);
    } else {
        const rooms = readLocalDB();
        delete rooms[code];
        writeLocalDB(rooms);
    }
};

// Cleanup inactive rooms (older than 30 mins) for local DB
setInterval(() => {
    if (process.env.KV_REST_API_URL) return;
    const now = Date.now();
    const rooms = readLocalDB();
    let changed = false;
    for (const code in rooms) {
        if (now - rooms[code].lastActive > 30 * 60 * 1000) {
            delete rooms[code];
            changed = true;
        }
    }
    if (changed) writeLocalDB(rooms);
}, 60 * 1000);
