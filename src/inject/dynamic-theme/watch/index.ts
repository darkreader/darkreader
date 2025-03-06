import type {StyleElement} from '../style-manager';

import {stopWatchingForStylePositions, watchForStylePositions} from './style-position';

interface ChangedStyles {
    created: StyleElement[];
    updated: StyleElement[];
    removed: StyleElement[];
    moved: StyleElement[];
}

export function watchForStyleChanges(
    currentStyles: StyleElement[],
    update: (styles: ChangedStyles) => void,
    shadowRootDiscovered: (root: ShadowRoot) => void
): void {
    watchForStylePositions(currentStyles, update, shadowRootDiscovered);
}

export function stopWatchingForStyleChanges(): void {
    stopWatchingForStylePositions();
}
