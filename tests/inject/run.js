import karma from 'karma';
import path from 'path';
import url from 'url';
import {createEchoServer} from './echo-server.js';

const ECHO_SERVER_PORT = 9966;
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

async function run() {
    const args = process.argv.slice(2);
    const debug = args.includes('--debug');
    const karmaConfig = karma.config.parseConfig(path.join(__dirname, './karma.conf.cjs'), /** @type {any} */({debug}));

    const echoServer = await createEchoServer(ECHO_SERVER_PORT);
    const karmaServer = new karma.Server(/** @type {any} */(karmaConfig), () => {
        echoServer.close();
    });
    karmaServer.start();

    async function stop() {
        await /** @type {any} */(karmaServer).stop();
    }

    process.on('exit', stop);
    process.on('SIGINT', stop);
}

run();
