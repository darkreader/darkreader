import {isFirefox} from './platform';

async function getOKResponse(url: string, mimeType?: string, origin?: string): Promise<Response> {
    const credentials = origin && url.startsWith(`${origin}/`) ? undefined : 'omit';
    const response = await fetch(
        url,
        {
            cache: 'force-cache',
            credentials,
            referrer: origin,
        },
    );

    // Firefox bug, content type is "application/x-unknown-content-type"
    if (isFirefox && mimeType === 'text/css' && url.startsWith('moz-extension://') && url.endsWith('.css')) {
        return response;
    }

    if (mimeType && !(response.headers.get('Content-Type') === mimeType || response.headers.get('Content-Type')!.startsWith(`${mimeType};`))) {
        throw new Error(`Mime type mismatch when loading ${url}`);
    }

    if (!response.ok) {
        throw new Error(`Unable to load ${url} ${response.status} ${response.statusText}`);
    }

    return response;
}

export async function loadAsDataURL(url: string, mimeType?: string): Promise<string> {
    const response = await getOKResponse(url, mimeType);
    return await readResponseAsDataURL(response);
}

export async function loadAsBlob(url: string, mimeType?: string): Promise<Blob> {
    const response = await getOKResponse(url, mimeType);
    return await response.blob();
}

export async function readResponseAsDataURL(response: Response): Promise<string> {
    const blob = await response.blob();
    const dataURL = await (new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    }));
    return dataURL;
}

export async function loadAsText(url: string, mimeType?: string, origin?: string): Promise<string> {
    const response = await getOKResponse(url, mimeType, origin);
    return await response.text();
}
