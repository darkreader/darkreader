import {m} from 'malevic';

interface TabProps {
    isActive: boolean;
}

export default function Tab({isActive}: TabProps, ...children: Malevic.Child[]) {
    const tabCls = {
        'tab-panel__tab': true,
        'tab-panel__tab--active': isActive,
    };

    return (
        <div class={tabCls}>
            {children}
        </div>
    );
}
