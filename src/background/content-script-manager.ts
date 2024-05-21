import {logWarn} from './utils/log';

declare const __CHROMIUM_MV3__: boolean;

enum ContentScriptManagerState {
    UNKNOWN,
    REGISTERING,
    REGISTERED,
    NOTREGISTERED
}

export default class ContentScriptManager {
    /**
     * TODO: migrate to using promises directly instead of wrapping callbacks.
     * Docs say that Promises are not supported yet, but in practice they appear
     * to be supported already...
     */

    static state: ContentScriptManagerState;

    static async registerScripts(updateContentScripts: () => Promise<void>): Promise<void> {
        if (!__CHROMIUM_MV3__) {
            logWarn('ContentScriptManager is useful only within MV3 builds.');
            return;
        }

        if (ContentScriptManager.state === ContentScriptManagerState.REGISTERING ||
            ContentScriptManager.state === ContentScriptManagerState.REGISTERED) {
            return;
        }

        ContentScriptManager.state = ContentScriptManagerState.REGISTERING;

        return new Promise<void>((resolve) =>
            chrome.scripting.getRegisteredContentScripts(
                {ids: ['stylesheet-proxy', 'content-scripts']},
                (scripts) => {
                    if (scripts.length === 2) {
                        ContentScriptManager.state = ContentScriptManagerState.REGISTERED;
                        resolve();
                    } else {
                        ContentScriptManager.state = ContentScriptManagerState.NOTREGISTERED;
                        updateContentScripts();
                        // Note: This API does not support registering injections into about:blank.
                        // That is, there is no alternative to InjectDetails.matchAboutBlank
                        // or static manifest declaration 'match_about_blank'.
                        // Therefore we need to also specify these scripts in manifest.json
                        // just for about:blank.
                        chrome.scripting.registerContentScripts([
                            {
                                id: 'stylesheet-proxy',
                                js: [
                                    'inject/proxy.js',
                                ],
                                runAt: 'document_start',
                                persistAcrossSessions: true,
                                matches: [
                                    '<all_urls>',
                                ],
                                allFrames: true,
                                world: 'MAIN',
                            },
                            {
                                id: 'content-scripts',
                                js: [
                                    'inject/fallback.js',
                                    'inject/index.js',
                                ],
                                runAt: 'document_start',
                                persistAcrossSessions: true,
                                matches: [
                                    '<all_urls>',
                                ],
                                allFrames: true,
                                world: 'ISOLATED',
                            },
                        ], resolve);
                    }
                }
            ));
    }

    static async unregisterScripts(): Promise<void> {
        if (!__CHROMIUM_MV3__) {
            logWarn('ContentScriptManager is useful only within MV3 builds.');
            return;
        }

        if (ContentScriptManager.state === ContentScriptManagerState.NOTREGISTERED) {
            return;
        }

        return new Promise<void>((resolve) => chrome.scripting.unregisterContentScripts(() => {
            ContentScriptManager.state = ContentScriptManagerState.NOTREGISTERED;
            resolve();
        }));
    }
}
