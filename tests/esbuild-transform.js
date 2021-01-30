const {transformSync} = require('esbuild');

module.exports = {
    process(content) {
        const result = transformSync(content, {
            loader: 'ts',
            format: 'cjs',
            target: 'es2019',
            sourcemap: 'inline',
            banner: '"use strict";',
        });
        return {
            code: result.code,
            map: result.map ? {
                ...JSON.parse(result.map),
                sourcesContent: null,
            } : ''
        };
    }
};
