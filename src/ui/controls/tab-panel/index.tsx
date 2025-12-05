import {m} from 'malevic';

import Button from '../button';

import Tab from './tab';

interface TabPanelProps {
    tabs: {
        [name: string]: Malevic.Child;
    };
    tabLabels: {
        [name: string]: string;
    };
    activeTab: string;
    onSwitchTab: (name: string) => void;
}

export default function TabPanel(props: TabPanelProps) {
    const tabsNames = Object.keys(props.tabs);

    function isActiveTab(name: string, index: number) {
        return (name == null
            ? index === 0
            : name === props.activeTab
        );
    }

    const buttons = tabsNames.map((name, i) => {
        const btnCls = {
            'tab-panel__button': true,
            'tab-panel__button--active': isActiveTab(name, i),
        };
        return (
            <Button
                class={btnCls}
                onclick={() => props.onSwitchTab(name)}
            >{props.tabLabels[name]}</Button>
        );
    });

    const tabs = tabsNames.map((name, i) => (
        <Tab isActive={isActiveTab(name, i)}>
            {props.tabs[name]}
        </Tab>
    ));

    return (
        <div class="tab-panel">
            <div class="tab-panel__buttons">
                {buttons}
            </div>
            <div class="tab-panel__tabs">
                {tabs}
            </div>
        </div>
    );
}
