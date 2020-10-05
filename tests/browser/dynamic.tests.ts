function multiline(...lines) {
    return lines.join('\n');
}

describe('Loading test page', () => {
    it('should load without errors', async () => {
        await loadTestPage({
            '/': multiline(
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                '    <title>Test page</title>',
                '    <link rel="stylesheet" href="style.css"/>',
                '    <script src="script.js" defer></script>',
                '</head>',
                '<body>',
                '    <h1>Hello, <strong>World</strong>!</h1>',
                '</body>',
                '<html>',
                '</html>',
            ),
            '/script.js': multiline(
                'if (true || false) {',
                '    document.querySelector("h1 strong").style.color = "red";',
                '} else {',
                '    throw new Error("Impossible");',
                '}',
            ),
            '/style.css': multiline(
                'body {',
                '    background-color: gray;',
                '}',
            ),
        });

        await expect(page.evaluate(() => document.title)).resolves.toBe('Test page');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(96, 104, 108)');
        await expect(page.evaluate(() => document.querySelector('h1').textContent)).resolves.toBe('Hello, World!');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1 strong')).color)).resolves.toBe('rgb(255, 26, 26)');
    });
});
