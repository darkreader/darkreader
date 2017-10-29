import { html } from 'malevic';
import Row from './row';
import Col from './col';
import Button from './button';

function Tab(props: { isActive: boolean; }, ...children) {

    const tabCls = {
        'tab': true,
        'tab--active': props.isActive
    };

    return (
        <Col class={tabCls}>
            {children}
        </Col>
    );
}

interface TabPanelProps {
    tabs: {
        [name: string]: Malevic.NodeDeclaration;
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

    const tabButtons = tabsNames.map((name, i) => {
        const btnCls = {
            'tab-panel__button': true,
            'tab-panel__button--active': isActiveTab(name, i)
        };
        return (
            <Button
                class={btnCls}
                onclick={() => props.onSwitchTab(name)}
            >{name}</Button>
        );
    });

    const tabs = tabsNames.map((name, i) => (
        <Tab isActive={isActiveTab(name, i)}>
            {props.tabs[name]}
        </Tab>
    ));

    return (
        <Col class="tab-panel">
            <Row class="tab-panel__buttons">
                {tabButtons}
            </Row>
            <Row class="tab-panel__container">
                {tabs}
            </Row>
        </Col>
    );
}
