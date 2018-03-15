import {html} from 'malevic';
import withState from 'malevic/state';

interface LoaderProps {
    complete: boolean;
    state?: LoaderState;
    setState?: (state: LoaderState) => void;
}

interface LoaderState {
    finished?: boolean;
}

function Loader({complete = false, state, setState}: LoaderProps) {
    return (
        <div
            class={{
                'loader': true,
                'loader--complete': complete,
                'loader--transition-end': state.finished,
            }}
            ontransitionend={() => setState({finished: true})}
        >
            <label class="loader__message">Loading, please wait</label>
        </div>
    );
}

export default withState(Loader);
