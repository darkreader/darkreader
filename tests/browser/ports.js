// @ts-check
/**
 * Browser integration test ports. Must stay aligned with __TEST__ WebSocket URLs in:
 *   src/background/index.ts, src/inject/index.ts, src/ui/popup/index.tsx, src/ui/devtools/index.tsx
 */
export const TEST_SERVER_PORT = 8891;
export const CORS_SERVER_PORT = 8892;
export const FIREFOX_DEVTOOLS_PORT = 8893;
export const POPUP_TEST_PORT = 8894;

/** WebSocket harness endpoint baked into test extension builds. */
export const TEST_WEBSOCKET_CONNECT_SRC = `ws://localhost:${POPUP_TEST_PORT}`;

/** Ports the browser Jest harness binds before launching a browser. */
export const BROWSER_HARNESS_PORTS = [
    TEST_SERVER_PORT,
    CORS_SERVER_PORT,
    FIREFOX_DEVTOOLS_PORT,
    POPUP_TEST_PORT,
];
