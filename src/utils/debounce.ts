export function debounce<F extends (...args: any[]) => any>(delay: number, fn: F): F {
    let timeoutId: number = null;
    return ((...args: any[]) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            fn(...args);
        }, delay);
    }) as any;
}
