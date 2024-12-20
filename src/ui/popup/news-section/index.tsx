import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {News, ViewProps} from '../../../definitions';
import {HOMEPAGE_URL} from '../../../utils/links';
import {getDuration} from '../../../utils/time';

function isFresh(n: News) {
    try {
        const now = Date.now();
        const date = (new Date(n.date)).getTime();
        return (now - date) < getDuration({days: 30});
    } catch (err) {
        return false;
    }
}

function NewsLink(props: {news: News; isSmall?: boolean; onClick?: () => void}) {
    const {news} = props;
    return (
        <a
            href={news.url}
            class={{
                'news-section__news': true,
                'news-section__news--highlight': !news.read && isFresh(news),
                'news-section__news--has-icon': news.icon,
                'news-section__news--small': props.isSmall,
            }}
            onclick={props.onClick}
            target="_blank"
            rel="noopener noreferrer"
        >
            {news.icon ?
                <span
                    class="news-section__news__icon"
                    style={{'background-image': `url('${news.icon}')`}}
                ></span>
                : null}
            <span class="news-section__news__text">{news.headline}</span>
        </a>
    );
}

export default function NewsSection(props: ViewProps) {
    const context = getContext();
    const store = context.getStore({
        expanded: false,
        didNewsSlideIn: false,
    });
    const {expanded, didNewsSlideIn} = store;

    const news = props.data.news;
    const latest = news && news.length > 0 ? news[0] : null;

    function markLatestAsRead() {
        if (latest) {
            props.actions.markNewsAsRead([latest.id]);
        }
    }

    function toggleNews() {
        if (expanded) {
            markLatestAsRead();
        }
        store.expanded = !expanded;
        store.didNewsSlideIn = didNewsSlideIn || !store.expanded;
        context.refresh();
    }

    context.onRender(() => {
        if (latest && !latest.read && !store.expanded && !store.didNewsSlideIn) {
            setTimeout(toggleNews, 750);
        }
    });

    const birthdayExpired = (new Date(2024, 7, 2)).getTime();
    const birthdayNews = {
        id: 'birthday',
        date: '2024-07-07T00:00:00Z',
        url: `${HOMEPAGE_URL}/timeline/`,
        headline: 'On July 7th we celebrate 10 years!',
        icon: '/ui/assets/images/birthday-icon.svg',
    };
    const birthdayLink = <NewsLink isSmall news={birthdayNews} />;

    return (
        <div class={{'news-section': true, 'news-section--expanded': expanded}}>
            {Date.now() < birthdayExpired ? birthdayLink : latest ? <NewsLink isSmall news={latest} onClick={markLatestAsRead} /> : null}
            <div class="news-section__popover">
                <div class="news-section__popover__top">
                    <div class="news-section__title">
                        What's New
                    </div>
                    <span role="button" class="news-section__close" onclick={toggleNews}>✕</span>
                </div>
                {latest ? <NewsLink news={latest} onClick={markLatestAsRead} /> : null}
            </div>
        </div>
    );
}
