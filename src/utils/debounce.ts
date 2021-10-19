// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

export function debounce<F extends AnyFn>(delay: number, fn: F): F {
    let timeoutId: number = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
