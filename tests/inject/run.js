// @ts-check
const karma = require('karma');
const path = require('path');
const {createEchoServer} = require('./support/echo-server');

const ECHO_SERVER_PORT = 9966;

process.env.NODE_OPTIONS = '--max_old_space_size=3072';

async function run() {
    const args = process.argv.slice(2);
    const debug = args.includes('--debug');
    const ci = args.includes('--ci');
    const coverage = args.includes('--coverage');

    const configFilePath = path.join(__dirname, './karma.conf.js');
    /** @type {Object} */
    const cliOptions = {debug, ci, coverage};
    const parseOptions = {throwErrors: true};
    const karmaConfig = await karma.config.parseConfig(configFilePath, cliOptions, parseOptions);

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
