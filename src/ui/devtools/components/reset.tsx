import {m} from 'malevic';
import {ExtensionData} from '../../../definitions';
import {Button} from '../../../ui/controls';

export function Reset_Div(data: ExtensionData) {
    function cancel() {
        document.body.classList.remove('reset');
    }
    return (
        <div class="reset-div">
            <div class="reset-div__wrapper">
                <Button class="reset-div__button">
                    Reset
                </Button>
                <Button 
                    class="reset-div__button"
                    onclick={cancel}>
                        Cancel
                </Button>
            </div>
            <div class="reset-div__wrapper">
                <input type="checkbox" id="DoNotAskAgain"/>
                <label for="DoNotAskAgain">Do not ask again to comfirm resetting CSS.</label>
                </div>
        </div>
    );
}