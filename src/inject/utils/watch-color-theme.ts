/** watch dark mode media query change event. returns **unsubscribe** function */
export const watchForMediaQueryChange = (callback: VoidFunction): VoidFunction => {
    const mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { callback(); };
    mediaQueryList.addEventListener('change', handler);
    return () => mediaQueryList.removeEventListener('change', handler);
};