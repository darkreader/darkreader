import {m} from 'malevic';
import {ExtensionActions} from '../../../definitions';
import {Button} from '../../../ui/controls';
import CheckButton from '../../../ui/popup/check-button';

export function Reset_Div(props: {ExtActions: ExtensionActions; resetFunction: () => void}) {

    let doNotAskToggle = false;

    function cancel() {
        document.body.classList.remove('reset');
    }
    function toggleDoNotAsk() {
        doNotAskToggle = !doNotAskToggle;
    }
    function reset() {
        if (doNotAskToggle) {
            props.ExtActions.setDoNotAskAgain('true')
        }
        props.resetFunction();
    }
    return (
        <div class="reset-div">
            <div class="reset-div__wrapper">
                <Button 
                class="reset-div__button"
                onclick={reset}>
                    Reset
                </Button>
                <Button 
                    class="reset-div__button"
                    onclick={cancel}>
                        Cancel
                </Button>
            </div>
            <div class="reset-div__wrapper">
            <CheckButton
                checked={doNotAskToggle}
                label='Do not ask again.'
                description='Do not ask the next time to comfirm you want to reset.'
                onChange={toggleDoNotAsk}
            />
            </div>
        </div>
    );
}