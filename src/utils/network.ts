async function getOKResponse(url: string) {
    const response = await fetch(url, {cache: 'force-cache'});
    if (response.ok) {
        return response;
    } else {
        throw new Error(`Unable to load ${url} ${response.status} ${response.statusText}`);
    }
}

export async function loadAsDataURL(url: string) {
    const response = await getOKResponse(url);
    const blob = await response.blob();
    const dataURL = await (new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    }));
    return dataURL;
}

export async function loadAsText(url: string) {
    const response = await getOKResponse(url);
    const text = await response.text();
    return text;
}
