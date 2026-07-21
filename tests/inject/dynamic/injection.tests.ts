import {injectStyleAway, removeStyleContainer} from '../../../src/inject/dynamic-theme/injection';
import {timeout} from '../support/test-utils';

describe('STYLE INJECTION', () => {
    let originalBody: HTMLElement;

    beforeEach(() => {
        removeStyleContainer();
        originalBody = document.body;
        originalBody.remove();
    });

    afterEach(() => {
        removeStyleContainer();
        document.body?.remove();
        document.documentElement.append(originalBody);
    });

    it('should inject a queued style when the body becomes available', async () => {
        const style = document.createElement('style');
        style.textContent = 'body { color: white; }';

        injectStyleAway(style);
        expect(style.isConnected).toBe(false);

        const body = document.createElement('body');
        document.documentElement.append(body);
        await timeout(0);

        const container = body.querySelector('.darkreader-style-container');
        expect(container).not.toBeNull();
        expect(container!.lastElementChild).toBe(style);
        expect(style.sheet!.cssRules.length).toBe(1);
    });

    it('should clear queued styles and allow observing a new body', async () => {
        const discardedStyle = document.createElement('style');
        injectStyleAway(discardedStyle);
        removeStyleContainer();

        const firstBody = document.createElement('body');
        document.documentElement.append(firstBody);
        await timeout(0);

        expect(firstBody.querySelector('.darkreader-style-container')).toBeNull();
        expect(discardedStyle.isConnected).toBe(false);

        firstBody.remove();
        const injectedStyle = document.createElement('style');
        injectStyleAway(injectedStyle);

        const secondBody = document.createElement('body');
        document.documentElement.append(secondBody);
        await timeout(0);

        expect(secondBody.querySelector('.darkreader-style-container')?.lastElementChild).toBe(injectedStyle);
    });
});
