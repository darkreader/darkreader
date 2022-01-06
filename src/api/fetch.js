// @ts-check
const throwCORSError = async (/** @type {string} */url) => {
    return Promise.reject(new Error(
        [
            'Embedded Dark Reader cannot access a cross-origin resource',
            url,
            'Overview your URLs and CORS policies or use',
            '`DarkReader.setFetchMethod(fetch: (url) => Promise<Response>))`.',
            'See if using `DarkReader.setFetchMethod(window.fetch)`',
            'before `DarkReader.enable()` works.'
        ].join(' '),
    ));
};

/** @typedef {(url: string) => Promise<Response>} Fetcher */

/** @type {Fetcher} */
let fetcher = throwCORSError;

/**
 * @param {Fetcher} fetch
 */
export function setFetchMethod(fetch) {
    if (fetch) {
        fetcher = fetch;
    } else {
        fetcher = throwCORSError;
    }
}

/**
 * @param {string} url
 * @returns {Promise<Response>}
 */
export async function callFetchMethod(url) {
    return await fetcher(url);
}
