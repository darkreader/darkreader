const matchesMediaQuery = (query: string) => Boolean(window.matchMedia(query).matches);

const matchesDarkTheme = () => matchesMediaQuery('(prefers-color-scheme: dark)');
const matchesLightTheme = () => matchesMediaQuery('(prefers-color-scheme: light)');

const isColorSchemeSupported = matchesDarkTheme() || matchesLightTheme();

export function isSystemDarkModeEnabled() {
    if (!isColorSchemeSupported) {
        return false;
    }
    return matchesDarkTheme();
}
