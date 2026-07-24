import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {ViewProps} from '../../../definitions';
import {DONATE_URL, HOMEPAGE_URL} from '../../../utils/links';
import {getLocalMessage} from '../../../utils/locales';
import {isMobile} from '../../../utils/platform';
import {Overlay} from '../../controls';
import {openExtensionPage} from '../../utils';
import MainPage from '../main-page';
import {Page, PageViewer} from '../page-viewer';
import ThemePage from '../theme/page';

interface IndexStore {
    activePage: PageId;
}

function Logo() {
    return (
        <a
            class="m-logo"
            href={HOMEPAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
        >
            Dark Reader
        </a>
    );
}

type PageId = (
    'main'
    | 'theme'
    | 'settings'
    | 'site-list'
    | 'automation'
    | 'manage-settings'
);

let popstate: (() => void) | null = null;
isMobile && window.addEventListener('popstate', () => popstate && popstate(), {passive: true});

function Pages(props: ViewProps) {
    const context = getContext();
    const store: IndexStore = context.store;
    if (store.activePage == null) {
        store.activePage = 'main';
    }

    function onThemeNavClick() {
        isMobile && history.pushState(undefined, '');
        store.activePage = 'theme';
        context.refresh();
    }

    function onSettingsNavClick() {
        openExtensionPage('options');
    }

    function goBack() {
        const activePage = store.activePage;
        const settingsPageSubpages: PageId[] = ['automation', 'manage-settings', 'site-list'];
        if (settingsPageSubpages.includes(activePage)) {
            store.activePage = 'settings';
        } else {
            store.activePage = 'main';
        }
        context.refresh();
    }

    popstate = goBack;

    function onBackClick() {
        if (isMobile) {
            history.back();
        } else {
            goBack();
        }
    }

    return (
        <PageViewer
            activePage={store.activePage}
            onBackButtonClick={onBackClick}
        >
            <Page id="main">
                <MainPage
                    {...props}
                    onThemeNavClick={onThemeNavClick}
                    onSettingsNavClick={onSettingsNavClick}
                />
            </Page>
            <Page id="theme">
                <ThemePage {...props} />
            </Page>

        </PageViewer>
    );
}

function DonateGroup() {
    let birthdayMessage = getLocalMessage('we_celebrate_10_years');
    let birthdayMessageSpec = <span>{birthdayMessage}</span>;
    try {
        const index10 = birthdayMessage.indexOf('10');
        const indexDot = birthdayMessage.indexOf('.', index10);
        if (index10 >= 0 && indexDot > index10) {
            const timePassed = Date.now() - (new Date(2014, 6, 7)).getTime();
            let years = Math.abs((new Date(timePassed)).getFullYear() - 1970);
            years = Math.max(10, years);
            birthdayMessageSpec = (
                <span>
                    {birthdayMessage.startsWith('Dark Reader') ? <strong class="birthday-message-darkreader">Dark Reader</strong> : null}
                    {birthdayMessage.substring(birthdayMessage.startsWith('Dark Reader') ? 11 : 0, index10)}
                    <a href={`${HOMEPAGE_URL}/timeline/`} target="_blank" rel="noopener noreferrer">
                        {`${years}${birthdayMessage.substring(index10 + 2, indexDot)}`}
                    </a>
                    {birthdayMessage.substring(indexDot)}
                </span>
            );
        }
    } catch (err) {
        console.error(err);
    }

    return (
        <div class="m-donate-group">
            <div class="birthday-container m-birthday">
                <i class="birthday-icon">🎉</i>
                <span class="birthday-message">
                    {birthdayMessageSpec}
                </span>
                <a class="donate-link" href={DONATE_URL} target="_blank" rel="noopener noreferrer">
                    <span class="donate-link__text">{getLocalMessage('pay_for_using')}</span>
                </a>
            </div>
        </div>
    );
}

export default function Body(props: ViewProps) {
    const context = getContext();
    context.onCreate(() => {
        if (isMobile) {
            window.addEventListener('contextmenu', ({preventDefault}) => preventDefault());
        }
    });
    context.onRemove(() => {
        document.documentElement.classList.remove('preview');
    });

    return (
        <body>
            <section class="m-section">
                {props.data.uiHighlights.includes('anniversary') ? <DonateGroup /> : <Logo />}
            </section>
            <section class="m-section pages-section">
                <Pages {...props} />
            </section>
            <Overlay />
        </body>
    );
}
