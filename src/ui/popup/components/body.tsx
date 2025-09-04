import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import {withForms} from 'malevic/forms';
import {withState, useState} from 'malevic/state';

import type {ExtensionData, ExtensionActions} from '../../../definitions';
import {getLocalMessage} from '../../../utils/locales';
import {isMobile} from '../../../utils/platform';
import {TabPanel} from '../../controls';
import {compose} from '../../utils';
import NewBody from '../body';

import FilterSettings from './filter-settings';
import {Header} from './header';
import Loader from './loader';
import MoreSettings from './more-settings';
import SiteListSettings from './site-list-settings';

declare const __THUNDERBIRD__: boolean;

interface BodyProps {
  data: ExtensionData;
  actions: ExtensionActions;
}

interface BodyState {
  activeTab: string;
  mobileLinksOpen: boolean;
  didMobileLinksSlideIn: boolean;
  moreSiteSettingsOpen: boolean;
  moreToggleSettingsOpen: boolean;
  newToggleMenusHighlightHidden: boolean;
}

function Body(
    props: BodyProps & { fonts: string[] } & {
    installation: { date: number; version: string };
  }
) {
    const context = getContext();
    const {state, setState} = useState<BodyState>({
        activeTab: 'Filter',
        mobileLinksOpen: false,
        didMobileLinksSlideIn: false,
        moreSiteSettingsOpen: false,
        moreToggleSettingsOpen: false,
        newToggleMenusHighlightHidden: false,
    });

    if (!props.data.isReady) {
        return (
            <body>
                <Loader complete={false} />
            </body>
        );
    }

    if (isMobile || props.data.settings.previewNewDesign) {
        return <NewBody {...props} fonts={props.fonts} />;
    }

    context.onRender(() => {
        if (
            props.data.uiHighlights.includes('mobile-links') &&
      !state.mobileLinksOpen &&
      !state.didMobileLinksSlideIn
        ) {
            setTimeout(toggleMobileLinks, 750);
        }
    });

    function toggleMobileLinks() {
        setState({
            mobileLinksOpen: !state.mobileLinksOpen,
            didMobileLinksSlideIn:
        state.didMobileLinksSlideIn || !state.mobileLinksOpen,
        });
        if (
            state.mobileLinksOpen &&
      props.data.uiHighlights.includes('mobile-links')
        ) {
            disableMobileLinksSlideIn();
        }
    }

    function disableMobileLinksSlideIn() {
        if (props.data.uiHighlights.includes('mobile-links')) {
            props.actions.hideHighlights(['mobile-links']);
        }
    }

    function toggleMoreSiteSettings() {
        setState({
            moreSiteSettingsOpen: !state.moreSiteSettingsOpen,
            moreToggleSettingsOpen: false,
            newToggleMenusHighlightHidden: true,
        });
        if (props.data.uiHighlights.includes('new-toggle-menus')) {
            props.actions.hideHighlights(['new-toggle-menus']);
        }
    }

    function toggleMoreToggleSettings() {
        setState({
            moreToggleSettingsOpen: !state.moreToggleSettingsOpen,
            moreSiteSettingsOpen: false,
            newToggleMenusHighlightHidden: true,
        });
        if (props.data.uiHighlights.includes('new-toggle-menus')) {
            props.actions.hideHighlights(['new-toggle-menus']);
        }
    }

    const filterTab = (
        <FilterSettings data={props.data} actions={props.actions}></FilterSettings>
    );

    const moreTab = (
        <MoreSettings
            data={props.data}
            actions={props.actions}
        />
    );

    return (
        <body class={{'ext-disabled': !props.data.isEnabled}}>
            <Loader complete />

            <Header
                data={props.data}
                actions={props.actions}
                onMoreSiteSettingsClick={toggleMoreSiteSettings}
                onMoreToggleSettingsClick={toggleMoreToggleSettings}
            />

            <TabPanel
                activeTab={state.activeTab}
                onSwitchTab={(tab) => setState({activeTab: tab})}
                tabs={
                    __THUNDERBIRD__
                        ? {
                            Filter: filterTab,
                            More: moreTab,
                        }
                        : {
                            Filter: filterTab,
                            'Site list': (
                                <SiteListSettings
                                    data={props.data}
                                    actions={props.actions}
                                    isFocused={state.activeTab === 'Site list'}
                                />
                            ),
                            More: moreTab,
                        }
                }
                tabLabels={{
                    Filter: getLocalMessage('filter'),
                    'Site list': getLocalMessage('site_list'),
                    More: getLocalMessage('more'),
                }}
            />
        </body>
    );
}

export default compose(Body, withState, withForms);
