import {m} from 'malevic';
import type {ViewProps} from '../types';
import CheckButton from '../check-button';

export default function CheckNews(props: ViewProps) {
    function onNotifyOfNewsChange(checked: boolean) {
        props.actions.changeSettings({notifyOfNews: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.notifyOfNews}
            label="Notify of news"
            description={props.data.settings.notifyOfNews ?
                "Notifying of Dark Reader's news" :
                "Not Notifying of Dark Reader's news"}
            onChange={onNotifyOfNewsChange}
        />
    );
}
