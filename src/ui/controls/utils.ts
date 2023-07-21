import {classes} from '../utils';

function toArray<T>(x: T | T[]): T[] {
    return Array.isArray(x) ? x : [x];
}

export function mergeClass(
    cls: string | {[cls: string]: any} | Array<string | {[cls: string]: any}>,
    propsCls: string | {[cls: string]: any} | Array<string | {[cls: string]: any}> | undefined
): string {
    const normalized = toArray(cls).concat(toArray(propsCls));
    return classes(...normalized);
}

export function omitAttrs(omit: string[], attrs: Malevic.NodeAttrs): Malevic.NodeAttrs<Element, Element> {
    const result: Malevic.NodeAttrs = {};
    Object.keys(attrs).forEach((key) => {
        if (omit.indexOf(key) < 0) {
            result[key] = attrs[key];
        }
    });
    return result;
}

export function isElementHidden(element: HTMLElement): boolean {
    return element.offsetParent === null;
}
