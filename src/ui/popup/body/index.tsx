import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import {DONATE_URL} from '../../../utils/links';
import {getLocalMessage} from '../../../utils/locales';
import {isMobile} from '../../../utils/platform';
import MainPage from '../main-page';
import {Page, PageViewer} from '../page-viewer';
import SettingsPage from '../settings-page';
import {ViewProps} from '../types';

function Logo() {
    return (
        <a
            class="m-logo"
            href="https://darkreader.org/"
            target="_blank"
            rel="noopener noreferrer"
        >
            Dark Reader
        </a>
    );
}

function Pages(props: ViewProps) {
    const context = getContext();
    const store = context.store as {
        activePage: 'main' | 'settings';
    };
    if (store.activePage == null) {
        store.activePage = 'main';
    }

    function onSettingsNavClick() {
        store.activePage = 'settings';
        context.refresh();
    }

    function onSettingsBackClick() {
        store.activePage = 'main';
        context.refresh();
    }

    return (
        <PageViewer
            activePage={store.activePage}
            onBackButtonClick={onSettingsBackClick}
        >
            <Page id="main">
                <MainPage
                    {...props}
                    onSettingsNavClick={onSettingsNavClick}
                />
            </Page>
            <Page id="settings">
                <SettingsPage {...props} onBackClick={onSettingsBackClick} />
            </Page>
        </PageViewer>
    );
}

function DonateGroup() {
    return (
        <div class="m-donate-group">
            <a class="m-donate-button" href={DONATE_URL} target="_blank" rel="noopener noreferrer">
                <span class="m-donate-button__text">
                    {getLocalMessage('donate')}
                </span>
            </a>
            <label class="m-donate-description">
                This project is sponsored by you
            </label>
        </div>
    );
}

export default function MobileBody(props: ViewProps) {
    const context = getContext();
    context.onCreate(() => {
        document.documentElement.classList.add('preview');
        if (isMobile()) {
            window.addEventListener('contextmenu', (e) => e.preventDefault());
        }
    });
    context.onRemove(() => {
        document.documentElement.classList.remove('preview');
    });

    return (
        <body>
            <section class="m-section">
                <Logo />
            </section>
            <section class="m-section pages-section">
                <Pages {...props} />
            </section>
            <section class="m-section">
                <DonateGroup />
            </section>
        </body>
    );
}
