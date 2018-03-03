import {html} from 'malevic';
import {mergeClass} from '../utils';
import {getCommands} from '../../../background/utils';

interface ShortcutLinkProps {
    class?: string | {[cls: string]: any};
    commandName: string;
    textTemplate: (shortcut: string) => string;
}

/**
 * Displays a shortcut and navigates 
 * to Chrome Commands page on click.
 */
export default function ShortcutLink(props: ShortcutLinkProps) {
    const cls = mergeClass('shortcut', props.class);

    async function setupText(node: HTMLElement) {
        const commands = await getCommands();
        const command = commands.find((c) => c.name === props.commandName);
        const shortcut = command && command.shortcut ? command.shortcut : null;
        node.textContent = props.textTemplate(shortcut);
    }

    function onClick() {
        chrome.tabs.create({
            url: `chrome://extensions/configureCommands#command-${chrome.runtime.id}-${props.commandName}`,
            active: true
        });
    }

    return (
        <a
            class={cls}
            href="#"
            native
            didmount={setupText}
            onclick={onClick}
        ></a>
    );
}
