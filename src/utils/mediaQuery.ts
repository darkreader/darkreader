const matchesMediaQuery = (query: string): boolean => Boolean(window.matchMedia(query).matches);

const matchesDarkTheme = (): boolean => matchesMediaQuery("(prefers-color-scheme: dark)");
const matchesLightTheme = (): boolean => matchesMediaQuery("(prefers-color-scheme: light)");

/** theme should be light or dark, so one of two should be true. If both are false, consider missing support */
const isSupported = matchesDarkTheme() || matchesLightTheme();

/** returns `true` if current UA prefers **dark** theme. returns `null` if not supported */
export const isDarkTheme = (): boolean | null => {
    if (!isSupported) {
        return null;
    }
    return matchesDarkTheme();
}