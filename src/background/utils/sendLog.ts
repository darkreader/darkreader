declare const __DEBUG__: boolean;
declare const __LOG__: 'info' | 'warn';

let socket: WebSocket | null = null;
let messageQueue: string[] = [];
function createSocket() {
    if (socket) {
        return;
    }
    const newSocket = new WebSocket(`ws://localhost:${9000}`);
    socket = newSocket;
    newSocket.addEventListener('open', () => {
        messageQueue.forEach((message) => newSocket.send(message));
        messageQueue = [];
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
