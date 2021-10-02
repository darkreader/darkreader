import {m} from 'malevic';
import {getDuration} from '../../../utils/time';
import type {News} from '../../../definitions';
import type {ViewProps} from '../types';

function isFresh(n: News) {
    try {
        const now = Date.now();
        const date = (new Date(n.date)).getTime();
        return (now - date) < getDuration({days: 30});
    } catch (err) {
        return false;
    }
}

export default function NewsSection(props: ViewProps) {
    const news = props.data.news;
    const latest = news && news.length > 0 ? news[0] : null;
    return (
        <div class="news-section">
            {latest ? <a
                href={latest.url}
                class={{
                    'news-section__main-link': true,
                    'news-section__main-link--fresh': isFresh(latest),
                }}
            >
                {latest.headline}
            </a> : null}
        </div>
    );
}
