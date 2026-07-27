import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {ViewProps} from '../../../definitions';
import {DONATE_URL, HOMEPAGE_URL} from '../../../utils/links';
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
    const timePassed = Date.now() - (new Date(2014, 6, 7)).getTime();
    let years = Math.abs((new Date(timePassed)).getFullYear() - 1970);
    years = Math.max(10, years);
    return (
        <div class="m-donate-group">
            <a class="m-donate-button" href={DONATE_URL} target="_blank" rel="noopener noreferrer">
                <span class="m-donate-button__icon"></span>
                <span class="m-donate-button__text">
                    Pay for using <strong class="m-donate-button__darkreader">Dark Reader</strong>
                </span>
            </a>
            <label class="m-donate-description">
                Please support our work
            </label>
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
