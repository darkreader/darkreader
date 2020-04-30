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
    const type = query.includes('links') ? 'index' : query.startsWith('generated') ? 'css' : '404';
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
        response.write(CSS(query));
        response.end();
    }

}).listen(port, function () {
    console.log(`The benchmark server has been opened on port ${port}`);
});

/**
 * Returns an generated CSS style
 *
 * @param {string} query
 */
function CSS(query) {
    const realquery = query.split('=');
    const generated = realquery[1];
    let result = '';
    result = `.GeneratedLinkElement ${generated} { background-color: black }`;
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
    for (let x = 1; x <= amount; x++) {
        result = result + `\t\t\t<link rel="stylesheet" type="text/css" href="style.css?generated='+x+'">\n`;
        element = element + `\t\t<p class="GeneratedLinkElement${x}">This is an GeneratedLinkElement ${x}</p>\n`;
    }
    return [result, element];
}

/**
 * Generate inline style elements
 *
 * @param {number} amount
 */
function style(amount) {
    let result = '';;
    if (amount === 0) {
        return result;
    }
    for (let x = 1; x <= amount; x++) {
        result = result + `\t\t<p style="background-color: green">This is an inline style element ${x}</p>\n`;
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
    for (let x = 1; x <= amount; x++) {
        result = result + `\t\t\t<style id="GeneratedStyle${x}">.GeneratedElement'+x+' { background-color: red }</style>\n`;
        element = element + `\t\t<p class="GeneratedElement${x}">This is an GeneratedElement ${x}</p>\n`;
    }
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
