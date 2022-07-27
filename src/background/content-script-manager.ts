import {logWarn} from '../utils/log';

declare const __MV3__: boolean;

export default class ContentScriptManager {
    /**
     * TODO: migrate to using promisses directly instead of wrapping callbacks.
     * Docs say that Promisses are not suported yet, but in practice they appear
     * to be supported already.
     */

    static async registerScripts() {
        if (!__MV3__) {
            logWarn('ContentScriptManager is useful only within MV3 builds.');
            return;
        }
        // Note: This API does not support injecting into about:blank.
        // That is, there is no alternative to InjectDetails.matchAboutBlank
        // or static manifest declaration 'match_about_blank'.
        // Therefore we need to also specify these scripts in manifes.json.
        return new Promise<void>((resolve) => {
            (chrome.scripting as any).registerContentScripts([{
                id: 'content_scripts',
                js: [
                    'inject/injector.js',
                    'inject/fallback.js',
                    'inject/index.js',
                ],
                runAt: 'document_start',
                persistAcrossSessions: true,
                matches: [
                    '<all_urls>',
                ],
                allFrames: true,
            }], resolve);
        });
    }

    static async unregisterScripts() {
        if (!__MV3__) {
            logWarn('ContentScriptManager is useful only within MV3 builds.');
            return;
        }
        return new Promise<void>((resolve) => (chrome.scripting as any).unregisterContentScripts(undefined, resolve));
    }
}
