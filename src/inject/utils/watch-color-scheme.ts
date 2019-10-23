export function watchForColorSchemeChange(callback: ({isDark}) => void) {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => callback({isDark: query.matches});
    query.addListener(onChange);
    return {
        disconnect() {
            query.removeListener(onChange);
        },
    };
}
