import {StaticTheme} from '../definitions';
import {isURLInList} from '../utils/url';

export default function getStaticStyleSheet(url: string, themes: StaticTheme[]) {
    const {css} = (themes.slice(1).find((t) => isURLInList(url, t.url)) || themes[0]);
    return css;
}
