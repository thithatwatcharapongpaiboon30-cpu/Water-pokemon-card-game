export const Network = {
    roomCode: null,
    playerName: null,
    isHost: false,
    pollInterval: null,

    async createRoom(hostName, mode) {
        const res = await fetch('/api/createRoom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hostName, mode })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        this.roomCode = data.roomCode;
        this.playerName = hostName;
        this.isHost = true;
        return data.room;
    },

    async joinRoom(code, playerName) {
        const res = await fetch('/api/joinRoom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, playerName })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        this.roomCode = data.room.code;
        this.playerName = playerName;
        this.isHost = data.room.host === playerName;
        return data.room;
    },

    async getState() {
        if (!this.roomCode) return null;
        const res = await fetch(`/api/getState?code=${this.roomCode}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data.room;
    },

    async updateState(action, payload) {
        if (!this.roomCode) return;
        const res = await fetch('/api/updateState', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: this.roomCode,
                playerName: this.playerName,
                action,
                payload
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data.room;
    },

    async leaveRoom() {
        if (!this.roomCode) return;
        await fetch('/api/leaveRoom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: this.roomCode, playerName: this.playerName })
        });
        this.stopPolling();
        this.roomCode = null;
        this.playerName = null;
        this.isHost = false;
    },

    startPolling(callback) {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = setInterval(async () => {
            try {
                const room = await this.getState();
                callback(room);
            } catch (e) {
                console.error("Polling error:", e);
            }
        }, 1500);
    },

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
};
