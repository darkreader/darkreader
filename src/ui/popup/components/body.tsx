import {html} from 'malevic';
import withForms from 'malevic/forms';
import {TabPanel, Button, CheckBox} from '../../controls';
import TopSection from './top-section';
import FilterSettings from './filter-settings';
import FontSettings from './font_settings';
import SiteListSettings from './site_list_settings';
import {Extension} from '../../../definitions';

withForms();

interface BodyProps {
    ext: Extension;
    activeTab: string;
    onSwitchTab: (tabName: string) => void;
}

export default function Body(props: BodyProps) {
    return (
        <body class={{'ext-disabled': !props.ext.enabled}}>
            <header>
                <img id="logo" src="../assets/images/dark-reader-type.svg" alt="Dark Reader" />
                <TopSection ext={props.ext} />
            </header>

            <TabPanel
                activeTab={props.activeTab || 'Filter'}
                onSwitchTab={props.onSwitchTab}
                tabs={{
                    'Filter': (
                        <FilterSettings ext={props.ext} />
                    ),
                    'Font': (
                        <FontSettings ext={props.ext} />
                    ),
                    'Site list': (
                        <SiteListSettings ext={props.ext} />
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
