import createRoom from './api/createRoom.js';

const req = {
    method: 'POST',
    body: { hostName: 'test', mode: 'normal' }
};
const res = {
    status: (code) => ({
        json: (data) => console.log(code, data)
    })
};

createRoom(req, res).catch(console.error);
