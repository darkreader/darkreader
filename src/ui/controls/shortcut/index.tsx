import {html} from 'malevic';
import {mergeClass} from '../utils';
import {getCommands} from '../../../background/utils';
import {Shortcuts} from '../../../definitions';

interface ShortcutLinkProps {
    class?: string | {[cls: string]: any};
    commandName: string;
    shortcuts: Shortcuts;
    textTemplate: (shortcut: string) => string;
}

/**
 * Displays a shortcut and navigates 
 * to Chrome Commands page on click.
 */
export default function ShortcutLink(props: ShortcutLinkProps) {
    const cls = mergeClass('shortcut', props.class);
    const shortcut = props.shortcuts[props.commandName];

    function onClick(e: Event) {
        e.preventDefault();
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
