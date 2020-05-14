function isArrayLike<T>(items: Iterable<T> | ArrayLike<T>): items is ArrayLike<T> {
    return (items as ArrayLike<T>).length != null;
}

// NOTE: Iterating Array-like items using `for .. of` is 3x slower in Firefox
// https://jsben.ch/kidOp
export function forEach<T>(items: Iterable<T> | ArrayLike<T>, iterator: (item: T) => void) {
    if (isArrayLike(items)) {
        for (let i = 0; i < items.length; i++) {
            iterator(items[i]);
        }
    } else {
        for (const item of items) {
            iterator(item);
        }
    }
}

// NOTE: Pushing items like `arr.push(...items)` is 3x slower in Firefox
// https://jsben.ch/nr9OF
export function push<T>(array: Array<T>, addition: Iterable<T> | ArrayLike<T>) {
    forEach(addition, (a) => array.push(a));
}
