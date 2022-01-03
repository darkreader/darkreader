// @ts-check
export const PLATFORM = {
    CHROME: 'chrome',
    CHROME_MV3: 'chrome-mv3',
    FIREFOX: 'firefox',
    THUNDERBIRD: 'thunderbird',
};

export function getDestDir({debug, platform}) {
    const buildTypeDir = `build/${debug ? 'debug' : 'release'}`;
    return `${buildTypeDir}/${platform}`;
}
