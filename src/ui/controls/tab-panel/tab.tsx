import {m} from 'malevic';

export default function Tab({isActive}, ...children) {
    const tabCls = {
        'tab-panel__tab': true,
        'tab-panel__tab--active': isActive
    };

    return (
        <div class={tabCls}>
            {children}
        </div>
    );
}
