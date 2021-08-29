// @ts-check
const http = require('http');
const url = require('url');

const port = 1357;
http.createServer((request, response) => {
    const parsedurl = url.parse(request.url);
    const query = parsedurl.query;
    if (query == null) {
        response.writeHead(404, {'Content-Type': 'text/plain'});
        response.write('404 Not Found\n');
        response.end();
        return;
    }
    const type = query.includes('links') || query.includes('rules') || query.includes('styles') ? 'index' : query.startsWith('generated') ? 'css' : '404';
    if (type === '404') {
        response.writeHead(404, {'Content-Type': 'text/plain'});
        response.write('404 Not Found\n');
        response.end();
        return;
    }
    if (type === 'index') {
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.write(getHTML(query).join('\n'));
        response.end();
    } else {
        response.writeHead(200, {'Content-Type': 'text/css'});
        const parts = chunkString(CSS(query), 100);
        const write = () => {
            const chunk = parts.unshift();
            if (chunk) {
                response.write(chunk);
                setTimeout(write, 10);
            } else {
                response.end();
            }
        };
        write();
    }
}).listen(port, function () {
    console.log(`The benchmark server has been opened on port ${port}`);
});

/**
 * @param {string} str
 * @param {string | number} length
 */
function chunkString(str, length) {
    return str.match(new RegExp(`.{1,${ length }}`, 'g'));
}

/**
 * Returns an generated CSS style
 *
 * @param {string} query
 */
function CSS(query) {
    const realquery = query.split('=');
    const generated = parseInt(realquery[1]);
    let result = '';
    for (let x = 1; x <= generated; x++) {
        result = `${result }.GeneratedLinkElement${x} { background-color: black }\n`;
    }
    return result;
}

/**
 * Generate a link to 'external css'
 *
 * @param {number} amount
 */
function link(amount) {
    let result = '';
    let element = '';
    if (amount === 0) {
        return result;
    }
    result = `\t\t\t<link rel="stylesheet" type="text/css" href="style.css?generated=${amount}">\n`;
    for (let x = 1; x <= amount; x++) {
        element = `${element }\t\t<p class="GeneratedLinkElement${x}">This is an GeneratedLinkElement ${x}</p>\n`;
    }
    return [result, element];
}

/**
 * Generate inline style elements
 *
 * @param {number} amount
 */
function style(amount) {
    let result = '';
    if (amount === 0) {
        return result;
    }
    for (let x = 1; x <= amount; x++) {
        result = `${result }\t\t<p style="background-color: green">This is an inline style element ${x}</p>\n`;
    }
    return result;
}

/**
 * Generate a style
 *
 * @param {number} amount
 */
function rule(amount) {
    let result = '';
    let element = '';
    if (amount === 0) {
        return result;
    }
    result = `${result }\t\t\t<style>`;
    for (let x = 1; x <= amount; x++) {
        result = `${result }.GeneratedElement${x} { background-color: red }\n`;
        element = `${element }\t\t<p class="GeneratedElement${x}">This is an GeneratedElement ${x}</p>\n`;
    }
    result = `${result }</style>\n`;
    return [result, element];
}

/**
 * @param {string} query
 */
function getHTML(query) {
    const realquery = query.split('=').join('&').split('&');
    const links = realquery[realquery.indexOf('links') + 1];
    const styles = realquery[realquery.indexOf('styles') + 1];
    const rules = realquery[realquery.indexOf('rules') + 1];
    const linkHTML = link(parseInt(links));
    const styleHTML = style(parseInt(styles));
    const ruleHTML = rule(parseInt(rules));
    const HTML = [];
    HTML.push(
        '<html>',
        '   <head>',
        '       <title>Benchmark Server</title>',
        ruleHTML[0],
        linkHTML[0],
        '   </head>',
        '   <body>',
        styleHTML,
        linkHTML[1],
        ruleHTML[1],
        '   </body>',
        '</html>',
    );
    return HTML;
}
