interface RequestParams {
    url: string;
    timeout?: number;
}

export function readText(params: RequestParams): Promise<string> {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open(
            'GET',
            `${params.url}?nocache=${Date.now()}`,
            true
        );
        request.onload = () => {
            if (request.status >= 200 && request.status < 300) {
                resolve(request.responseText);
            } else {
                reject(new Error(`${request.status}: ${request.statusText}`));
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

/**
 * Loads and parses JSON from file to object.
 * @param params Object containing request parameters.
 */
export async function readJson<T>(params: RequestParams): Promise<T> {
    const rawJson = await readText(params);
    // Remove comments
    const json = rawJson
        .replace(/(\".*?(\\\".*?)*?\")|(\/\*(.|[\r\n])*?\*\/)|(\/\/.*?[\r\n])/gm, '$1');
    return JSON.parse(json);
}
