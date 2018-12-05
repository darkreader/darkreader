import {html} from 'malevic';

export default function CheckmarkIcon({isEnabled}) {
    return (
        <svg viewBox="0 0 8 8">
            <path
                d={(isEnabled ?
                    'M1,4 l2,2 l4,-4 v1 l-4,4 l-2,-2 Z' :
                    'M2,2 l4,4 v1 l-4,-4 Z M2,6 l4,-4 v1 l-4,4 Z'
                )} />
        </svg>
    );
}
