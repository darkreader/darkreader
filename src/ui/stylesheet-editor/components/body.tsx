import {m} from 'malevic';
import {Button} from '../../controls';
import {getURLHostOrProtocol, isURLInList} from '../../../utils/url';
import type {ExtWrapper, TabInfo} from '../../../definitions';

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace CodeMirror {
    function fromTextArea(node: HTMLTextAreaElement, obj: mirrorConfig): mirror;
}

interface mirrorConfig {
    mode: string;
    lineNumbers: boolean;
    lineWrapping: boolean;
    theme: string;
    styleActiveLine: boolean;
    matchBrackets: boolean;
    autoCloseBrackets: boolean;
}

interface mirror {
    getValue(): string;
    refresh(): void;
    setSize(width: string, height: string): void;
}

interface BodyProps extends ExtWrapper {
    tab: TabInfo;
}

export default function Body({data, tab, actions}: BodyProps) {

    const host = getURLHostOrProtocol(tab.url);
    const custom = data.settings.customThemes.find(({url}) => isURLInList(tab.url, url));

    let codeMirror: mirror;

    const placeholderText = [
        '* {',
        '    background-color: #234 !important;',
        '    color: #cba !important;',
        '}',
    ].join('\n');

    function onTextRender(node) {
        node.value = (custom ? custom.theme.stylesheet : data.settings.theme.stylesheet) || '';
        if (document.activeElement !== node) {
            node.focus();
        }
        if (document.querySelectorAll('div.CodeMirror').length == 0) {
            setTimeout(function () {
                codeMirror = CodeMirror.fromTextArea(node, {
                    mode: 'css',
                    lineNumbers: true,
                    lineWrapping: true,
                    theme: 'dracula',
                    styleActiveLine: true,
                    matchBrackets: true,
                    autoCloseBrackets: true,
                });
                codeMirror.setSize('90%', '80%');
            }, 0);
        } else {
            setTimeout(function () {
                codeMirror = CodeMirror.fromTextArea(node, {
                    mode: 'css',
                    lineNumbers: true,
                    lineWrapping: true,
                    theme: 'dracula',
                    styleActiveLine: true,
                    matchBrackets: true,
                    autoCloseBrackets: true,
                });
                document.querySelectorAll('div.CodeMirror')[1].remove();
                codeMirror.setSize('90%', '80%');
                codeMirror.refresh();
            }, 0);
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

    function reset() {
        applyStyleSheet('');
    }

    function apply() {
        const css = codeMirror.getValue();
        applyStyleSheet(css);
    }

    return (
        <body>
            <header>
                <img id="logo" src="../assets/images/darkreader-type.svg" alt="Dark Reader" />
                <h1 id="title">CSS Editor</h1>
            </header>
            <h3 id="sub-title">{custom ? host : 'All websites'}</h3>
            <textarea
                native
                placeholder={placeholderText}
                onrender={onTextRender}
            />
            <div id="buttons">
                <Button onclick={reset}>Reset</Button>
                <Button onclick={apply}>Apply</Button>
            </div>
        </body>
    );
}
