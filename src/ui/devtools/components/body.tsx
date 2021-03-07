import {m} from 'malevic';
import {withState, useState} from 'malevic/state';
import {Button} from '../../controls';
import ThemeEngines from '../../../generators/theme-engines';
import {DEVTOOLS_DOCS_URL} from '../../../utils/links';
import type {ExtWrapper, TabInfo} from '../../../definitions';
import {getCurrentThemePreset} from '../../popup/theme/utils';
import {isFirefox} from '../../../utils/platform';

type BodyProps = ExtWrapper & {tab: TabInfo};

function Body({data, tab, actions}: BodyProps) {
    const {state, setState} = useState({errorText: null as string});
    let textNode: HTMLTextAreaElement;
    const previewButtonText = data.settings.previewNewDesign ? 'Switch to old design' : 'Preview new design';
    const {theme} = getCurrentThemePreset({data, tab, actions});

    const wrapper = (theme.engine === ThemeEngines.staticTheme
        ? {
            header: 'Static Theme Editor',
            fixesText: data.devtools.staticThemesText,
            apply: (text) => actions.applyDevStaticThemes(text),
            reset: () => actions.resetDevStaticThemes(),
        } : theme.engine === ThemeEngines.cssFilter || theme.engine === ThemeEngines.svgFilter ? {
            header: 'Inversion Fix Editor',
            fixesText: data.devtools.filterFixesText,
            apply: (text) => actions.applyDevInversionFixes(text),
            reset: () => actions.resetDevInversionFixes(),
        } : {
            header: 'Dynamic Theme Editor',
            fixesText: data.devtools.dynamicFixesText,
            apply: (text) => actions.applyDevDynamicThemeFixes(text),
            reset: () => actions.resetDevDynamicThemeFixes(),
        });

    function onTextRender(node: HTMLTextAreaElement) {
        textNode = node;
        if (!state.errorText) {
            textNode.value = wrapper.fixesText;
        }
        node.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
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

    function toggleDesign() {
        actions.changeSettings({previewNewDesign: !data.settings.previewNewDesign});
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
                onrender={onTextRender}
                spellcheck="false"
                autocorrect="off"
                autocomplete="off"
                autocapitalize="off"
            />
            <label id="error-text">{state.errorText}</label>
            <div id="buttons">
                <Button onclick={reset}>Reset</Button>
                <Button onclick={apply}>Apply</Button>
                <Button class="preview-design-button" onclick={toggleDesign}>{previewButtonText}</Button>
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
