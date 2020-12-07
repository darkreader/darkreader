type AnyFn = (...args: any[]) => any;

export function debounce<F extends AnyFn>(delay: number, fn: F): F {
    let timeoutId: number = null;
    return ((...args: any[]) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            timeoutId = null;
            fn(...args);
        }, delay);
    }) as F;
}
