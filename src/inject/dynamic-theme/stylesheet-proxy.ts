export function injectProxy() {
    // Create a new Event Object that can be dipatched on elements.
    const updateSheetEvent = new Event('updateSheet');

    // Create the proxy function that should be identicial to the native one's.
    function proxyAddRule(selector?: string, style?: string, index?: number): number {
        window['addRuleFunction'].value.call(this, selector, style, index);
        this.ownerNode.dispatchEvent(updateSheetEvent);
        // Should always returns -1 https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/addRule#Return_value.
        return -1;
    }

    function proxyInsertRule(rule: string, index?: number): number {
        // Cache the return value of insertRule as insertRule has the chance to not return the originial index.
        const returnValue = window['insertRuleFunction'].value.call(this, rule, index);
        this.ownerNode.dispatchEvent(updateSheetEvent);
        return returnValue;
    }

    function proxyDeleteRule(index: number): void {
        window['deleteRuleFunction'].value.call(this, index);
        this.ownerNode.dispatchEvent(updateSheetEvent);
    }

    function proxyRemoveRule(index?: number): void {
        window['removeRuleFunction'].value.call(this, index);
        this.ownerNode.dispatchEvent(updateSheetEvent);
    }

    // Define the prototype of the CSSStyleSheet to use the proxy function.
    Object.defineProperty(CSSStyleSheet.prototype, 'addRule', {...window['addRuleFunction'], value: proxyAddRule});
    Object.defineProperty(CSSStyleSheet.prototype, 'insertRule', {...window['insertRuleFunction'], value: proxyInsertRule});
    Object.defineProperty(CSSStyleSheet.prototype, 'deleteRule', {...window['deleteRuleFunction'], value: proxyDeleteRule});
    Object.defineProperty(CSSStyleSheet.prototype, 'removeRule', {...window['removeRuleFunction'], value: proxyRemoveRule});
}

export function removeProxyOnPrototype() {
    // Define the prototype of the CSSStyleSheet to the orginial function.
    Object.defineProperty(CSSStyleSheet.prototype, 'addRule', {...window['addRuleFunction']});
    Object.defineProperty(CSSStyleSheet.prototype, 'insertRule', {...window['insertRuleFunction']});
    Object.defineProperty(CSSStyleSheet.prototype, 'deleteRule', {...window['deleteRuleFunction']});
    Object.defineProperty(CSSStyleSheet.prototype, 'removeRule', {...window['removeRuleFunction']});
}
