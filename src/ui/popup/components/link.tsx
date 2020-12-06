import {m} from 'malevic';

interface LinkProps {
    cls: string;
    url: string;
}

export default function Link({cls, url}: LinkProps, ...children) {
    return (
        <a
            class={cls}
            onclick={() => chrome.tabs.create({url})}
        >
            {...children}
        </a>
    );
}
