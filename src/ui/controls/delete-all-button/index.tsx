import {m} from 'malevic';
import Button from '../button';

interface DeleteAllButtonProps {
    onClick: () => void;
}

export default function DeleteAllButton(props: DeleteAllButtonProps, ...content: Malevic.Child[]) {
    return (
        <Button
            class="delete-all-button"
            onclick={props.onClick}
        >
            <span class="delete-all-button__content">
                <span class="delete-all-button-icon"></span>
                {...content}
            </span>
        </Button>
    );
}
