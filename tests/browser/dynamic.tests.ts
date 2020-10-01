import {Browser, Page} from "puppeteer-core";

const timeout = 5000;

describe('/ (Home Page)', () => {
    let browser: Browser;
    let page: Page;
    beforeAll(async () => {
        browser = (global as any).__BROWSER__;
        page = await browser.newPage();
        await page.goto('https://google.com');
    }, timeout);

    it('should load without error', async () => {
        const text = await page.evaluate(() => document.title);
        expect(text).toContain('Google');
    });
},
);
