import {m} from 'malevic';
import {getLocalMessage} from '../../../../utils/locales';
import {withState, useState} from 'malevic/state';

interface LoaderProps {
    complete: boolean;
}

interface LoaderState {
    finished: boolean;
}

function Loader({complete = false}: LoaderProps) {
    const {state, setState} = useState<LoaderState>({finished: false});
    return (
        <div
            class={{
                'loader': true,
                'loader--complete': complete,
                'loader--transition-end': state.finished,
            }}
            ontransitionend={() => setState({finished: true})}
        >
            <label class="loader__message">{getLocalMessage('loading_please_wait')}</label>
        </div>
    );
}

export default withState(Loader);
