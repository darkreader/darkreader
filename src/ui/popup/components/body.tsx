import {html} from 'malevic';
import withForms from 'malevic/forms';
import withState from 'malevic/state';
import {TabPanel, Button, CheckBox} from '../../controls';
import Header from './header';
import FilterSettings from './filter-settings';
import FontSettings from './font-settings';
import SiteListSettings from './site-list-settings';
import {isFirefox} from '../../../background/utils';
import {Extension} from '../../../definitions';

withForms();

interface BodyProps {
    ext: Extension;
    state: BodyState;
    setState: (state: BodyState) => void;
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
    return (
        <body class={{'ext-disabled': !props.ext.enabled}}>
            <Header ext={props.ext} />

            <TabPanel
                activeTab={state.activeTab || 'Filter'}
                onSwitchTab={(tab) => setState({activeTab: tab})}
                tabs={{
                    'Filter': (
                        <FilterSettings ext={props.ext} />
                    ),
                    'Font': (
                        <FontSettings ext={props.ext} />
                    ),
                    'Site list': (
                        <SiteListSettings ext={props.ext} isFocused={state.activeTab === 'Site list'} />
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
