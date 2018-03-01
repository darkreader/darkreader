import {html} from 'malevic';
import {mergeClass} from '../utils';

interface ShortcutLinkProps {
    class?: string | {[cls: string]: any};
    commandName: string;
    textTemplate: (shortcut: string) => string;
}

function getChromeShortcut(commandName: string) {
    return new Promise<string>((resolve, reject) => {
        if (!chrome.commands) {
            requestAnimationFrame(() => reject('chrome.commands not supported'));
            return;
        }
        chrome.commands.getAll((commands) => {
            if (commands) {
                const cmd = commands.filter(({name}) => name === commandName)[0];
                if (cmd) {
                    resolve(cmd.shortcut);
                } else {
                    reject(`Command "${commandName}" not found.`);
                }
            }
        });
    });
}

/**
 * Displays a shortcut and navigates 
 * to Chrome Commands page on click.
 */
export default function ShortcutLink(props: ShortcutLinkProps) {
    const cls = mergeClass('shortcut', props.class);

    function setupText(node: HTMLElement) {
        getChromeShortcut(props.commandName)
            .then((shortcut) => {
                const text = props.textTemplate(shortcut);
                node.textContent = text;
            })
            .catch((err) => {
                node.textContent = err;
            });
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
