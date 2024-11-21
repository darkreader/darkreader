import {m} from 'malevic';
import {isFirefox} from 'utils/platform';

import {PhoneIcon} from '../../../../ui/icons/phone-icon';
import {MOBILE_URL} from '../../../../utils/links';
import {getLocalMessage} from '../../../../utils/locales';
import {Button} from '../../../controls';


interface MobileLinksProps {
    expanded: boolean;
    onLinkClick: () => void;
    onClose: () => void;
}

export function MobileLinks({expanded, onLinkClick, onClose}: MobileLinksProps) {
    return (
        <div class={{'news': true, 'news--expanded': expanded}}>
            <div class="news__header">
                <span class="news__header__text">
                    <span class="news__header__text__dark-reader">
                        Dark Reader
                    </span>
                    {' '}
                    <span class="news__header__text__mobile">
                        Mobile
                    </span>
                    <i class="news__header__text__phone-icon">
                        <PhoneIcon />
                    </i>
                </span>
                <span class="news__close" role="button" onclick={onClose}>✕</span>
            </div>
            <div class="news__list">
                <div class="news__mobile">
                    <div class="news__mobile__left">
                        <div class="news__mobile__text">
                            {getLocalMessage('mobile_text')}
                        </div>
                        <div class="news__mobile__learn-more-container">
                            <a
                                href={MOBILE_URL}
                                class="news__mobile__learn-more"
                                onclick={onLinkClick}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {getLocalMessage('learn_more')}
                            </a>
                            <div class="news__mobile__logos">
                                <img class="news__os-icon" src="../assets/images/icon-android-dark.svg" />
                                <img class="news__os-icon" src="../assets/images/icon-apple-white.svg" />
                            </div>
                        </div>
                    </div>
                    <div class="news__mobile__right">
                        <img
                            class="news__qr-code"
                            src={`../assets/images/${isFirefox ? 'mobile-qr-code-firefox.png' : 'mobile-qr-code.png'}`}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

interface NewsButtonProps {
    active: boolean;
    onClick: () => void;
}

export function MobileLinksButton({active, onClick}: NewsButtonProps) {
    return (
        <Button
            class={{'news-button': true, 'news-button--active': active}}
            onclick={(e) => {
                (e.currentTarget as HTMLElement).blur();
                onClick();
            }}
        >
            <span class="news-button__wrapper">
                <i class="news-button__phone-icon">
                    <PhoneIcon />
                </i>
                {getLocalMessage('mobile')}
            </span>
        </Button>
    );
}
