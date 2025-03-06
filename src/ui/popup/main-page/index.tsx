import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {NavButton} from '../../controls';

import AppSwitch from './app-switch';
import HelpGroup from './help';
import SiteToggleGroup from './site-toggle';
import ThemeGroup from './theme-group';

function SwitchGroup(props: ViewProps) {
    return (
        <Array>
            <AppSwitch {...props} />
            <SiteToggleGroup {...props} />
        </Array>
    );
}

function SettingsNavButton(props: {onClick: () => void}) {
    return (
        <NavButton onClick={props.onClick}>
            <span class="settings-button-icon" />
            Settings
        </NavButton>
    );
}

type MainPageProps = ViewProps & {
    onThemeNavClick: () => void;
    onSettingsNavClick: () => void;
};

export default function MainPage(props: MainPageProps) {
    return (
        <Array>
            <section class="m-section">
                <SwitchGroup {...props} />
            </section>
            <section class="m-section">
                <ThemeGroup {...props} />
            </section>
            <section class="m-section">
                <SettingsNavButton onClick={props.onSettingsNavClick} />
                <HelpGroup />
            </section>
        </Array>
    );
}
