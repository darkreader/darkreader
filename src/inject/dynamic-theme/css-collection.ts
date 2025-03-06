import {forEach} from '../../utils/array';
import {formatCSS} from '../../utils/css-text/format-css';
import {loadAsDataURL} from '../../utils/network';
import {getMatches} from '../../utils/text';

const blobRegex = /url\(\"(blob\:.*?)\"\)/g;

async function replaceBlobs(text: string) {
    const promises: Array<Promise<string>> = [];
    getMatches(blobRegex, text, 1).forEach((url) => {
        const promise = loadAsDataURL(url);
        promises.push(promise);
    });
    const data = await Promise.all(promises);
    return text.replace(blobRegex, () => `url("${data.shift()}")`);
}

const banner = `/*
                        _______
                       /       \\
                      .==.    .==.
                     ((  ))==((  ))
                    / "=="    "=="\\
                   /____|| || ||___\\
       ________     ____    ________  ___    ___
       |  ___  \\   /    \\   |  ___  \\ |  |  /  /
       |  |  \\  \\ /  /\\  \\  |  |  \\  \\|  |_/  /
       |  |   )  /  /__\\  \\ |  |__/  /|  ___  \\
       |  |__/  /  ______  \\|  ____  \\|  |  \\  \\
_______|_______/__/ ____ \\__\\__|___\\__\\__|___\\__\\____
|  ___  \\ |  ____/ /    \\   |  ___  \\ |  ____|  ___  \\
|  |  \\  \\|  |___ /  /\\  \\  |  |  \\  \\|  |___|  |  \\  \\
|  |__/  /|  ____/  /__\\  \\ |  |   )  |  ____|  |__/  /
|  ____  \\|  |__/  ______  \\|  |__/  /|  |___|  ____  \\
|__|   \\__\\____/__/      \\__\\_______/ |______|__|   \\__\\
                https://darkreader.org
*/

/*! Dark reader generated CSS | Licensed under MIT https://github.com/darkreader/darkreader/blob/main/LICENSE */
`;

export async function collectCSS(): Promise<string> {
    const css = [banner];

    function addStaticCSS(selector: string, comment: string) {
        const staticStyle = document.querySelector(selector);
        if (staticStyle && staticStyle.textContent) {
            css.push(`/* ${comment} */`);
            css.push(staticStyle.textContent);
            css.push('');
        }
    }

    addStaticCSS('.darkreader--fallback', 'Fallback Style');
    addStaticCSS('.darkreader--user-agent', 'User-Agent Style');
    addStaticCSS('.darkreader--text', 'Text Style');
    addStaticCSS('.darkreader--invert', 'Invert Style');
    addStaticCSS('.darkreader--variables', 'Variables Style');

    const modifiedCSS: string[] = [];
    document.querySelectorAll('.darkreader--sync').forEach((element: HTMLStyleElement) => {
        forEach(element.sheet!.cssRules, (rule) => {
            rule && rule.cssText && modifiedCSS.push(rule.cssText);
        });
    });

    if (modifiedCSS.length) {
        const formattedCSS = formatCSS(modifiedCSS.join('\n'));
        css.push('/* Modified CSS */');
        css.push(await replaceBlobs(formattedCSS));
        css.push('');
    }

    addStaticCSS('.darkreader--override', 'Override Style');

    return css.join('\n');
}
