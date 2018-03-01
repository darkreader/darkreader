import {html, sync, getData} from 'malevic';
import withState from 'malevic/state';
import Button from '../button';
import TextBox from '../textbox';

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
}

function Select(props: SelectProps) {
    const {state, setState} = props;
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

    function scrollToValue(value: string) {
        if (valueNodes.has(value)) {
            valueNodes.get(value).scrollIntoView(true)
        }
    }

    function expandList() {
        if (state.isExpanded) {
            return;
        }

        scrollToValue(props.value);
        setState({isExpanded: true});
        requestAnimationFrame(() => {
            function onOuterClick() {
                window.removeEventListener('click', onOuterClick);
                collapseList();
            }
            window.addEventListener('click', onOuterClick);
        });
    }

    function collapseList() {
        setState({isExpanded: false});
    }

    function onSelectOption(e: MouseEvent) {
        let current = e.target as HTMLElement;
        while (!current.matches('.select__option')) {
            current = current.parentElement;
        }
        const value = getData(current);

        props.onChange(value);

        collapseList();
    }

    const valueNodes = new Map<string, Element>();

    function saveValueNode(value, domNode) {
        valueNodes.set(value, domNode);
    }

    function removeValueNode(value) {
        valueNodes.delete(value);
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
                class={{
                    'select__list': true,
                    'select__list--expanded': state.isExpanded,
                }}
                onclick={onSelectOption}
            >
                {Object.entries(props.options).map(([value, content]) => (
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
            </span>
        </span>
    );
}

export default withState(Select);
