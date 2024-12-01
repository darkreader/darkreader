import {m} from 'malevic';

import Button from '../button';

interface ResetButtonProps {
    onClick: () => void;
}

export default function ResetButton(props: ResetButtonProps, ...content: Malevic.Child[]) {
    return (
        <Button
            class="reset-button"
            onclick={props.onClick}
        >
            <span class="reset-button__content">
                <span class="reset-button__icon"></span>
                {...content}
            </span>
        </Button>
    );
}
