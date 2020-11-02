export function injectProxy() {
    if (!window['__darkreader__addRuleFunction']) {
        window['__darkreader__addRuleFunction'] = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'addRule');
        window['__darkreader__insertRuleFunction'] = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'insertRule');
        window['__darkreader__deleteRuleFunction'] = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'deleteRule');
        window['__darkreader__removeRuleFunction'] = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'removeRule');
    }
    const cleanUp = () => {
        Object.defineProperty(CSSStyleSheet.prototype, 'addRule', {...window['__darkreader__addRuleFunction']});
        Object.defineProperty(CSSStyleSheet.prototype, 'insertRule', {...window['__darkreader__insertRuleFunction']});
        Object.defineProperty(CSSStyleSheet.prototype, 'deleteRule', {...window['__darkreader__deleteRuleFunction']});
        Object.defineProperty(CSSStyleSheet.prototype, 'removeRule', {...window['__darkreader__removeRuleFunction']});
        document.removeEventListener('__darkreader__cleanUp', cleanUp);
    };
    document.addEventListener('__darkreader__cleanUp', cleanUp);

    const updateSheetEvent = new Event('__darkreader__updateSheet');

    function proxyAddRule(selector?: string, style?: string, index?: number): number {
        window['__darkreader__addRuleFunction'].value.call(this, selector, style, index);
        this.ownerNode.dispatchEvent(updateSheetEvent);
        // Should always returns -1 https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/addRule#Return_value.
        return -1;
    }

    function proxyInsertRule(rule: string, index?: number): number {
        const returnValue = window['__darkreader__insertRuleFunction'].value.call(this, rule, index);
        this.ownerNode.dispatchEvent(updateSheetEvent);
        return returnValue;
    }

    function proxyDeleteRule(index: number): void {
        window['__darkreader__deleteRuleFunction'].value.call(this, index);
        this.ownerNode.dispatchEvent(updateSheetEvent);
    }

    function proxyRemoveRule(index?: number): void {
        window['__darkreader__removeRuleFunction'].value.call(this, index);
        this.ownerNode.dispatchEvent(updateSheetEvent);
    }

    Object.defineProperty(CSSStyleSheet.prototype, 'addRule', {...window['__darkreader__addRuleFunction'], value: proxyAddRule});
    Object.defineProperty(CSSStyleSheet.prototype, 'insertRule', {...window['__darkreader__insertRuleFunction'], value: proxyInsertRule});
    Object.defineProperty(CSSStyleSheet.prototype, 'deleteRule', {...window['__darkreader__deleteRuleFunction'], value: proxyDeleteRule});
    Object.defineProperty(CSSStyleSheet.prototype, 'removeRule', {...window['__darkreader__removeRuleFunction'], value: proxyRemoveRule});
}
