import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import {Button, TextBox} from '../../controls';
import type {ConfigEditorProps, SiteFix} from '../types';

import {ConfigEditor} from './config-editor';

export function PerSiteConfigEditor(props: ConfigEditorProps): Malevic.Child {
    const context = getContext();
    const store = context.getStore({
        errorText: '',
        fixes: [] as SiteFix[],
        fixesLength: 0,
        search: '',
        currentFix: null as (SiteFix | null),
    });

    const fixesText = props.devtools[props.type];
    const didFixesChange = store.fixesLength !== fixesText.length;
    if (didFixesChange) {
        store.fixes = props.parse(fixesText);
        store.fixesLength = fixesText.length;
    }

    if (store.currentFix && !store.fixes.includes(store.currentFix)) {
        const u1 = store.currentFix.url;
        const sameURLFix = store.fixes.find((f) => {
            const u2 = f.url;
            return u1.length === u2.length && u1.every((u, i) => u === u2[i]);
        });
        if (sameURLFix) {
            store.currentFix = sameURLFix;
        } else {
            store.currentFix = null;
        }
    }

    function onSearchInput(e: Event) {
        const element = e.target as HTMLInputElement;
        store.search = element.value;
        store.currentFix = null;
        context.refresh();
    }

    async function apply(text: string) {
        const [change] = props.parse(text);
        const index = store.fixes.indexOf(store.currentFix!);
        store.fixes[index] = change;
        store.currentFix = change;
        const config = props.format(store.fixes);
        await props.actions.applyDevFixes(props.type, config);
    }

    function addNewFix() {
        const newFixURL = store.search;
        if (!newFixURL) {
            ((context.node as Element).querySelector('.js-search') as HTMLInputElement).focus();
            return;
        }
        const newFix = props.create(newFixURL);
        store.fixes.push(newFix);
        store.currentFix = newFix;
        const config = props.format(store.fixes);
        props.actions.applyDevFixes(props.type, config);
    }

    const fixText = store.currentFix ? props.format([store.currentFix]) : '';
    const filteredFixes = store.search ? store.fixes.filter(({url}) => url.some((u) => u.includes(store.search))) : store.fixes;

    return (
        <div class="config-editor-per-site">
            <div class="config-editor-per-site__search-wrapper">
                <TextBox class="config-editor-per-site__search-input js-search" type="text" oninput={onSearchInput} placeholder="Search by URL" />
            </div>
            <list class="config-editor-per-site__urls">
                {filteredFixes.map((fix) => {
                    const text = fix.url.join(' ');
                    return <li>
                        <Button
                            class={{
                                'config-editor-per-site__url': true,
                                'config-editor-per-site__url--active': fix === store.currentFix,
                            }}
                            onclick={() => {
                                store.currentFix = fix === store.currentFix ? null : fix;
                                context.refresh();
                            }}
                        >
                            {text}
                        </Button>
                    </li>;
                })}
            </list>
            {store.currentFix ? (
                <ConfigEditor
                    text={fixText}
                    apply={apply}
                    reset={() => {
                        props.actions.resetDevFixes(props.type);
                    }}
                    delete={async () => {
                        const index = store.fixes.indexOf(store.currentFix!);
                        store.fixes.splice(index, 1);
                        store.currentFix = null;
                        const config = props.format(store.fixes);
                        await props.actions.applyDevFixes(props.type, config);
                    }}
                />
            ) : (
                <div class="config-editor-per-site__add-fix">
                    <Button onclick={addNewFix} class="config-editor-per-site__add-fix__button">
                        Create new fix
                    </Button>
                    <p class="config-editor-per-site__add-fix__description">
                        Search for an <strong>existing fix</strong> or enter a <strong>domain name</strong><br />for a new fix and click <strong>Create</strong>
                    </p>
                </div>
            )}
        </div>
    );
}
