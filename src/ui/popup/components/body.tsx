import {html} from 'malevic';
import withForms from 'malevic/forms';
import withState from 'malevic/state';
import {TabPanel, Button, CheckBox} from '../../controls';
import TopSection from './top-section';
import FilterSettings from './filter-settings';
import FontSettings from './font-settings';
import SiteListSettings from './site-list-settings';
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

function Body(props: BodyProps) {
    const {state, setState} = props;
    return (
        <body class={{'ext-disabled': !props.ext.enabled}}>
            <header>
                <img id="logo" src="../assets/images/dark-reader-type.svg" alt="Dark Reader" />
                <TopSection ext={props.ext} />
            </header>

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
                <Button onClick={() => {}}>
                    🛠 Open developer tools
                </Button>
            </footer>
        </body>
    );
}

export default withState(Body);
