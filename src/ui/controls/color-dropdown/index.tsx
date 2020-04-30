import {m} from 'malevic';
import {getContext} from 'malevic/dom';

interface DropDownProps {
    class?: string;
    selected: string;
    hexColor: string;
    onChange: (value: string) => void;
    onColorChange: (value: string) => void;
}

export default function ColorDropDown(props: DropDownProps) {
    const context = getContext();
    const store = context.store as {
        isOpen: boolean;
        listNode: HTMLElement;
        selectedNode: HTMLElement;
    };
    const values = ['Auto', props.hexColor];

    function saveListNode(el: HTMLElement) {
        store.listNode = el;
    }

    function saveSelectedNode(el: HTMLElement) {
        store.selectedNode = el;
    }

    function onSelectedClick() {
        if (store.selectedNode.children[0].children[1] != null) {
            if (store.selectedNode.children[0].children[1].hasAttribute('contentEditable')) {
                return;
            }
        }
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

    function changeColor() {
        const element = document.getElementById('custom_color');
        element.toggleAttribute('contentEditable', true);
        element.focus();
        element.oninput = function () {
            if (!element.innerText.startsWith('#')) {
                element.innerText = '#' + element.innerText;
            } else {
                const element = document.getElementById('color-div__2');
                element.setAttribute('style', 'background-color: ' + element.nextElementSibling.innerHTML);
            }
        };
        element.onblur = function () {
            const temp = element.innerText;
            if (isNaN(Number('0x' + element.innerText.replace('#','')))) {
                element.setAttribute('style', 'color: red');
                element.innerText = 'Not valid hexcolor';
                setTimeout(function () {
                    element.innerText = temp;
                    element.removeAttribute('style');
                    element.focus();
                }, 1500);
            } else {
                element.toggleAttribute('contentEditable', false);
                props.onColorChange(element.innerText);
                setTimeout(function () { // Handy hack to fix something stupids in the renderBody function of the compiler
                    element.innerText = '';
                });
            }
        };
    }

    function createListItem(value: string) {
        if (value.startsWith('#')) {
            return (
                <div style="display: inline-flex">
                    <div class="color-div" id="color-div" style={'background-color: ' + value}/>
                    <span
                        class={{
                            'color-dropdown__list__item': true,
                            [props.class]: props.class != null,
                        }}
                        onclick={() => {
                            store.isOpen = false;
                            context.refresh();
                            props.onChange(value);
                        }}
                    >
                        {value}
                    </span>
                </div>
            );
        } else {
            return (
                <span
                    class={{
                        'color-dropdown__list__item': true,
                        'color-dropdown__list__item--selected': value === props.selected,
                        [props.class]: props.class != null,
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
    }

    return (
        <span
            class={{
                'color-dropdown': true,
                'color-dropdown--open': store.isOpen,
                [props.class]: Boolean(props.class),
            }}
        >
            <span
                class="color-dropdown__list"
                oncreate={saveListNode}
            >
                {values
                    .slice()
                    .sort((a, b) => a === props.selected ? -1 : b === props.selected ? 1 : 0)
                    .map(createListItem)}
            </span>
            <span
                class={props.selected.startsWith('#') ? 'color-dropdown__selected__two' : 'color-dropdown__selected'}
                oncreate={saveSelectedNode}
                onclick={onSelectedClick}
            >
                {props.selected.startsWith('#') ?
                    <div style="display: inline-flex">
                        <div class="color-div__2" id="color-div__2" style={'background-color: ' + props.selected}/>
                        <span
                            class='color-dropdown__selected__text'
                            id='custom_color'
                            onclick={() => changeColor()}>
                            {props.selected}
                        </span>
                    </div> :
                    <span class='color-dropdown__selected__text'>
                        {props.selected}
                    </span>
                }
            </span>
        </span >
    );
}
