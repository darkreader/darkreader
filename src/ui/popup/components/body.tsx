import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import {withForms} from 'malevic/forms';
import {withState, useState} from 'malevic/state';

import type {ExtensionData, ExtensionActions, News as NewsObject} from '../../../definitions';
import {DONATE_URL, HOMEPAGE_URL, MOBILE_URL, getHelpURL} from '../../../utils/links';
import {getLocalMessage} from '../../../utils/locales';
import {isMobile} from '../../../utils/platform';
import {getDuration} from '../../../utils/time';
import {TabPanel} from '../../controls';
import {compose} from '../../utils';
import NewBody from '../body';

import FilterSettings from './filter-settings';
import {Header, MoreSiteSettings, MoreToggleSettings} from './header';
import Loader from './loader';
import MoreSettings from './more-settings';
import {NewsGroup, NewsButton} from './news';
import {MobileLinks, MobileLinksButton} from './news/mobile-links';
import SiteListSettings from './site-list-settings';


import {PlusBody, activate} from '@plus/popup/plus-body';

declare const __THUNDERBIRD__: boolean;
declare const __PLUS__: boolean;

interface BodyProps {
    data: ExtensionData;
    actions: ExtensionActions;
}

interface BodyState {
    activeTab: string;
    newsOpen: boolean;
    mobileLinksOpen: boolean;
    didNewsSlideIn: boolean;
    didMobileLinksSlideIn: boolean;
    moreSiteSettingsOpen: boolean;
    moreToggleSettingsOpen: boolean;
    newToggleMenusHighlightHidden: boolean;
}

