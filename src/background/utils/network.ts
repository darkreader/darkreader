interface JsonRequestParams<T> {
    url: string;
    timeout?: number;
}

/**
 * Loads and parses JSON from file to object.
 * @param params Object containing request parameters.
 */
export function readJson<T>(params: JsonRequestParams<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.overrideMimeType("application/json");
        request.open(
            'GET',
            `${params.url}?nocache=${Date.now()}`,
            true
        );
        request.onload = () => {
            if (request.status >= 200 && request.status < 300) {
                // Remove comments
                const resultText = request.responseText
                    .replace(/(\".*?(\\\".*?)*?\")|(\/\*(.|[\r\n])*?\*\/)|(\/\/.*?[\r\n])/gm, '$1');

                const json = JSON.parse(resultText);
                resolve(json);
            } else {
                reject(new Error(request.status + ': ' + request.statusText));
            }
        };
        request.onerror = (err: ErrorEvent) => reject(err.error);
        if (params.timeout) {
            request.timeout = params.timeout;
            request.ontimeout = () => reject(new Error('Config loading stopped due to timeout'));
        }
        request.send();
    });
}
