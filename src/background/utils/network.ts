interface RequestParams {
    url: string;
    timeout?: number;
}

export function readText(params: RequestParams): Promise<string> {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.overrideMimeType('text/plain');
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
        request.onerror = () => reject(new Error(`${request.status}: ${request.statusText}`));
        if (params.timeout) {
            request.timeout = params.timeout;
            request.ontimeout = () => reject(new Error('Config loading stopped due to timeout'));
        }
        request.send();
    });
}
