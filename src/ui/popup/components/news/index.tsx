import {html} from 'malevic';
import {Button} from '../../../controls';

interface NewsProps {
    expanded: boolean;
    onClose: () => void;
}

const news = [
    {date: new Date(2018, 4, 27), name: 'Nasdaq market paralyzed by Dark Reader donation popup', read: false, id: 'news-section', url: '#'},
    {date: new Date(2018, 4, 23), name: 'Introducing Dynamic Theme mode', read: true, id: 'dynamic-theme', url: 'http://darkreader.org/blog/dynamic-theme/'},
];

const BLOG_URL = 'http://darkreader.org/blog/';
const NEWS_COUNT = 2;

export function News({expanded, onClose}: NewsProps) {

    return (
        <div class={{'news': true, 'news--expanded': expanded}}>
            <div class="news__header">
                <span class="news__header__text">News</span>
                <span class="news__close" role="button" onclick={onClose}>✕</span>
            </div>
            <div class="news__list">
                {news.slice(0, NEWS_COUNT).map((event) => {
                    const locale = chrome && chrome.i18n ? chrome.i18n.getUILanguage() : 'en-US';
                    const formattedDate = event.date.toLocaleDateString(locale, {month: 'short', day: 'numeric'});
                    return (
                        <div class={{'news__event': true, 'news__event--read': event.read}}>
                            <a class="news__event__link" href={event.url} target="_blank">
                                <span class="news__event__date">
                                    {formattedDate}
                                </span>
                                {event.name}
                            </a>
                        </div>
                    );
                })}
                {(news.length <= NEWS_COUNT
                    ? null
                    : <a class="news__read-more" href={BLOG_URL} target="_blank">Read more</a>
                )}
            </div>
        </div>
    );
}

interface NewsButtonProps {
    active: boolean;
    count: number;
    onClick: () => void;
}

export function NewsButton({active, count, onClick}: NewsButtonProps) {
    return (
        <Button
            class={{'news-button': true, 'news-button--active': active}}
            href="#news"
            data-count={count > 0 && !active ? count : null}
            onclick={(e) => {
                (e.currentTarget as HTMLElement).blur();
                onClick();
            }}
        >
            News
        </Button>
    );
}
