export function watchForColorSchemeChange(callback: () => void) {
    const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryList.addListener(callback);
    return {
        disconnect() {
            mediaQueryList.removeListener(callback);
        },
    };
}
