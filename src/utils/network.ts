async function getOKResponse(url: string, mimeType?: string) {
    const response = await fetch(
        url,
        {
            cache: 'force-cache',
            credentials: 'omit',
            ...(mimeType ? {'Content-Type': mimeType} : {}),
        },
    );

    if (mimeType && !response.headers.get('Content-Type').startsWith(mimeType)) {
        throw new Error(`Mime type mismatch when loading ${url}`);
    }

    if (!response.ok) {
        throw new Error(`Unable to load ${url} ${response.status} ${response.statusText}`);
    }

    return response;
}

export async function loadAsDataURL(url: string, mimeType?: string) {
    const response = await getOKResponse(url, mimeType);
    const blob = await response.blob();
    const dataURL = await (new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    }));
    return dataURL;
}

export async function loadAsText(url: string, mimeType?: string) {
    const response = await getOKResponse(url, mimeType);
    const text = await response.text();
    return text;
}
