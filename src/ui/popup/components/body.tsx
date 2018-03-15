import {html} from 'malevic';
import withForms from 'malevic/forms';
import withState from 'malevic/state';
import {TabPanel, Button, CheckBox} from '../../controls';
import Header from './header';
import FilterSettings from './filter-settings';
import FontSettings from './font-settings';
import Loader from './loader';
import SiteListSettings from './site-list-settings';
import {isFirefox} from '../../../background/utils';
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
}

function openDevTools() {
    chrome.windows.create({
        type: 'panel',
        url: isFirefox() ? '../devtools/index.html' : 'ui/devtools/index.html',
        width: 600,
        height: 600,
    });
}

function Body(props: BodyProps) {
    const {state, setState} = props;
    if (!props.data.ready) {
        return (
            <body>
                <Loader />
            </body>
        )
    }
    return (
        <body class={{'ext-disabled': !props.data.enabled}}>
            <Loader complete />

            <Header data={props.data} tab={props.tab} actions={props.actions} />

            <TabPanel
                activeTab={state.activeTab || 'Filter'}
                onSwitchTab={(tab) => setState({activeTab: tab})}
                tabs={{
                    'Filter': (
                        <FilterSettings data={props.data} actions={props.actions} />
                    ),
                    'Font': (
                        <FontSettings data={props.data} actions={props.actions} />
                    ),
                    'Site list': (
                        <SiteListSettings data={props.data} actions={props.actions} isFocused={state.activeTab === 'Site list'} />
                    )
                }}
            />

            <footer>
                <p>
                    Some things should not be inverted?<br />
                    You can <strong>help and fix it</strong>, here is a tool
                </p>
                <Button onclick={openDevTools}>
                    🛠 Open developer tools
                </Button>
            </footer>
        </body>
    );
}

export default withState(Body);
