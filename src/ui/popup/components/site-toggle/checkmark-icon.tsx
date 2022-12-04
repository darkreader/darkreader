import {m} from 'malevic';

export default function CheckmarkIcon({isChecked}: {isChecked: boolean}) {
    return (
        <svg viewBox="0 0 8 8">
            <path
                d={(isChecked ?
                    'M1,4 l2,2 l4,-4 v1 l-4,4 l-2,-2 Z' :
                    'M2,2 l4,4 v1 l-4,-4 Z M2,6 l4,-4 v1 l-4,4 Z'
                )} />
        </svg>
    );
}
