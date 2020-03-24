import {m} from 'malevic';
import {getContext} from 'malevic/dom';

interface DropDownProps {
    selected: string;
    values: string[];
    onChange: (value: string) => void;
}

export default function DropDown(props: DropDownProps) {
    const context = getContext();
    const store = context.store as {
        isOpen: boolean;
        listNode: HTMLElement;
        selectedNode: HTMLElement;
    };

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
                window.removeEventListener('mousedown', onOuterClick, false);

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
            window.addEventListener('mousedown', onOuterClick, false);
        }
    }

    function createListItem(value: string) {
        return (
            <span
                class={{
                    'dropdown__list__item': true,
                    'dropdown__list__item--selected': value === props.selected,
                }}
                onclick={() => {
                    store.isOpen = false;
                    context.refresh();
                    props.onChange(value);
                }}
            >
                {value}
            </span>
        );
    }

    return (
        <span
            class={{
                'dropdown': true,
                'dropdown--open': store.isOpen,
            }}
        >
            <span
                class="dropdown__list"
                oncreate={saveListNode}
            >
                {props.values
                    .slice()
                    .sort((a, b) => a === props.selected ? -1 : b === props.selected ? 1 : 0)
                    .map(createListItem)}
            </span>
            <span
                class="dropdown__selected"
                oncreate={saveSelectedNode}
                onclick={onSelectedClick}
            >
                <span class="dropdown__selected__text">
                    {props.selected}
                </span>
            </span>
        </span >
    );
}
