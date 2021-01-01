import {m} from 'malevic';

interface LinkProps {
    cls: string;
    url: string;
}

function openTab(url: string) {
    return () => chrome.tabs.create({url});
}

export default function Link({cls, url}: LinkProps, ...children) {
    return (
        <a
            class={cls}
            onclick={openTab(url)}
            rel="noopener noreferrer"
        >
            {...children}
        </a>
    );
}
