import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import {ControlGroup, TextBox} from '../../controls';
import VirtualScroll from '../../controls/virtual-scroll';

interface SiteListProps {
    siteList: string[];
    onChange: (sites: string[]) => void;
}

interface SiteListStore {
    indices: WeakMap<Node, number>;
    shouldFocusAtIndex: number;
    wasVisible: boolean;
}

export function SiteList(props: SiteListProps): Malevic.Child {
    const context = getContext();
    const store: SiteListStore = context.store;
    if (!context.prev) {
        store.indices = new WeakMap();
        store.shouldFocusAtIndex = -1;
        store.wasVisible = false;
    }

    context.onRender((node: HTMLElement) => {
        const isVisible = node.clientWidth > 0;
        const {wasVisible} = store;
        store.wasVisible = isVisible;
        if (!wasVisible && isVisible) {
            store.shouldFocusAtIndex = props.siteList.length;
            context.refresh();
        }
    });

    function onTextChange(e: Event & {target: HTMLInputElement}) {
        const index = store.indices.get(e.target)!;
        const values = props.siteList.slice();
        const value = e.target.value.trim();
        if (values.includes(value)) {
            return;
        }

        if (!value) {
            values.splice(index, 1);
            store.shouldFocusAtIndex = index;
        } else if (index === values.length) {
            values.push(value);
            store.shouldFocusAtIndex = index + 1;
        } else {
            values.splice(index, 1, value);
            store.shouldFocusAtIndex = index + 1;
        }

        props.onChange(values);
    }

    function removeValue(event: MouseEvent) {
        const previousSibling = ((event.target as HTMLInputElement).previousSibling as HTMLInputElement);
        const index = store.indices.get(previousSibling)!;
        const filtered = props.siteList.slice();
        filtered.splice(index, 1);
        store.shouldFocusAtIndex = index;
        props.onChange(filtered);
    }

    function createTextBox(text: string, index: number) {
        const onRender = (node: HTMLInputElement) => {
            store.indices.set(node, index);
            if (store.shouldFocusAtIndex === index) {
                store.shouldFocusAtIndex = -1;
                node.focus();
            }
        };

        return (
            <div class="site-list__item">
                <TextBox
                    class="site-list__textbox"
                    value={text}
                    onrender={onRender}
                    placeholder="google.com/maps"
                />
                {text ? <span
                    class="site-list__item__remove"
                    role="button"
                    onclick={removeValue}
                /> : null}
            </div>
        );
    }

    const virtualScroll = <VirtualScroll
        root={(
            <div
                class="site-list__v-scroll-root"
                onchange={onTextChange}
            />
        )}
        items={props.siteList
            .map((site, index) => createTextBox(site, index))
            .concat(createTextBox('', props.siteList.length))}
        scrollToIndex={store.shouldFocusAtIndex}
    />;

    return (
        <ControlGroup class="site-list-group">
            <ControlGroup.Control class="site-list-group__control">
                <div class="site-list">
                    {virtualScroll}
                </div>
            </ControlGroup.Control>
            <ControlGroup.Description class="site-list-group__description">
                Type in the domain name and press Enter
            </ControlGroup.Description>
        </ControlGroup>
    );
}
