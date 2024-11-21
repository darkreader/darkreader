import {m} from 'malevic';

import Button from '../button';
import Overlay from '../overlay';

interface MessageBoxProps {
    caption: string;
    onOK?: () => void;
    onCancel?: () => void;
    hideCancel?: boolean;
    portalKey?: any;
}

export default function MessageBox(props: MessageBoxProps) {
    return (
        <Overlay.Portal key={props.portalKey} onOuterClick={props.onCancel}>
            <div class="message-box">
                <label class="message-box__caption">
                    {props.caption}
                </label>
                <div class="message-box__buttons">
                    <Button class="message-box__button message-box__button-ok" onclick={props.onOK}>
                        OK
                    </Button>
                    {props.hideCancel ? null :
                        <Button class="message-box__button message-box__button-cancel" onclick={props.onCancel}>
                            Cancel
                        </Button>
                    }
                </div>
            </div>
        </Overlay.Portal>
    );
}
