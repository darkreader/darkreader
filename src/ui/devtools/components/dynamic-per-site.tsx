import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {DynamicThemeFix} from '../../../definitions';
import {parseDynamicThemeFixes, formatDynamicThemeFixes} from '../../../generators/dynamic-theme';
import {Button, TextBox} from '../../controls';
import type {DevtoolsProps} from '../types';

import {ConfigEditor} from './config-editor';

export function DynamicPerSiteEditor(props: DevtoolsProps): Malevic.Child {
    const context = getContext();
    const store = context.getStore({
        errorText: '',
        fixes: [] as DynamicThemeFix[],
        fixesLength: 0,
        search: '',
        currentFix: null as (DynamicThemeFix | null),
    });

    const fixesText = props.devtools.dynamicFixesText;
    const didFixesChange = store.fixesLength !== fixesText.length;
    if (didFixesChange) {
        store.fixes = parseDynamicThemeFixes(fixesText);
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
        const [change] = parseDynamicThemeFixes(text);
        const index = store.fixes.indexOf(store.currentFix!);
        store.fixes[index] = change;
        store.currentFix = change;
        const config = formatDynamicThemeFixes(store.fixes);
        await props.actions.applyDevDynamicThemeFixes(config);
    }

    function addNewFix() {
        const newFixURL = store.search;
        if (!newFixURL) {
            ((context.node as Element).querySelector('.js-search') as HTMLInputElement).focus();
            return;
        }
        const newFix: DynamicThemeFix = {
            url: [newFixURL],
            invert: [],
            css: '',
            ignoreImageAnalysis: [],
            ignoreInlineStyle: [],
            ignoreCSSUrl: [],
            disableStyleSheetsProxy: false,
            disableCustomElementRegistryProxy: false,
        };
        store.fixes.push(newFix);
        store.currentFix = newFix;
        const config = formatDynamicThemeFixes(store.fixes);
        props.actions.applyDevDynamicThemeFixes(config);
    }

    const fixText = store.currentFix ? formatDynamicThemeFixes([store.currentFix]) : '';
    const filteredFixes = store.search ? store.fixes.filter(({url}) => url.some((u) => u.includes(store.search))) : store.fixes;

    return (
        <div class="dynamic-per-site">
            <div class="dynamic-per-site__search-wrapper">
                <TextBox class="dynamic-per-site__search-input js-search" type="text" oninput={onSearchInput} placeholder="Search by URL" />
            </div>
            <list class="dynamic-per-site__urls">
                {filteredFixes.map((fix) => {
                    const text = fix.url.join(' ');
                    return <li>
                        <Button
                            class={{
                                'dynamic-per-site__url': true,
                                'dynamic-per-site__url--active': fix === store.currentFix,
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
                        props.actions.resetDevDynamicThemeFixes();
                    }}
                    delete={async () => {
                        const index = store.fixes.indexOf(store.currentFix!);
                        store.fixes.splice(index, 1);
                        store.currentFix = null;
                        const config = formatDynamicThemeFixes(store.fixes);
                        await props.actions.applyDevDynamicThemeFixes(config);
                    }}
                />
            ) : (
                <div class="dynamic-per-site__add-fix">
                    <Button onclick={addNewFix} class="dynamic-per-site__add-fix__button">
                        Create new fix
                    </Button>
                    <p class="dynamic-per-site__add-fix__description">
                        Search for an <strong>existing fix</strong> or enter a <strong>domain name</strong><br />for a new fix and click <strong>Create</strong>
                    </p>
                </div>
            )}
        </div>
    );
}