function Body(props: BodyProps & {fonts: string[]} & {installation: {date: number; version: string}}) {
    const context = getContext();
    const {state, setState} = useState<BodyState>({
        activeTab: 'Filter',
        newsOpen: false,
        mobileLinksOpen: false,
        didNewsSlideIn: false,
        didMobileLinksSlideIn: false,
        moreSiteSettingsOpen: false,
        moreToggleSettingsOpen: false,
        newToggleMenusHighlightHidden: false,
    });

    if (!props.data.isReady) {
        return (
            <body>
                <Loader complete={false} />
            </body>
        );
    }

    const v = props.installation?.version?.split('.').map((p) => parseInt(p));
    const n = v && v.length >= 3 ? (v[0] * 1e6 + v[1] * 1e3 + v[2]) : 0;

    if (
        __PLUS__ && (
            props.data.settings.previewNewestDesign || (isMobile && n && n >= 4009093)
        )
    ) {
        return <PlusBody {...props} fonts={props.fonts} />;
    }

    if (isMobile || props.data.settings.previewNewDesign) {
        return <NewBody {...props} fonts={props.fonts} />;
    }

    const unreadNews = props.data.news.filter(({read}) => !read);
    const latestNews = props.data.news.length > 0 ? props.data.news[0] : null;
    const isFirstNewsUnread = latestNews && !latestNews.read;
    let newsWereLongTimeAgo = true;
    if (unreadNews.length > 0) {
        const latest = new Date(unreadNews[0].date);
        const today = new Date();
        newsWereLongTimeAgo = latest.getTime() < today.getTime() - getDuration({days: 30});
    }
    const displayedNewsCount = newsWereLongTimeAgo ? 0 : unreadNews.length;

    context.onRender(() => {
        if (props.data.uiHighlights.includes('mobile-links') && !state.mobileLinksOpen && !state.didMobileLinksSlideIn) {
            setTimeout(toggleMobileLinks, 750);
        } else if (props.data.settings.fetchNews && isFirstNewsUnread && !state.newsOpen && !state.didNewsSlideIn && !newsWereLongTimeAgo) {
            setTimeout(toggleNews, 750);
        }
    });

    function toggleNews() {
        if (state.newsOpen && unreadNews.length > 0) {
            props.actions.markNewsAsRead(unreadNews.map(({id}) => id));
        }
        setState({newsOpen: !state.newsOpen, didNewsSlideIn: state.didNewsSlideIn || !state.newsOpen});
    }

    function toggleMobileLinks() {
        setState({mobileLinksOpen: !state.mobileLinksOpen, didMobileLinksSlideIn: state.didMobileLinksSlideIn || !state.mobileLinksOpen});
        if (state.mobileLinksOpen && props.data.uiHighlights.includes('mobile-links')) {
            disableMobileLinksSlideIn();
        }
    }

    function disableMobileLinksSlideIn() {
        if (props.data.uiHighlights.includes('mobile-links')) {
            props.actions.hideHighlights(['mobile-links']);
        }
    }

    function onNewsOpen(...news: NewsObject[]) {
        const unread = news.filter(({read}) => !read);
        if (unread.length > 0) {
            props.actions.markNewsAsRead(unread.map(({id}) => id));
        }
    }

    function toggleMoreSiteSettings() {
        setState({moreSiteSettingsOpen: !state.moreSiteSettingsOpen, moreToggleSettingsOpen: false, newToggleMenusHighlightHidden: true});
        if (props.data.uiHighlights.includes('new-toggle-menus')) {
            props.actions.hideHighlights(['new-toggle-menus']);
        }
    }

    function toggleMoreToggleSettings() {
        setState({moreToggleSettingsOpen: !state.moreToggleSettingsOpen, moreSiteSettingsOpen: false, newToggleMenusHighlightHidden: true});
        if (props.data.uiHighlights.includes('new-toggle-menus')) {
            props.actions.hideHighlights(['new-toggle-menus']);
        }
    }

    const birthdayMessage = getLocalMessage('we_celebrate_10_years');
    let birthdayMessageSpec = <span>{birthdayMessage}</span>;
    try {
        const index10 = birthdayMessage.indexOf('10');
        const indexDot = birthdayMessage.indexOf('.', index10);
        if (index10 >= 0 && indexDot > index10) {
            birthdayMessageSpec = (
                <span>
                    {birthdayMessage.substring(0, index10)}
                    <a href={`${HOMEPAGE_URL}/timeline/`} target="_blank" rel="noopener noreferrer">
                        {birthdayMessage.substring(index10, indexDot)}
                    </a>
                    {birthdayMessage.substring(indexDot)}
                </span>
            );
        }
    } catch (err) {
        console.error(err);
    }

    const filterTab = <FilterSettings data={props.data} actions={props.actions}>
        {__PLUS__ ? (
            props.data.uiHighlights.includes('anniversary') ? (
                <div class="ui-upgrade">
                    <i class="ui-upgrade__icon">
                    </i>
                    <span class="ui-upgrade__message">
                        Support the development and get access to the latest features
                    </span>
                    <a class="ui-upgrade__button" href={`${HOMEPAGE_URL}/plus/`} target="_blank" rel="noopener noreferrer">
                        <span class="ui-upgrade__button__text">
                            Upgrade
                        </span>
                    </a>
                </div>
            ) : (
                <div class="ui-upgrade">
                    <i class="ui-upgrade__icon">
                    </i>
                    <span class="ui-upgrade__message">
                        Activate the latest features
                    </span>
                    <a class="ui-upgrade__button" target="_blank" rel="noopener noreferrer" onclick={() => {
                        chrome.storage.local.get<Record<string, any>>({activationEmail: '', activationKey: ''}, async ({activationEmail, activationKey}) => {
                            const result = await activate(activationEmail, activationKey);
                            if (result) {
                                context.refresh();
                            } else {
                                props.actions.changeSettings({previewNewestDesign: true});
                            }
                        });
                    }}>
                        <span class="ui-upgrade__button__text">
                            Enable new design
                        </span>
                    </a>
                </div>
            )
        ) : props.data.uiHighlights.includes('anniversary') ? (
            <div class="birthday-container">
                <i class="birthday-icon">🎉</i>
                <span class="birthday-message">
                    {birthdayMessageSpec}
                </span>
                <a class="donate-link" href={DONATE_URL} target="_blank" rel="noopener noreferrer">
                    <span class="donate-link__text">{getLocalMessage('pay_for_using')}</span>
                </a>
            </div>
        ) : null}
    </FilterSettings>;

    const moreTab = <MoreSettings data={props.data} actions={props.actions} fonts={props.fonts} />;

    return (
        <body
            class={{
                'ext-disabled': !props.data.isEnabled,
                'ext-tall': __PLUS__ || props.data.uiHighlights.includes('anniversary'),
            }}
        >
            <Loader complete />

            <Header
                data={props.data}
                actions={props.actions}
                onMoreSiteSettingsClick={toggleMoreSiteSettings}
                onMoreToggleSettingsClick={toggleMoreToggleSettings}
            />

            <TabPanel
                activeTab={state.activeTab}
                onSwitchTab={(tab) => setState({activeTab: tab})}
                tabs={__THUNDERBIRD__ ? {
                    'Filter': filterTab,
                    'More': moreTab,
                } : {
                    'Filter': filterTab,
                    'Site list': (
                        <SiteListSettings data={props.data} actions={props.actions} isFocused={state.activeTab === 'Site list'} />
                    ),
                    'More': moreTab,
                }}
                tabLabels={{
                    'Filter': getLocalMessage('filter'),
                    'Site list': getLocalMessage('site_list'),
                    'More': getLocalMessage('more'),
                }}
            />

            <div class="mobile-link-container">
                <a class="mobile-link" href={MOBILE_URL} target="_blank" rel="noopener noreferrer">
                    <span class="mobile-link__icon"></span>
                    <span class="mobile-link__text">
                        {getLocalMessage('mobile_link')}
                    </span>
                </a>
            </div>
            <footer>
                <div class="footer-buttons">
                    <a class="footer-help-link" href={getHelpURL()} target="_blank" rel="noopener noreferrer">{getLocalMessage('help')}</a>
                    <NewsButton active={state.newsOpen} count={displayedNewsCount} onClick={toggleNews} />
                    <MobileLinksButton active={state.mobileLinksOpen} onClick={toggleMobileLinks} />
                </div>
            </footer>
            <NewsGroup
                news={props.data.news}
                expanded={state.newsOpen}
                onNewsOpen={onNewsOpen}
                onClose={toggleNews}
            />
            <MobileLinks
                expanded={state.mobileLinksOpen}
                onLinkClick={disableMobileLinksSlideIn}
                onClose={toggleMobileLinks}
            />
            <MoreSiteSettings
                data={props.data}
                actions={props.actions}
                isExpanded={state.moreSiteSettingsOpen}
                onClose={toggleMoreSiteSettings}
            />
            <MoreToggleSettings
                data={props.data}
                actions={props.actions}
                isExpanded={state.moreToggleSettingsOpen}
                onClose={toggleMoreToggleSettings}
            />
        </body>
    );
}

export default compose(Body, withState, withForms);
