export function watchForColorSchemeChange(callback: ({isDark}) => void) {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => callback({isDark: query.matches});
    query.addEventListener('change', onChange);
    return {
        disconnect() {
            query.removeEventListener('change', onChange);
        },
    };
}
