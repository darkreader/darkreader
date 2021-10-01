import {m} from 'malevic';
import type {ViewProps} from '../types';

export default function NewsSection(props: ViewProps) {
    const news = props.data.news;
    const latest = news && news.length > 0 ? news[0] : null;
    return (
        <div class="news-section">
            {latest ? <a href={latest.url} class="news-section__main-link">
                {latest.headline}
            </a> : null}
        </div>
    );
}
