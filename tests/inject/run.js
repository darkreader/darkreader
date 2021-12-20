import karma from 'karma';
import {createEchoServer} from './echo-server.js';
import setKarmaConfig from './karma.conf.js';

const ECHO_SERVER_PORT = 9966;

async function run() {
    const args = process.argv.slice(2);
    const debug = args.includes('--debug');
    // NOTE: Patching karma/lib/config.js is required to accept a function
    const karmaConfig = karma.config.parseConfig(setKarmaConfig, {debug});

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
