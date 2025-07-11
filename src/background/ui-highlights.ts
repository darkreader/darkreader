import {readLocalStorage, writeLocalStorage} from './utils/extension-api';

const proposedHighlights: string[] = [
    'anniversary',
];

const KEY_UI_HIDDEN_HIGHLIGHTS = 'ui-hidden-highlights';

async function getHiddenHighlights() {
    const options = await readLocalStorage({[KEY_UI_HIDDEN_HIGHLIGHTS]: [] as string[]});
    return options[KEY_UI_HIDDEN_HIGHLIGHTS];
}

async function getHighlightsToShow(): Promise<string[]> {
    const hiddenHighlights = await getHiddenHighlights();
    return proposedHighlights.filter((h) => !hiddenHighlights.includes(h));
}

async function hideHighlights(keys: string[]): Promise<void> {
    const hiddenHighlights = await getHiddenHighlights();
    const update = Array.from(new Set([...hiddenHighlights, ...keys]));
    await writeLocalStorage({[KEY_UI_HIDDEN_HIGHLIGHTS]: update});
}

async function restoreHighlights(keys: string[]): Promise<void> {
    const hiddenHighlights = await getHiddenHighlights();
    const update = Array.from(new Set([...hiddenHighlights.filter((h) => !keys.includes(h))]));
    await writeLocalStorage({[KEY_UI_HIDDEN_HIGHLIGHTS]: update});
}

export default {
    getHighlightsToShow,
    hideHighlights,
    restoreHighlights,
};
