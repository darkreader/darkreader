import {m} from 'malevic';
import {getContext} from 'malevic/dom';

interface CollapsiblePanelStore {
    activeGroup: string;
}

function CollapsiblePanel({}, ...groups: Array<Malevic.ComponentSpec<CollapsibleGroupProps>>) {
    const context = getContext();
    const store: CollapsiblePanelStore = context.store;
    if (store.activeGroup == null) {
        store.activeGroup = groups[0].props.id;
    }
    return (
        <div class="collapsible-panel">
            {...groups.map((spec, i) => {
                const activeIndex = groups.findIndex((g) => store.activeGroup === g.props.id);
                const collapsed = i !== activeIndex;
                const collapseTop = i < activeIndex;
                const collapseBottom = i > activeIndex;
                const onExpand = () => {
                    store.activeGroup = spec.props.id;
                    context.refresh();
                };

                return {
                    ...spec,
                    props: {
                        ...spec.props,
                        collapsed,
                        collapseBottom,
                        collapseTop,
                        onExpand,
                    },
                };
            })}
        </div>
    );
}

interface CollapsibleGroupProps {
    id: string;
    label: string;
    collapsed?: boolean;
    collapseBottom?: boolean;
    collapseTop?: boolean;
    onExpand?: () => void;
}

function Group(props: CollapsibleGroupProps, content: Malevic.Child) {
    return (
        <div
            class={{
                'collapsible-panel__group': true,
                'collapsible-panel__group--collapsed': props.collapsed,
                'collapsible-panel__group--collapse-top': props.collapseTop,
                'collapsible-panel__group--collapse-bottom': props.collapseBottom,
            }}
        >
            <div class="collapsible-panel__group__content">
                {content}
            </div>
            <span role="button" class="collapsible-panel__group__expand-button" onclick={props.onExpand}>
                {props.label}
            </span>
        </div>
    );
}

export default Object.assign(CollapsiblePanel, {Group});
