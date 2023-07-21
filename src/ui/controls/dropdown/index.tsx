import {m} from 'malevic';
import {getContext} from 'malevic/dom';

export type DropDownOption<T> = {id: T; content: Malevic.Child};

interface DropDownProps<T> {
    class?: string;
    selected: T;
    options: Array<DropDownOption<T>>;
    onChange: (value: T) => void;
}

interface DropDownStore {
    isOpen: boolean;
    listNode: HTMLElement;
    selectedNode: HTMLElement;
}

export default function DropDown<T>(props: DropDownProps<T>) {
    const context = getContext();
    const store: DropDownStore = context.store;

    if (context.prev) {
        const currOptions = props.options.map((o) => o.id);
        const prevOptions = (context.prev.props.options as Array<DropDownOption<T>>).map((o) => o.id);
        if (currOptions.length !== prevOptions.length || currOptions.some((o, i) => o !== prevOptions[i])) {
            store.isOpen = false;
        }
    }

    function saveListNode(el: HTMLElement) {
        store.listNode = el;
    }

    function saveSelectedNode(el: HTMLElement) {
        store.selectedNode = el;
    }

    function onSelectedClick() {
        store.isOpen = !store.isOpen;
        context.refresh();

        if (store.isOpen) {
            const onOuterClick = (e: MouseEvent) => {
                window.removeEventListener('mousedown', onOuterClick);

                const listRect = store.listNode.getBoundingClientRect();
                const ex = e.clientX;
                const ey = e.clientY;
                if (
                    ex < listRect.left ||
                    ex > listRect.right ||
                    ey < listRect.top ||
                    ey > listRect.bottom
                ) {
                    store.isOpen = false;
                    context.refresh();
                }
            };

            window.addEventListener('mousedown', onOuterClick, {passive: true});
        }
    }

    function createListItem(value: DropDownOption<T>) {
        return (
            <span
                class={{
                    'dropdown__list__item': true,
                    'dropdown__list__item--selected': value.id === props.selected,
                    [props.class!]: Boolean(props.class),
                }}
                onclick={() => {
                    store.isOpen = false;
                    context.refresh();
                    props.onChange(value.id);
                }}
            >
                {value.content}
            </span>
        );
    }

    const selectedContent = props.options.find((value) => value.id === props.selected)!.content;

    return (
        <span
            class={{
                'dropdown': true,
                'dropdown--open': store.isOpen,
                [props.class!]: Boolean(props.class),
            }}
        >
            <span
                class="dropdown__list"
                oncreate={saveListNode}
            >
                {props.options
                    .slice()
                    .sort((a, b) => a.id === props.selected ? -1 : b.id === props.selected ? 1 : 0)
                    .map(createListItem)}
            </span>
            <span
                class="dropdown__selected"
                oncreate={saveSelectedNode}
                onclick={onSelectedClick}
            >
                <span class="dropdown__selected__text">
                    {selectedContent}
                </span>
            </span>
        </span >
    );
}
