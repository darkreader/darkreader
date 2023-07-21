type AnyFn = (...args: any[]) => void;

export function debounce<F extends AnyFn>(delay: number, fn: F): F {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
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
