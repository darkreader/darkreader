import {m} from 'malevic';
import withState, {useState} from 'malevic/state';
import {Button} from '../../controls';
import ThemeEngines from '../../../generators/theme-engines';
import {DEVTOOLS_DOCS_URL} from '../../../utils/links';
import {ExtWrapper} from '../../../definitions';

interface BodyProps extends ExtWrapper {
}

function Body({data, actions}: BodyProps) {
    const {state, setState} = useState({errorText: null as string})
    let textNode: HTMLTextAreaElement;

    const wrapper = (data.settings.theme.engine === ThemeEngines.staticTheme
        ? {
            header: 'Static Theme Editor',
            fixesText: data.devStaticThemesText,
            apply: (text) => actions.applyDevStaticThemes(text),
            reset: () => actions.resetDevStaticThemes(),
        } : data.settings.theme.engine === ThemeEngines.cssFilter || data.settings.theme.engine === ThemeEngines.svgFilter ? {
            header: 'Inversion Fix Editor',
            fixesText: data.devInversionFixesText,
            apply: (text) => actions.applyDevInversionFixes(text),
            reset: () => actions.resetDevInversionFixes(),
        } : {
                header: 'Dynamic Theme Editor',
                fixesText: data.devDynamicThemeFixesText,
                apply: (text) => actions.applyDevDynamicThemeFixes(text),
                reset: () => actions.resetDevDynamicThemeFixes(),
            });

    function onTextRender(node) {
        textNode = node;
        if (!state.errorText) {
            textNode.value = wrapper.fixesText;
        }
    }

    async function apply() {
        const text = textNode.value;
        try {
            await wrapper.apply(text);
            setState({errorText: null});
        } catch (err) {
            setState({
                errorText: String(err),
            });
        }
    }

    function reset() {
        wrapper.reset();
        setState({errorText: null});
    }

    return (
        <body>
            <header>
                <img id="logo" src="../assets/images/darkreader-type.svg" alt="Dark Reader" />
                <h1 id="title">Developer Tools</h1>
            </header>
            <h3 id="sub-title">{wrapper.header}</h3>
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
                Read about this tool <strong><a href={DEVTOOLS_DOCS_URL} target="_blank" rel="noopener noreferrer">here</a></strong>.
                If a <strong>popular</strong> website looks incorrect
                e-mail to <strong>DarkReaderApp@gmail.com</strong>
            </p>
        </body>
    );
}

export default withState(Body);
