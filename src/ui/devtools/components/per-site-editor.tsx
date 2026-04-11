import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import {Button, TextBox} from '../../controls';

import {ConfigEditor} from './config-editor';

interface PerSiteEditorProps<T extends {url: string[]}> {
    fixesText: string;
    parse: (text: string) => T[];
    format: (fixes: T[]) => string;
    apply: (text: string) => Promise<void>;
    reset: () => void;
    createFix: (url: string) => T;
}

export function PerSiteEditor<T extends {url: string[]}>(props: PerSiteEditorProps<T>): Malevic.Child {
    const context = getContext();
    const store = context.getStore({
        fixes: [] as T[],
        fixesLength: 0,
        search: '',
        currentFix: null as (T | null),
    });

    const didFixesChange = store.fixesLength !== props.fixesText.length;
    if (didFixesChange) {
        store.fixes = props.parse(props.fixesText);
        store.fixesLength = props.fixesText.length;
    }

    if (store.currentFix && !store.fixes.includes(store.currentFix)) {
        const u1 = store.currentFix.url;
        const sameURLFix = store.fixes.find((f) => {
            const u2 = f.url;
            return u1.length === u2.length && u1.every((u, i) => u === u2[i]);
        });
        store.currentFix = sameURLFix ?? null;
    }

    function onSearchInput(e: Event) {
        store.search = (e.target as HTMLInputElement).value;
        store.currentFix = null;
        context.refresh();
    }

    async function applyCurrentFix(text: string) {
        const [change] = props.parse(text);
        if (!change) {
            throw new Error('Fix must contain at least one command.');
        }
        const index = store.fixes.indexOf(store.currentFix!);
        store.fixes[index] = change;
        store.currentFix = change;
        await props.apply(props.format(store.fixes));
    }

    function addNewFix() {
        const url = store.search;
        if (!url) {
            ((context.node as Element).querySelector('.js-search') as HTMLInputElement).focus();
            return;
        }
        const newFix = props.createFix(url);
        store.fixes.push(newFix);
        store.currentFix = newFix;
        props.apply(props.format(store.fixes));
    }

    async function deleteCurrentFix() {
        const index = store.fixes.indexOf(store.currentFix!);
        store.fixes.splice(index, 1);
        store.currentFix = null;
        await props.apply(props.format(store.fixes));
    }

    const fixText = store.currentFix ? props.format([store.currentFix]) : '';
    const filteredFixes = store.search
        ? store.fixes.filter(({url}) => url.some((u) => u.includes(store.search)))
        : store.fixes;

    return (
        <div class="per-site-editor">
            <div class="per-site-editor__search-wrapper">
                <TextBox
                    class="per-site-editor__search-input js-search"
                    type="text"
                    oninput={onSearchInput}
                    placeholder="Search by URL"
                />
            </div>
            <list class="per-site-editor__urls">
                {filteredFixes.map((fix) => (
                    <li>
                        <Button
                            class={{
                                'per-site-editor__url': true,
                                'per-site-editor__url--active': fix === store.currentFix,
                            }}
                            onclick={() => {
                                store.currentFix = fix === store.currentFix ? null : fix;
                                context.refresh();
                            }}
                        >
                            {fix.url.join(' ')}
                        </Button>
                    </li>
                ))}
            </list>
            {store.currentFix ? (
                <ConfigEditor
                    text={fixText}
                    apply={applyCurrentFix}
                    reset={props.reset}
                    delete={deleteCurrentFix}
                />
            ) : (
                <div class="per-site-editor__add-fix">
                    <Button onclick={addNewFix} class="per-site-editor__add-fix__button">
                        Create new fix
                    </Button>
                    <p class="per-site-editor__add-fix__description">
                        Search for an <strong>existing fix</strong> or enter a <strong>domain name</strong><br />for a new fix and click <strong>Create</strong>
                    </p>
                </div>
            )}
        </div>
    );
}
