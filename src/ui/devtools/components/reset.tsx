import {m} from 'malevic';
import {ExtensionData} from '../../../definitions';

export function Reset_Div(data: ExtensionData) {
    function cancel() {
        document.body.classList.remove('reset');
    }
    return (
        <div class="reset-div">
            <div class="reset-div__wrapper">
                <button class="reset-div__button">
                    Reset
                </button>
                <button class="reset-div__button" onClick={cancel}>
                    Cancel
                </button>
            </div>
            <div class="reset-div__wrapper">
                <input type="checkbox" id="DoNotAskAgain"/>
                <label for="DoNotAskAgain">Do not ask again to comfirm resetting CSS.</label>
                </div>
        </div>
    );
}