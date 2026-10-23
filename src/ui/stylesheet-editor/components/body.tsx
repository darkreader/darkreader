import { m } from 'malevic';
import { getContext } from 'malevic/dom';

import type { ExtWrapper } from '../../../definitions';
import { getURLHostOrProtocol, isURLInList } from '../../../utils/url';
import { Button, MessageBox, Overlay } from '../../controls';

export default function Body({ data, actions }: ExtWrapper) {
    const context = getContext();
    const { activeTab, settings } = data;
    const host = getURLHostOrProtocol(activeTab.url);
    const custom = settings.customThemes.find(({ url }) => isURLInList(activeTab.url, url));

    const textRef = { current: null as HTMLTextAreaElement | null };

    const placeholderText = `* {
    background-color: #234 !important;
    color: #cba !important;
}`;

    function onTextRender(node: HTMLTextAreaElement) {
        textRef.current = node;
        node.value = custom?.theme.stylesheet || settings.theme.stylesheet || '';
        if (document.activeElement !== node) {
            node.focus();
        }
    }

    function applyStyleSheet(css: string) {
        if (custom) {
            custom.theme.stylesheet = css;
            actions.changeSettings({ customThemes: settings.customThemes });
        } else {
            actions.setTheme({ stylesheet: css });
        }
    }

    function toggleDialog(isVisible: boolean) {
        context.store.isDialogVisible = isVisible;
        context.refresh();
    }

    function reset() {
        toggleDialog(false);
        applyStyleSheet('');
    }

    function apply() {
        if (textRef.current) {
            applyStyleSheet(textRef.current.value);
        }
    }

    return (
        <body>
            <header>
                <img id="logo" src="../assets/images/darkreader-type.svg" alt="Dark Reader" />
                <h1 id="title">CSS Editor</h1>
            </header>
            <h3 class="sub-title">{custom ? host : 'All websites'}</h3>
            <textarea
                class="editor"
                native
                placeholder={placeholderText}
                onrender={onTextRender}
                spellcheck="false"
                autocorrect="off"
                autocomplete="off"
                autocapitalize="off"
            />
            <div class="buttons">
                <Button onclick={() => toggleDialog(true)}>Reset changes</Button>
                <Button onclick={apply}>Apply</Button>
            </div>
            {context.store.isDialogVisible && (
                <MessageBox
                    caption="Are you sure you want to remove current changes? You cannot restore them later."
                    onOK={reset}
                    onCancel={() => toggleDialog(false)}
                />
            )}
            <Overlay />
        </body>
    );
}
