import {isFirefox} from './platform';

declare const __TEST__: boolean;

async function getOKResponse(url: string, mimeType?: string, origin?: string): Promise<Response> {
    const credentials = origin && url.startsWith(`${origin}/`) ? undefined : 'omit';
    const redirect = mimeType === 'text/css' ? undefined : 'error';
    const response = await fetch(
        url,
        {
            cache: 'force-cache',
            credentials,
            referrer: origin,
            redirect,
        },
    );

    // Firefox bug, content type is "application/x-unknown-content-type"
    if (isFirefox && mimeType === 'text/css' && url.startsWith('moz-extension://') && url.endsWith('.css')) {
        return response;
    }

    const contentType = response.headers.get('Content-Type');
    if (mimeType && !(contentType === mimeType || contentType?.startsWith(`${mimeType};`))) {
        throw new Error(`Mime type mismatch when loading ${url}`);
    }

    if (response.redirected && response.url && shouldIgnoreCors(new URL(response.url))) {
        throw new Error('Cross-origin limit reached');
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
    const dataURL = await (new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    }));
    return dataURL;
}

export async function loadAsText(url: string, mimeType?: string, origin?: string): Promise<string> {
    const response = await getOKResponse(url, mimeType, origin);
    return await response.text();
}

const MAX_CORS_HOSTS = 16;
const corsHosts = new Set<string>();
const checkedHosts = new Set<string>();
const localAliases = [
    '127-0-0-1.org.uk',
    '42foo.com',
    'domaincontrol.com',
    'fbi.com',
    'fuf.me',
    'lacolhost.com',
    'local.sisteminha.com',
    'localfabriek.nl',
    'localhost',
    'localhst.co.uk',
    'localmachine.info',
    'localmachine.name',
    'localtest.me',
    'lvh.me',
    'mouse-potato.com',
    'nip.io',
    'sslip.io',
    'vcap.me',
    'xip.io',
    'yoogle.com',
];
const localSubDomains = [
    '.corp',
    '.direct',
    '.home',
    '.internal',
    '.intranet',
    '.lan',
    '.local',
    '.localdomain',
    '.test',
    '.zz',
    ...localAliases.map((alias) => `.${alias}`),
];

function isIPHost(hostname: string): boolean {
    if (hostname.startsWith('[')) {
        return true;
    }
    const labels = hostname.split('.');
    const last = labels[labels.length - 1];
    return /^(0x[0-9a-f]+|\d+)$/i.test(last);
}

export function shouldIgnoreCors(url: URL) {
    if (__TEST__) {
        return false;
    }
    const {host, port, protocol} = url;
    const hostname = url.hostname.endsWith('.') ? url.hostname.slice(0, -1) : url.hostname;
    if (!corsHosts.has(host)) {
        corsHosts.add(host);
    }
    if (checkedHosts.has(host)) {
        return false;
    }
    if (
        corsHosts.size >= MAX_CORS_HOSTS ||
        protocol !== 'https:' ||
        port !== '' ||
        localAliases.includes(hostname) ||
        localSubDomains.some((sub) => hostname.endsWith(sub)) ||
        isIPHost(hostname)
    ) {
        return true;
    }
    checkedHosts.add(host);
    return false;
}
