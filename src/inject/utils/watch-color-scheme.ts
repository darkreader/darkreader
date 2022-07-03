import {isMatchMediaChangeEventListenerSupported} from '../../utils/platform';

export function watchForColorSchemeChange(callback: (isDark: boolean) => void) {
    const query = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => callback(query.matches);
    if (isMatchMediaChangeEventListenerSupported) {
        query.addEventListener('change', onChange);
    } else {
        query.addListener(onChange);
    }
    return {
        disconnect() {
            if (isMatchMediaChangeEventListenerSupported) {
                query.removeEventListener('change', onChange);
            } else {
                query.removeListener(onChange);
            }
        },
    };
}
