import { html } from 'malevic';
import withForms from 'malevic/forms';
import { Row, Col, TabPanel, Button, CheckBox } from '../controls';
import TopSection from './top_section';
import FilterSettings from './filter_settings';
import FontSettings from './font_settings';
import SiteListSettings from './site_list_settings';
import { Extension } from '../../background/extension';

withForms();

interface BodyProps {
    ext: Extension;
    activeTab: string;
    onSwitchTab: (tabName: string) => void;
}

export default function Body(props: BodyProps) {

    return (
        <Col id="body">

            <img id="logo" src="../img/dark-reader-type.svg" alt="Dark Reader" />

            <TopSection ext={props.ext} />

            <TabPanel
                activeTab={props.activeTab}
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

            <Col id="footer">
                <p class="description">
                    <span>Some things should not be inverted?</span>
                </p>
                <Button onClick={() => { }}>
                    🛠 Open developer tools
                </Button>
            </Col>

        </Col>
    );
}
