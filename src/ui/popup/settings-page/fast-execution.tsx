import {m} from 'malevic';
import CheckButton from '../check-button';
import {getContext} from 'malevic/dom';

export default function EnableFastExecution() {
    const context = getContext();

    function onEnableFastExecution(checked: boolean) {
        if (checked) {
            chrome.permissions.request({
                permissions: ['webRequest', 'webRequestBlocking', 'declarativeContent'],
            }, (granted) => {
                console.log(granted);
            });
        } else {
            chrome.permissions.remove({
                permissions: ['webRequest', 'webRequestBlocking', 'declarativeContent'],
            }, (removed) => {
                console.log(removed);
            });
        }
    }

    const {isFastExecutionEnabled, refresh} = context.getStore();
    if (!refresh) {
        chrome.permissions.contains({
            permissions: ['webRequest', 'webRequestBlocking', 'declarativeContent'],
        }, (result) => {
            context.store.isFastExecutionEnabled = Boolean(result);
            context.store.refresh = true;
            context.refresh();
        });
    } else {
        context.store.refresh = false;
    }
    return (
        <CheckButton
            checked={isFastExecutionEnabled}
            label="Enable fast execution"
            description={isFastExecutionEnabled ?
                'Fast Execution is enabled' :
                'Fast Execution is disabled'}
            onChange={onEnableFastExecution}
        />
    );


}
