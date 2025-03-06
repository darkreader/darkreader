import {m} from 'malevic';

import {Button} from '../../controls';

interface TabPanelProps {
    activeTabId: string;
    isVertical?: boolean;
    onTabChange: (tabId: string) => void;
}

interface TabProps {
    id: string;
    label: string;
    isActive?: boolean;
    icon?: Malevic.Child;
    iconClass?: string;
    onClick?: () => void;
}

function TabPanel(props: TabPanelProps, ...children: Array<Malevic.ComponentSpec<TabProps>>) {
    const {activeTabId} = props;

    function createTabButton(tabSpec: Malevic.ComponentSpec<TabProps>) {
        const {id, label, icon, iconClass = ''} = tabSpec.props;

        function onClick() {
            props.onTabChange(id);
        }

        return <Button
            class={{
                'settings-tab-panel__button': true,
                'settings-tab-panel__button--active': activeTabId === id,
            }}
            onclick={tabSpec.props.onClick ?? onClick}
        >
            <span class={{
                'settings-tab-panel__button__icon': true,
                [iconClass]: Boolean(iconClass),
            }}>
                {icon}
            </span>
            {label}
        </Button>;
    }

    return (
        <div class={{'settings-tab-panel': true, 'settings-tab-panel--vertical': props.isVertical}}>
            <div class="settings-tab-panel__buttons">
                {...children.map(createTabButton)}
            </div>
            <div class="settings-tab-panel__tabs">
                {...children.map((child) => {
                    const {id} = child.props;
                    const spec: Malevic.ComponentSpec<TabProps> = {
                        ...child,
                        props: {
                            ...child.props,
                            isActive: id === activeTabId,
                        },
                    };
                    return spec;
                })}
            </div>
        </div>
    );
}

function Tab(props: TabProps, ...children: Malevic.Child[]) {
    return (
        <div
            class={{
                'settings-tab-panel__tab': true,
                'settings-tab-panel__tab--active': props.isActive,
            }}
        >
            {props.isActive ? children : null}
        </div>
    );
}

export default Object.assign(TabPanel, {Tab});
