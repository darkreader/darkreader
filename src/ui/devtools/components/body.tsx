import {m} from 'malevic';
import {withState, useState} from 'malevic/state';
import {Button} from '../../controls';
import ThemeEngines from '../../../generators/theme-engines';
import {DEVTOOLS_DOCS_URL} from '../../../utils/links';
import type {ExtWrapper, TabInfo} from '../../../definitions';
import {getCurrentThemePreset} from '../../popup/theme/utils';
import {staticThemeCommands} from '../../../generators/static-theme';
import {inversionFixesCommands} from '../../../generators/css-filter';
import {dynamicThemeFixesCommands} from '../../../generators/dynamic-theme';

type BodyProps = ExtWrapper & {tab: TabInfo};

declare namespace CodeMirror {
    function fromTextArea(node: HTMLTextAreaElement, obj: object): mirror;
    function defineSimpleMode(name: string, configuration: object): void;
    function defineMode(name: string, modeFunc: (config: object) => object): void;
    function getMode(config: object, name: string): object;
    function multiplexingMode(mode: object, info: object): object;
}

interface mirror {
    getValue(): string;
    refresh(): void;
    setSize(width: string, height: string): void;
}

function Body({data, tab, actions}: BodyProps) {
    const {state, setState} = useState({errorText: null as string});
    let codeMirror: mirror;
    const previewButtonText = data.settings.previewNewDesign ? 'Switch to old design' : 'Preview new design';
    const {theme} = getCurrentThemePreset({data, tab, actions});

    const wrapper = (theme.engine === ThemeEngines.staticTheme
        ? {
            header: 'Static Theme Editor',
            fixesText: data.devtools.staticThemesText,
            apply: (text) => actions.applyDevStaticThemes(text),
            reset: () => actions.resetDevStaticThemes(),
            keywords: staticThemeCommands,
        } : theme.engine === ThemeEngines.cssFilter || theme.engine === ThemeEngines.svgFilter ? {
            header: 'Inversion Fix Editor',
            fixesText: data.devtools.filterFixesText,
            apply: (text) => actions.applyDevInversionFixes(text),
            reset: () => actions.resetDevInversionFixes(),
            keywords: Object.keys(inversionFixesCommands),
        } : {
            header: 'Dynamic Theme Editor',
            fixesText: data.devtools.dynamicFixesText,
            apply: (text) => actions.applyDevDynamicThemeFixes(text),
            reset: () => actions.resetDevDynamicThemeFixes(),
            keywords: Object.keys(dynamicThemeFixesCommands),
        });

    function onTextRender(node: HTMLTextAreaElement) {
        if (!state.errorText) {
            node.value = wrapper.fixesText;
        }
        if (document.querySelectorAll('div.CodeMirror').length === 0) {
            CodeMirror.defineSimpleMode('mainConfig', {
                start: [
                  {
                    regex: RegExp('^((?!' + wrapper.keywords.join('|') + '|^=).)*$', 'gm'),
                    token: 'string',
                  },
                ],
            });
            CodeMirror.defineMode('darkreaderConfig', function (config) {
              return CodeMirror.multiplexingMode(
                CodeMirror.getMode({}, 'mainConfig'),
                {
                    open: RegExp('(' + wrapper.keywords.join('|') + ')', 'g'),
                    close: '================================',
                    mode: CodeMirror.getMode({}, 'css'),
                    delimStyle: 'delimit',
                }
              );
            });
            setTimeout(function() {
                codeMirror = CodeMirror.fromTextArea(node, {
                    mode: 'darkreaderConfig',
                    lineNumbers: true,
                    lineWrapping: true,
                    theme: 'dracula',
                    styleActiveLine: true,
                });
                codeMirror.setSize('90%', '80%');
            }, 0);
            setInterval(function() {
                document.querySelectorAll('pre.CodeMirror-line > span[role="presentation"]').forEach(function(element: HTMLElement) {
                    if (wrapper.keywords.includes(element.textContent) && !element.innerHTML.includes('class="cm-atom')) {
                        element.innerHTML = '<span class="cm-atom">' + element.textContent + '</span>';
                    }
                });
            }, 10);
        } else {
            setTimeout(function() {
                codeMirror = CodeMirror.fromTextArea(node, {
                    mode: 'darkreaderConfig',
                    lineNumbers: true,
                    theme: 'dracula',
                    styleActiveLine: true,
                });
                document.querySelectorAll('div.CodeMirror')[1].remove();
                codeMirror.setSize('90%', '80%');
                codeMirror.refresh();
            }, 0);
        }
    }

    async function apply() {
        const text = codeMirror.getValue();
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
                onrender={onTextRender}
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
