import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import {withForms} from 'malevic/forms';
import {withState, useState} from 'malevic/state';
import {TabPanel, Button} from '../../controls';
import FilterSettings from './filter-settings';
import {Header, MoreSiteSettings, MoreToggleSettings} from './header';
import Loader from './loader';
import NewBody from '../body';
import MoreSettings from './more-settings';
import {NewsGroup, NewsButton} from './news';
import SiteListSettings from './site-list-settings';
import {getDuration} from '../../../utils/time';
import {DONATE_URL, HOMEPAGE_URL, MOBILE_URL, getHelpURL} from '../../../utils/links';
import {getLocalMessage} from '../../../utils/locales';
import {compose, openExtensionPage} from '../../utils';
import {PlusBody} from '@plus/popup/plus-body'; // eslint-disable-line
import type {ExtensionData, ExtensionActions, News as NewsObject} from '../../../definitions';
import {isMobile} from '../../../utils/platform';

declare const __THUNDERBIRD__: boolean;
declare const __PLUS__: boolean;

interface BodyProps {
    data: ExtensionData;
    actions: ExtensionActions;
}

interface BodyState {
    activeTab: string;
    newsOpen: boolean;
    didNewsSlideIn: boolean;
    moreSiteSettingsOpen: boolean;
    moreToggleSettingsOpen: boolean;
    newToggleMenusHighlightHidden: boolean;
}

async function openDevTools() {
    await openExtensionPage('devtools');
}

function Body(props: BodyProps & {fonts: string[]}) {
    const context = getContext();
    const {state, setState} = useState<BodyState>({
        activeTab: 'Filter',
        newsOpen: false,
        didNewsSlideIn: false,
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

    if (!props.data.settings.previewNewDesign && __PLUS__) {
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
        if (props.data.settings.fetchNews && isFirstNewsUnread && !state.newsOpen && !state.didNewsSlideIn && !newsWereLongTimeAgo) {
            setTimeout(toggleNews, 750);
        }
    });

    function toggleNews() {
        if (state.newsOpen && unreadNews.length > 0) {
            props.actions.markNewsAsRead(unreadNews.map(({id}) => id));
        }
        setState({newsOpen: !state.newsOpen, didNewsSlideIn: state.didNewsSlideIn || !state.newsOpen});
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
        <div class="birthday-container">
            <i class="birthday-icon">🎉</i>
            <span class="birthday-message">
                {birthdayMessageSpec}
            </span>
            <a class="donate-link" href={DONATE_URL} target="_blank" rel="noopener noreferrer">
                <span class="donate-link__text">{getLocalMessage('pay_for_using')}</span>
            </a>
        </div>
    </FilterSettings>;

    const moreTab = <MoreSettings data={props.data} actions={props.actions} fonts={props.fonts} />;

    return (
        <body class={{'ext-disabled': !props.data.isEnabled}}>
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
                    <Button onclick={openDevTools} class="dev-tools-button">
                        🛠 {getLocalMessage('open_dev_tools')}
                    </Button>
                </div>
            </footer>
            <NewsGroup
                news={props.data.news}
                expanded={state.newsOpen}
                onNewsOpen={onNewsOpen}
                onClose={toggleNews}
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
