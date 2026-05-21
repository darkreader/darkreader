const emptyPseudoClasses = [':before', ':after', ':empty'];

export const filterSelectors = {
    invert: new Set<string>(),
    dim: new Set<string>(),
    none: new Set<string>(),
};

export function addFilterSelector(selector: string, type: keyof typeof filterSelectors) {
    if (!selector) {
        return;
    }
    const selectors = filterSelectors[type];
    let changed = false;
    selector.split(',').forEach((part) => {
        const s = part.trim();
        if (!s || selectors.has(s)) {
            return;
        }
        for (const existing of selectors) {
            if (isSelectorWithin(s, existing)) {
                return;
            }
        }
        for (const existing of [...selectors]) {
            if (isSelectorWithin(existing, s)) {
                selectors.delete(existing);
            }
        }
        selectors.add(s);
        changed = true;
    });
    return changed;
}

export function makeSelectorEmpty(selector: string) {
    selector = selector.trim();
    if (emptyPseudoClasses.some((pseudo) => selector.endsWith(pseudo))) {
        return selector;
    }
    return `${selector}:empty`;
}

export function isSelectorWithin(sub: string, parent: string): boolean {
    const parentLength = parent.length;
    const subLength = sub.length;
    if (subLength < parentLength || !sub.startsWith(parent)) {
        return false;
    }
    if (subLength === parentLength) {
        return true;
    }
    let i = parentLength;
    const c = sub[i];
    if (c === '.' || c === ':' || c === '#' || c === '[' || c === '>') {
        return true;
    }
    if (c === '+' || c === '~' || c !== ' ') {
        return false;
    }
    while (sub[i] === ' ') {
        i++;
    }
    return sub[i] !== '+' && sub[i] !== '~';
}

export function cleanFilterSelectors() {
    filterSelectors.invert.clear();
    filterSelectors.dim.clear();
    filterSelectors.none.clear();
}
