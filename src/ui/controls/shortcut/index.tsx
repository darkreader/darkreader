import {m} from 'malevic';

import type {Shortcuts} from '../../../definitions';
import {isEdge} from '../../../utils/platform';
import {mergeClass} from '../utils';

interface ShortcutLinkProps {
    class?: string | {[cls: string]: any};
    commandName: string;
    shortcuts: Shortcuts;
    textTemplate: (shortcut: string | null) => string;
    onSetShortcut: (shortcut: string) => Promise<string | null>;
}

/**
 * Displays a shortcut and navigates
 * to Chrome Commands page on click.
 */
export default function ShortcutLink(props: ShortcutLinkProps) {
    const shortcut = props.shortcuts[props.commandName];
    const shortcutMessage = props.textTemplate(shortcut);
    const cls = mergeClass('shortcut', [shortcut ? 'shortcut--set' : null, props.class]);

    function onClick(e: Event) {
        e.preventDefault();
        if (isEdge) {
            chrome.tabs.create({
                url: `edge://extensions/shortcuts`,
                active: true,
            });
            return;
        }
        chrome.tabs.create({
            url: `chrome://extensions/configureCommands#command-${chrome.runtime.id}-${props.commandName}`,
            active: true,
        });
    }

    function onRender(node: HTMLAnchorElement) {
        node.textContent = shortcutMessage;
    }

    return (
        <a
            class={cls}
            href="#"
            onclick={onClick}
            oncreate={onRender}
        ></a>
    );
}
