import {html} from 'malevic';
import withState from 'malevic/state';
import {Button} from '../../controls';
import {getJsonErrorPosition, getTextPositionMessage} from '../../../config/utils';

const devToolsDocsUrl = 'https://github.com/alexanderby/darkreader#how-to-contribute';

const initialTexts = new WeakSet<Element>();

function Body({ext, state, setState}) {
    let textNode: HTMLTextAreaElement;

    function onTextRender(node) {
        textNode = node;
        if (!state.errorText) {
            textNode.value = ext.getDevInversionFixesText();
        }
    }

    function apply() {
        const text = textNode.value;
        ext.applyDevInversionFixes(text, (err) => {
            if (err) {
                const pos = getJsonErrorPosition(err);
                setState({errorText: getTextPositionMessage(text, pos)});
                textNode.focus();
                textNode.selectionStart = text.lastIndexOf('\n', pos) + 1;
                textNode.selectionEnd = text.indexOf('\n', pos);
                if (textNode.selectionStart === textNode.selectionEnd) {
                    textNode.selectionStart = text.lastIndexOf('\n', textNode.selectionStart - 1) + 1;
                }
            } else {
                setState({errorText: null});
            }
        });
    }

    function reset() {
        ext.resetDevInversionFixes();
        setState({errorText: null});
    }

    return (
        <body>
            <header>
                <img id="logo" src="../assets/images/darkreader-type.svg" alt="Dark Reader" />
                <h1 id="title">Developer Tools</h1>
            </header>
            <h3 id="sub-title">Inversion Fix Editor</h3>
            <textarea
                id="editor"
                native
                didmount={onTextRender}
                didupdate={onTextRender}
            />
            <label id="error-text">{state.errorText}</label>
            <div id="buttons">
                <Button onclick={reset}>Reset</Button>
                <Button onclick={apply}>Apply</Button>
            </div>
            <p id="description">
                Read about this tool <strong><a href={devToolsDocsUrl} target="_blank">here</a></strong>.
                If a <strong>popular</strong> website looks incorrect
                e-mail to <strong>DarkReaderApp@gmail.com</strong>
            </p>
        </body>
    );
}

export default withState(Body, {errorText: null});
