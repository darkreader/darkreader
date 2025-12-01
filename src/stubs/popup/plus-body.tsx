import {m} from 'malevic';

export function PlusBody(): Malevic.Child {
    return <body></body>;
}

export function activate(_email: string, _key: string): Promise<boolean> {
    return new Promise((resolve) => resolve(false));
}

export function shouldUseAltUI() {
    return false;
}

export function initAltUI(): Promise<void> {
    return new Promise((resolve) => resolve());
}
