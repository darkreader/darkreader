import {html} from 'malevic';
import {mergeClass} from '../utils';
import {isFirefox, isMobile} from '../../../utils/platform';
import {Shortcuts} from '../../../definitions';

interface ShortcutLinkProps {
    class?: string | {[cls: string]: any};
    commandName: string;
    shortcuts: Shortcuts;
    textTemplate: (shortcut: string) => string;
    onSetShortcut: (shortvut: string) => void;
}

/**
 * Displays a shortcut and navigates 
 * to Chrome Commands page on click.
 */
export default function ShortcutLink(props: ShortcutLinkProps) {
    const cls = mergeClass('shortcut', props.class);
    const shortcut = props.shortcuts[props.commandName];

    function startEnteringShortcut(node: HTMLAnchorElement) {
        const initialText = node.textContent;
        node.textContent = 'enter shortcut';

        function onKeyDown(e: KeyboardEvent) {
            e.preventDefault();
            const ctrl = e.ctrlKey;
            const alt = e.altKey;
            const command = e.metaKey;
            const shift = e.shiftKey;
            const key = e.key.match(/^[0-9A-Z]$/i) ? e.key.toUpperCase() : null;

            const shortcut = `${ctrl ? 'Ctrl+' : alt ? 'Alt+' : alt ? 'Command+' : ''}${shift ? 'Shift+' : ''}${key ? key : ''}`;
            node.textContent = shortcut;

            if ((ctrl || alt || command || shift) && key) {
                removeListeners();
                props.onSetShortcut(shortcut);
                node.textContent = props.textTemplate(shortcut);
                node.blur();
            }
        }

        function onBlur() {
            removeListeners();
            node.textContent = initialText;
        }

        function removeListeners() {
            node.removeEventListener('keydown', onKeyDown);
            node.removeEventListener('blur', onBlur);
        }

        node.addEventListener('keydown', onKeyDown);
        node.addEventListener('blur', onBlur);
    }

    function onClick(e: Event) {
        e.preventDefault();
        if (isFirefox()) {
            startEnteringShortcut(e.target as HTMLAnchorElement);
            return;
        }
        chrome.tabs.create({
            url: `chrome://extensions/configureCommands#command-${chrome.runtime.id}-${props.commandName}`,
            active: true
        });
    }

    return (
        <a
            class={cls}
            href="#"
            onclick={onClick}
        >{props.textTemplate(shortcut)}</a>
    );
}
