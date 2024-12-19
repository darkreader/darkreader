import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import {DEVTOOLS_DOCS_URL} from '../../../utils/links';
import {isFirefox} from '../../../utils/platform';
import {Button, MessageBox} from '../../controls';

interface ConfigEditorProps {
    header?: string;
    text: string;
    apply?: (text: string) => Promise<void>;
    reset?: () => void;
    delete?: () => void;
}

export function ConfigEditor(props: ConfigEditorProps): Malevic.Child {
    const context = getContext();
    const store = context.getStore({
        dialogMessage: '',
        dialogAction: null as (() => void) | null,
        errorText: '',
    });

    let textNode: HTMLTextAreaElement;

    function onTextRender(node: HTMLTextAreaElement) {
        textNode = node;

        if (!store.errorText) {
            textNode.value = props.text;
        }

        node.addEventListener('keydown', ({key, preventDefault}) => {
            if (key === 'Tab') {
                preventDefault();
                const indent = ' '.repeat(4);
                if (isFirefox) {
                    // https://bugzilla.mozilla.org/show_bug.cgi?id=1220696
                    const start = node.selectionStart;
                    const end = node.selectionEnd;
                    const before = node.value.substring(0, start);
                    const after = node.value.substring(end);
                    node.focus();
                    node.value = `${before}${indent}${after}`;
                    const cursorPos = start + indent.length;
                    node.setSelectionRange(cursorPos, cursorPos);
                } else {
                    document.execCommand('insertText', false, indent);
                }
            }
        });
    }

    async function apply(): Promise<void> {
        const text = textNode.value;
        try {
            await props.apply!(text);
            store.errorText = '';
        } catch (err) {
            store.errorText = String(err);
        }
        context.refresh();
    }

    function showDialog(message: string, action: () => void): void {
        store.dialogMessage = message;
        store.dialogAction = action;
        context.refresh();
    }

    function reset(): void {
        store.dialogMessage = '';
        store.dialogAction = null;
        store.errorText = '';
        props.reset!();
        context.refresh();
    }

    function showResetDialog() {
        showDialog(
            'Are you sure you want to remove the current changes? You cannot restore them later.',
            reset,
        );
    }

    function showDeleteDialog() {
        showDialog(
            'Are you sure you want to delete the fix?',
            props.delete!,
        );
    }

    function hideDialog(): void {
        store.dialogMessage = '';
        store.dialogAction = null;
        context.refresh();
    }

    const dialog = store.dialogMessage && store.dialogAction ? (
        <MessageBox
            caption={store.dialogMessage}
            onOK={store.dialogAction}
            onCancel={hideDialog}
        />
    ) : null;

    return (
        <div class="config-editor">
            {props.header ? <h3 class="sub-title">{props.header}</h3> : null}
            <textarea
                class="editor"
                onrender={onTextRender}
                spellcheck="false"
                autocorrect="off"
                autocomplete="off"
                autocapitalize="off"
            />
            <label class="error-text">{store.errorText}</label>
            <div class="buttons">
                {props.delete ? <Button onclick={showDeleteDialog}>Delete</Button> : null}
                {props.reset ? <Button onclick={showResetDialog}>Reset changes</Button> : null}
                {props.apply ? <Button onclick={apply}>Apply</Button> : null}
            </div>
            <p class="description">
                Read about this tool <strong><a href={DEVTOOLS_DOCS_URL} target="_blank" rel="noopener noreferrer">here</a></strong>.
                If a <strong>popular</strong> website looks incorrect
                e-mail to <strong>support@darkreader.org</strong>
            </p>
            {dialog}
        </div>
    );
}
