import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import {withState, useState} from 'malevic/state';

import {getLocalMessage} from '../../../../utils/locales';


interface LoaderProps {
    complete: boolean;
}

interface LoaderState {
    finished: boolean;
    errorOccured: boolean;
}

function Loader({complete = false}: LoaderProps) {
    const context = getContext();
    const {state, setState} = useState<LoaderState>({finished: false, errorOccured: false});

    // Add a setTimeout for 3 seconds(in which the UI should be loaded already)
    // after the 3 seconds show a generic error message that the UI couldn't be loaded.
    if (!state.errorOccured && !complete) {
        context.store.loaderTimeoutID = setTimeout(() => {
            setState({errorOccured: true});
            context.refresh();
        }, 3000);
    }
    if (complete) {
        clearTimeout(context.store.loaderTimeoutID);
    }

    const labelMessage = state.errorOccured ? "A unknown error has occured, the UI couldn't be loaded" : getLocalMessage('loading_please_wait');

    return (
        <div
            class={{
                'loader': true,
                'loader--complete': complete,
                'loader--transition-end': state.finished,
            }}
            ontransitionend={() => setState({finished: true})}
        >
            <label class={{
                'loader__message': true,
                'loader__error': state.errorOccured,
            }}>{labelMessage}</label>
        </div>
    );
}

export default withState(Loader);
