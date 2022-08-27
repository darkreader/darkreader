declare const __DEBUG__: boolean;
declare const __LOG__: 'info' | 'warn';

let socket: WebSocket = null;
let messageQueue: string[] | null = [];
function createSocket() {
    if (socket) {
        return;
    }
    socket = new WebSocket(`ws://localhost:${9000}`);
    socket.addEventListener('open', () => {
        messageQueue.forEach((message) => socket.send(message));
        messageQueue = null;
    });
}

export function sendLog(level: 'info' | 'warn', ...args: any[]) {
    if (!__DEBUG__ || !__LOG__) {
        return;
    }
    const message = JSON.stringify({level, log: args});
    if (socket && socket.readyState === socket.OPEN) {
        socket.send(message);
    } else {
        createSocket();
        messageQueue.push(message);
    }
}
