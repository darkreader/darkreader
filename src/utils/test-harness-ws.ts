/** Must match POPUP_TEST_PORT in tests/browser/ports.js */
export const TEST_HARNESS_WS_URL = 'ws://localhost:8894';

interface TestHarnessSocketHandlers {
    onOpen: (socket: WebSocket) => void | Promise<void>;
    onMessage: (event: MessageEvent, socket: WebSocket) => void;
}

/**
 * Connects to the browser integration test harness and reconnects after disconnect
 * so a single extension process can survive multiple Jest test files.
 */
export function openTestHarnessSocket(handlers: TestHarnessSocketHandlers): void {
    const connect = () => {
        const socket = new WebSocket(TEST_HARNESS_WS_URL);
        socket.onopen = () => {
            void handlers.onOpen(socket);
        };
        socket.onmessage = (event) => {
            handlers.onMessage(event, socket);
        };
        socket.onclose = () => {
            setTimeout(connect, 50);
        };
    };
    connect();
}
