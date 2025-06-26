import {m} from 'malevic';

export function PlusBody(): Malevic.Child {
    return <body></body>;
}

export function activate(_email: string, _key: string): Promise<boolean> {
    return new Promise((resolve) => resolve(false));
}
