import {m} from 'malevic';

import type {News} from '../../../../definitions';
import {BLOG_URL} from '../../../../utils/links';
import {getLocalMessage, getUILanguage} from '../../../../utils/locales';
import {Button} from '../../../controls';

interface NewsProps {
    news: News[];
    expanded: boolean;
    onNewsOpen: (...news: News[]) => void;
    onClose: () => void;
}

const NEWS_COUNT = 2;

export function NewsGroup({news, expanded, onNewsOpen, onClose}: NewsProps) {
    return (
        <div class={{'news': true, 'news--expanded': expanded}}>
            <div class="news__header">
                <span class="news__header__text">{getLocalMessage('news')}</span>
                <span class="news__close" role="button" onclick={onClose}>✕</span>
            </div>
            <div class="news__list">
                {news.slice(0, NEWS_COUNT).map((event) => {
                    const date = new Date(event.date);
                    let formattedDate: string;
                    try {
                        // Workaround for https://bugs.chromium.org/p/chromium/issues/detail?id=811403
                        const locale = getUILanguage();
                        formattedDate = date.toLocaleDateString(locale, {month: 'short', day: 'numeric'});
                    } catch (err) {
                        formattedDate = date.toISOString().substring(0, 10);
                    }
                    return (
                        <div
                            class={{
                                'news__event': true,
                                'news__event--unread': !event.read,
                                'news__event--has-icon': event.icon,
                            }}
                        >
                            <a class="news__event__link" onclick={() => onNewsOpen(event)} href={event.url} target="_blank" rel="noopener noreferrer">
                                {event.icon ?
                                    <span class="news__event__icon" style={{'background-image': `url('${event.icon}')`}}></span>
                                    : null}
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
                        rel="noopener noreferrer"
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
