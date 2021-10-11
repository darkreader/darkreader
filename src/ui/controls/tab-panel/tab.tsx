import {m} from 'malevic';

export default function Tab({isActive}: {isActive: boolean}, ...children: Array<Malevic.Child>) {
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
