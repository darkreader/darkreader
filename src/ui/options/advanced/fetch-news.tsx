import {m} from 'malevic';
import type {ViewProps} from '../../../definitions';
import {CheckButton} from '../../controls';
import {getLocalMessage} from '../../../utils/locales';

export function FetchNews(props: ViewProps): Malevic.Child {
    function onFetchNewsChange(checked: boolean) {
        props.actions.changeSettings({fetchNews: checked});
    }

    return (
        <CheckButton
            checked={props.data.settings.fetchNews}
            label={getLocalMessage('notify_of_news')}
            description={props.data.settings.fetchNews ?
                getLocalMessage('notifying_of_dark_readers_news') :
                getLocalMessage('not_notifying_of_dark_readers_news')}
            onChange={onFetchNewsChange}
        />
    );
}
