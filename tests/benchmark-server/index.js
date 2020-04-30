//@ts-check
const http = require('http');
const url = require('url');

const port = 1357;
const server = http.createServer((request, response) => {
    const parsedurl = url.parse(request.url);
    const query = parsedurl.query
    const type = query.includes('links') ? 'index' : query.startsWith('generated') ? 'css' : '404'
    if (type === '404') {
        response.writeHead(404, { "Content-Type": "text/plain" });
        response.write("404 Not Found\n");
        response.end();
        return;
    }
    if (type === 'index') {
        html(query);
    } else {
        CSS(query);
    }

}).listen(port, function () {
    console.log('The benchmark server has been opened on port ' + port);
});

function CSS(query) {

}
function html(query) {
    const realquery = query.split("=").join("&").split('&');
    const links = realquery[realquery.indexOf('links') + 1];
    const styles = realquery[realquery.indexOf('styles') + 1];
    const rules = realquery[realquery.indexOf('rules') + 1];
}
