// @ts-check
import {classes} from '../utils';

/**
 * @template T
 * @param {T | T[]} x
 * @returns {T[]}
 */
function toArray(x) {
    return Array.isArray(x) ? x : [x];
}

/** @typedef {string | {[cls: string]: any} | Array<string | {[cls: string]: any}>} Classes */

/**
 * @param {Classes} cls
 * @param {Classes} propsCls 
 * @returns {string}
 */
export function mergeClass(cls, propsCls) {
    const normalized = toArray(cls).concat(toArray(propsCls));
    return classes(...normalized);
}

/** @typedef {import('malevic').NodeAttrs} NodeAttrs */

/**
 * @param {string[]} omit
 * @param {NodeAttrs} attrs
 * @returns {NodeAttrs}
 */
export function omitAttrs(omit, attrs) {
    /** @type {NodeAttrs} */
    const result = {};
    Object.keys(attrs).forEach((key) => {
        if (omit.indexOf(key) < 0) {
            result[key] = attrs[key];
        }
    });
    return result;
}

/**
 * @param {HTMLElement} element
 * @returns {boolean}
 */
export function isElementHidden(element) {
    return element.offsetParent === null;
}
