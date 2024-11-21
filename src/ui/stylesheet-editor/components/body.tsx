import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {ExtWrapper} from '../../../definitions';
import {getURLHostOrProtocol, isURLInList} from '../../../utils/url';
import {Button, MessageBox, Overlay} from '../../controls';

export default function Body({data, actions}: ExtWrapper) {
    const context = getContext();
    const host = getURLHostOrProtocol(data.activeTab.url);
    const custom = data.settings.customThemes.find(({url}) => isURLInList(data.activeTab.url, url));

    let textNode: HTMLTextAreaElement;

    const placeholderText = [
        '* {',
        '    background-color: #234 !important;',
        '    color: #cba !important;',
        '}',
    ].join('\n');

    function onTextRender(node: HTMLTextAreaElement) {
        textNode = node;
        textNode.value = (custom ? custom.theme.stylesheet : data.settings.theme.stylesheet) || '';
        if (document.activeElement !== textNode) {
            textNode.focus();
        }
    }

    function applyStyleSheet(css: string) {
        if (custom) {
            custom.theme = {...custom.theme, ...{stylesheet: css}};
            actions.changeSettings({customThemes: data.settings.customThemes});
        } else {
            actions.setTheme({stylesheet: css});
        }
    }

    function showDialog() {
        context.store.isDialogVisible = true;
        context.refresh();
    }

    function hideDialog() {
        context.store.isDialogVisible = false;
        context.refresh();
    }

    const dialog = context && context.store.isDialogVisible ? (
        <MessageBox
            caption="Are you sure you want to remove current changes? You cannot restore them later."
            onOK={reset}
            onCancel={hideDialog}
        />
    ) : null;

    function reset() {
        context.store.isDialogVisible = false;
        applyStyleSheet('');
    }

    function apply() {
        const css = textNode.value;
        applyStyleSheet(css);
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
                <Button onclick={showDialog}>
                    Reset changes
                    {dialog}
                </Button>
                <Button onclick={apply}>Apply</Button>
            </div>
            <Overlay />
        </body>
    );
}
