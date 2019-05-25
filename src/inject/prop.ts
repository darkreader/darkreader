// https://richienb.mit-license.org/@2019
import { remove, trigger } from "../utils/dom"

let script: HTMLScriptElement
let user: Object
const codeToName = {
    'add-css-filter': 'Filter',
    'add-svg-filter': 'Filter+',
    'add-static-theme': 'Static',
    'add-dynamic-theme': 'Dynamic',
    'clean-up': null
};

export function handleManual(manual: boolean) {
    // handleManual(!urlInfo.isProtected && urlInfo.isInDarkList)
    console.log(manual)
}

export function handleProp(type: string, data: Object) {
    user = {
        mode: codeToName[type],
        enabled: type !== 'clean-up',
        options: data
    }

    // Initialise property
    if (script) remove(script)
    script = document.createElement('script');
    (document.head || document.body).append(script);

    // Set property
    script.innerHTML = `window['darkreader'] = ${JSON.stringify(user)}`
    trigger(document, 'darkreader:change')
}
