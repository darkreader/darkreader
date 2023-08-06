import { m } from 'malevic';
import type { ViewProps } from '../types';
import CheckButton from '../check-button';

export default function FetchNews(props: ViewProps) {
    function onFetchNewsChange(checked: boolean) {
        props.actions.changeSettings({ fetchNews: checked });
    }

    return (
        <CheckButton
            checked={props.data.settings.fetchNews}
            label='Notify of news'
            description={
                props.data.settings.fetchNews
                    ? "Notifying of Dark Reader's news"
                    : "Not Notifying of Dark Reader's news"
            }
            onChange={onFetchNewsChange}
        />
    );
}
