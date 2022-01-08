// @ts-check
import Button from '../button';
import Overlay from '../overlay';
import {tags} from 'malevic/dom';

/** @typedef {{caption: string; onOK?: () => void; onCancel?: () => void; portalKey?: any}} MessageBoxProps */

const {div, label} = tags;

/** @type {Malevic.Component<MessageBoxProps>} */
export default function MessageBox(props) {
    return (
        Overlay.Portal({key: props.portalKey, onOuterClick: props.onCancel},
            div({class: 'message-box'},
                label({class: 'message-box__caption'},
                    props.caption,
                ),
                div({class: 'message-box__buttons'},
                    Button({class: 'message-box__button message-box__button-ok', onclick: props.onOK},
                        'OK',
                    ),
                    Button({class: 'message-box__button message-box__button-cancel', onclick: props.onCancel},
                        'Cancel',
                    ),
                ),
            ),
        )
    );
}
