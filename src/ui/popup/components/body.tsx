import {html} from 'malevic';
import withForms from 'malevic/forms';
import withState from 'malevic/state';
import {TabPanel, Button, CheckBox} from '../../controls';
import FilterSettings from './filter-settings';
import Header from './header';
import Loader from './loader';
import MoreSettings from './more-settings';
import {News, NewsButton} from './news';
import SiteListSettings from './site-list-settings';
import {isFirefox} from '../../../utils/platform';
import {ExtensionData, ExtensionActions, TabInfo} from '../../../definitions';

withForms();

interface BodyProps {
    data: ExtensionData;
    tab: TabInfo;
    actions: ExtensionActions;
    state?: BodyState;
    setState?: (state: BodyState) => void;
}

interface BodyState {
    activeTab?: string;
    newsOpen?: boolean;
}

function openDevTools() {
    chrome.windows.create({
        type: 'panel',
        url: isFirefox() ? '../devtools/index.html' : 'ui/devtools/index.html',
        width: 600,
        height: 600,
    });
}

const DONATE_URL = 'https://opencollective.com/darkreader';
const PRIVACY_URL = 'http://darkreader.org/privacy/';
const TWITTER_URL = 'https://twitter.com/darkreaderapp';
const GITHUB_URL = 'https://github.com/darkreader/darkreader';

function Body(props: BodyProps) {
    const {state, setState} = props;
    if (!props.data.ready) {
        return (
            <body>
                <Loader />
            </body>
        )
    }

    function toggleNews() {
        setState({newsOpen: !state.newsOpen});
    }

    return (
        <body class={{'ext-disabled': !props.data.enabled}}>
            <Loader complete />

            <Header data={props.data} tab={props.tab} actions={props.actions} />

            <main>
                <TabPanel
                    activeTab={state.activeTab || 'Filter'}
                    onSwitchTab={(tab) => setState({activeTab: tab})}
                    tabs={{
                        'Filter': (
                            <FilterSettings data={props.data} actions={props.actions} />
                        ),
                        'Site list': (
                            <SiteListSettings data={props.data} actions={props.actions} isFocused={state.activeTab === 'Site list'} />
                        ),
                        'More': (
                            <MoreSettings data={props.data} actions={props.actions} />
                        ),
                    }}
                />
            </main>

            <footer>
                <div class="footer-links">
                    <a class="footer-links__link" href={PRIVACY_URL} target="_blank">Privacy</a>
                    <a class="footer-links__link" href={TWITTER_URL} target="_blank">Twitter</a>
                    <a class="footer-links__link" href={GITHUB_URL} target="_blank">GitHub</a>
                </div>
                <div class="footer-buttons">
                    <a class="donate-link" href={DONATE_URL} target="_blank">
                        <span class="donate-link__text">Donate</span>
                    </a>
                    <NewsButton active={state.newsOpen} count={2} onClick={toggleNews} />
                    <Button onclick={openDevTools} class="dev-tools-button">
                        🛠 Dev tools
                    </Button>
                </div>
            </footer>
            <News expanded={state.newsOpen} onClose={toggleNews} />
        </body >
    );
}

export default withState(Body, {newsOpen: true});
