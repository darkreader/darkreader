export function injectProxy() {
    // First get the originial 'native code' of the function.
    const addRuleFunction = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'addRule');
    const insertRuleFunction = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'insertRule');
    const deleteRuleFunction = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'deleteRule');
    const removeRuleFunction = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'removeRule');

    // Create a new Event Object that can be dipatched on elements.
    const updateSheetEvent = new Event('updateSheet');

    // Create the proxy function that should be identicial to the native one's.
    function proxyAddRule(selector?: string, style?: string, index?: number): number {
        addRuleFunction.value.call(this, selector, style, index);
        this.ownerNode.dispatchEvent(updateSheetEvent);
        // Should always returns -1 https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/addRule#Return_value.
        return -1;
    }

    function proxyInsertRule(rule: string, index?: number): number {
    // Cache the return value of insertRule as insertRule has the chance to not return the originial index.
        const returnValue = insertRuleFunction.value.call(this, rule, index);
        this.ownerNode.dispatchEvent(updateSheetEvent);
        return returnValue;
    }

    function proxyDeleteRule(index: number): void {
        deleteRuleFunction.value.call(this, index);
        this.ownerNode.dispatchEvent(updateSheetEvent);
    }

    function proxyRemoveRule(index?: number): void {
        removeRuleFunction.value.call(this, index);
        this.ownerNode.dispatchEvent(updateSheetEvent);
    }

    // Define the prototype of the CSSStyleSheet to use the proxy function.
    Object.defineProperty(CSSStyleSheet.prototype, 'addRule', {...addRuleFunction, value: proxyAddRule});
    Object.defineProperty(CSSStyleSheet.prototype, 'insertRule', {...insertRuleFunction, value: proxyInsertRule});
    Object.defineProperty(CSSStyleSheet.prototype, 'deleteRule', {...deleteRuleFunction, value: proxyDeleteRule});
    Object.defineProperty(CSSStyleSheet.prototype, 'removeRule', {...removeRuleFunction, value: proxyRemoveRule});
}
