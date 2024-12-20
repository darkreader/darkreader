import {m} from 'malevic';

import Button from '../button';

interface NavButtonProps {
    class?: any;
    onClick: () => void;
}

export default function ResetButton(props: NavButtonProps, ...content: Malevic.Child[]) {
    return (
        <Button
            class={['nav-button', props.class]}
            onclick={props.onClick}
        >
            <span class="nav-button__content">
                {...content}
            </span>
        </Button>
    );
}
