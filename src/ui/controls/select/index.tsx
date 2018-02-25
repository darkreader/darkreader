import {html, sync} from 'malevic';
import Row from '../row';
import Col from '../col';
import Button from '../button';
import TextBox from '../textbox';

interface SelectProps {
    value: string;
    options: {
        [value: string]: Malevic.NodeDeclaration;
    };
    onChange: (value: string) => void;
}

export default function Select(props: SelectProps) {

    const values = Object.keys(props.options);

    function onTextInput(e: Event) {
        const text = (e.target as HTMLInputElement)
            .value
            .toLowerCase()
            .trim();

        expandList();

        values.some((value) => {
            if (value.toLowerCase().indexOf(text) === 0) {
                scrollToValue(value);
                return true;
            }
        });
    }

    let listDOMNode: HTMLElement;

    function saveListDOMNode(node) {
        listDOMNode = node;
    }

    function scrollToValue(value: string) {
        listDOMNode
            .querySelector(`.select__option[data-value="${value}"]`)
            .scrollIntoView(true);
    }

    function expandList() {
        if (listDOMNode.classList.contains('select__list--expanded')) {
            return;
        }

        listDOMNode.classList.add('select__list--expanded');
        if (listDOMNode.childElementCount === 0) {
            renderOptions();
        } else {
            scrollToValue(props.value);
        }

        function onOuterClick() {
            window.removeEventListener('click', onOuterClick);
            collapseList();
        }

        window.addEventListener('click', onOuterClick);
    }

    function renderOptions() {
        listDOMNode.classList.add('select__list--loading');

        requestAnimationFrame(() => {
            const fragment = document.createDocumentFragment();
            values.forEach((value) => {
                const item = sync(document.createElement('span'), (
                    <span class="select__option" data-value={value}>
                        {props.options[value]}
                    </span>
                ));
                fragment.appendChild(item);
            });
            listDOMNode.appendChild(fragment);

            listDOMNode.classList.remove('select__list--loading');
            scrollToValue(props.value);
        });
    }

    function collapseList() {
        listDOMNode.classList.remove('select__list--expanded');
    }

    function onSelectOption(e: MouseEvent) {
        let current = e.target as HTMLElement;
        while (!current.matches('.select__option')) {
            current = current.parentElement;
        }
        const value = current.dataset['value'];

        props.onChange(value);

        collapseList();
    }

    return (
        <span class="select">
            <span class="select__line">
                <TextBox
                    class="select__textbox"
                    value={props.value}
                    oninput={onTextInput}
                />
                <Button
                    class="select__expand"
                    onclick={expandList}
                >
                    <span class="select__expand__icon"></span>
                </Button>
            </span>
            <span
                class="select__list"
                native
                didmount={saveListDOMNode}
                didupdate={saveListDOMNode}
            ></span>
        </span>
    );
}
