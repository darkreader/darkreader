import {html} from 'malevic';
import {Button} from '../../../controls';
import {getLocalMessage} from '../../../../utils/locales';
import {News} from '../../../../definitions';

interface NewsProps {
    news: News[];
    expanded: boolean;
    onNewsOpen: (...news: News[]) => void;
    onClose: () => void;
}

const BLOG_URL = 'http://darkreader.org/blog/';
const NEWS_COUNT = 2;

export function News({news, expanded, onNewsOpen, onClose}: NewsProps) {
    return (
        <div class={{'news': true, 'news--expanded': expanded}}>
            <div class="news__header">
                <span class="news__header__text">{getLocalMessage('news')}</span>
                <span class="news__close" role="button" onclick={onClose}>✕</span>
            </div>
            <div class="news__list">
                {news.slice(0, NEWS_COUNT).map((event) => {
                    const locale = chrome && chrome.i18n ? chrome.i18n.getUILanguage() : 'en-US';
                    const formattedDate = new Date(event.date).toLocaleDateString(locale, {month: 'short', day: 'numeric'});
                    return (
                        <div class={{'news__event': true, 'news__event--unread': !event.read}}>
                            <a class="news__event__link" onclick={() => onNewsOpen(event)} href={event.url} target="_blank">
                                <span class="news__event__date">
                                    {formattedDate}
                                </span>
                                {event.headline}
                            </a>
                        </div>
                    );
                })}
                {(news.length <= NEWS_COUNT
                    ? null
                    : <a
                        class={{
                            'news__read-more': true,
                            'news__read-more--unread': news.slice(NEWS_COUNT).find(({read}) => !read),
                        }}
                        href={BLOG_URL}
                        target="_blank"
                        onclick={() => onNewsOpen(...news)}
                    >{getLocalMessage('read_more')}</a>
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
            {getLocalMessage('news')}
        </Button>
    );
}
