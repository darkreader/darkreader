import {html, render, getData} from 'malevic';
import withState from 'malevic/state';
import Button from '../button';
import TextBox from '../textbox';
import VirtualScroll from '../virtual-scroll';

interface SelectProps {
    value: string;
    options: {
        [value: string]: Malevic.NodeDeclaration;
    };
    onChange: (value: string) => void;
    state?: SelectState;
    setState?: (state: SelectState) => void;
}

interface SelectState {
    isExpanded?: boolean;
    focusedIndex?: number;
}

const valueNodes = new WeakMap<Element, Map<string, Element>>();

function Select(props: SelectProps) {
    const {state, setState} = props;
    const values = Object.keys(props.options);

    let rootNode: Element;

    function onRender(node) {
        rootNode = node;
        if (!valueNodes.has(rootNode)) {
            valueNodes.set(rootNode, new Map());
        }
    }

    function onOuterClick(e: MouseEvent) {
        const r = rootNode.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
            window.removeEventListener('click', onOuterClick);
            collapseList();
        }
    }

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

    function onKeyPress(e: KeyboardEvent) {
        const input = e.target as HTMLInputElement;
        if (e.key === 'Enter') {
            const value = input.value;
            input.blur();
            collapseList();
            props.onChange(value);
        }
    }

    function scrollToValue(value: string) {
        setState({focusedIndex: values.indexOf(value)});
    }

    function onExpandClick() {
        if (state.isExpanded) {
            collapseList();
        } else {
            expandList();
        }
    }

    function expandList() {
        setState({isExpanded: true});
        scrollToValue(props.value);
        window.addEventListener('click', onOuterClick);
    }

    function collapseList() {
        setState({isExpanded: false});
    }

    function onSelectOption(e: MouseEvent) {
        let current = e.target as HTMLElement;
        while (current && !current.matches('.select__option')) {
            current = current.parentElement;
        }

        if (current) {
            const value = getData(current);
            props.onChange(value);
        }

        collapseList();
    }

    function saveValueNode(value, domNode) {
        valueNodes.get(rootNode).set(value, domNode);
    }

    function removeValueNode(value) {
        valueNodes.get(rootNode).delete(value);
    }

    return (
        <span class="select" didmount={onRender} didupdate={onRender}>
            <span class="select__line">
                <TextBox
                    class="select__textbox"
                    value={props.value}
                    oninput={onTextInput}
                    onkeypress={onKeyPress}
                />
                <Button
                    class="select__expand"
                    onclick={onExpandClick}
                >
                    <span class="select__expand__icon"></span>
                </Button>
            </span>
            <VirtualScroll
                root={<span
                    class={{
                        'select__list': true,
                        'select__list--expanded': state.isExpanded,
                        'select__list--short': Object.keys(props.options).length <= 7,
                    }}
                    onclick={onSelectOption}
                />}
                items={Object.entries(props.options).map(([value, content]) => (
                    <span
                        class="select__option"
                        data={value}
                        didmount={(domNode) => saveValueNode(value, domNode)}
                        didupdate={(domNode) => saveValueNode(value, domNode)}
                        willunmount={() => removeValueNode(value)}
                    >
                        {content}
                    </span>
                ))}
                scrollToIndex={state.focusedIndex}
            />
        </span>
    );
}

export default withState(Select);
