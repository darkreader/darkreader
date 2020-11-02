export function injectProxy() {
    const addRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'addRule');
    const insertRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'insertRule');
    const deleteRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'deleteRule');
    const removeRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'removeRule');

    const cleanUp = () => {
        Object.defineProperty(CSSStyleSheet.prototype, 'addRule', addRuleDescriptor);
        Object.defineProperty(CSSStyleSheet.prototype, 'insertRule', insertRuleDescriptor);
        Object.defineProperty(CSSStyleSheet.prototype, 'deleteRule', deleteRuleDescriptor);
        Object.defineProperty(CSSStyleSheet.prototype, 'removeRule', removeRuleDescriptor);
        document.removeEventListener('__darkreader__cleanUp', cleanUp);
    };
    document.addEventListener('__darkreader__cleanUp', cleanUp);

    const updateSheetEvent = new Event('__darkreader__updateSheet');

    function proxyAddRule(selector?: string, style?: string, index?: number): number {
        addRuleDescriptor.value.call(this, selector, style, index);
        this.ownerNode.dispatchEvent(updateSheetEvent);
        // Should always returns -1 https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/addRule#Return_value.
        return -1;
    }

    function proxyInsertRule(rule: string, index?: number): number {
        const returnValue = insertRuleDescriptor.value.call(this, rule, index);
        this.ownerNode.dispatchEvent(updateSheetEvent);
        return returnValue;
    }

    function proxyDeleteRule(index: number): void {
        deleteRuleDescriptor.value.call(this, index);
        this.ownerNode.dispatchEvent(updateSheetEvent);
    }

    function proxyRemoveRule(index?: number): void {
        removeRuleDescriptor.value.call(this, index);
        this.ownerNode.dispatchEvent(updateSheetEvent);
    }

    Object.defineProperty(CSSStyleSheet.prototype, 'addRule', {...addRuleDescriptor, value: proxyAddRule});
    Object.defineProperty(CSSStyleSheet.prototype, 'insertRule', {...insertRuleDescriptor, value: proxyInsertRule});
    Object.defineProperty(CSSStyleSheet.prototype, 'deleteRule', {...deleteRuleDescriptor, value: proxyDeleteRule});
    Object.defineProperty(CSSStyleSheet.prototype, 'removeRule', {...removeRuleDescriptor, value: proxyRemoveRule});
}
