/**
 * This file is necessary because Karma does not support configutation
 * via ES modules. This file is a CommonJS module which wraps a regular
 * ES module.
 */

'use strict';

const realConfigureKarma = import('./karma.conf.js');

async function configureKarma(config, env) {
    return ((await realConfigureKarma).configureKarma)(config, env);
}

/**
 * @param   {LocalConfig} config
 * @returns {void}
 */
module.exports = async (config) =>
    config.set(await configureKarma(config, process.env));

if (process.env.NODE_ENV === 'test') {
    module.exports.configureKarma = async (config, env) => configureKarma(config, env);
}
