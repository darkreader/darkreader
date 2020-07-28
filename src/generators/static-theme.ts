import {readText} from '../background/utils/network';

export default function createStaticStylesheet(url: string) {
    let commonTheme: string;
    let siteTheme: string;
    getCommonTheme().then((text) => commonTheme = text);
    getThemeFor(url).then((text) => siteTheme = text);

    if (siteTheme != null) {
        return siteTheme;
    } else {
        return commonTheme;
    }
}

async function getCommonTheme() {
    return await readText({url: '../static/themes/global.css'});
}

async function getThemeFor(url: string) {
    try {
        return await readText({url: `../static/themes/${url}.css`});
    } catch (err) {
        return null;
    }
    
}
