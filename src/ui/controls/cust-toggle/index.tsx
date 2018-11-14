import {html} from 'malevic';

interface CustToggleProps {
    checked: boolean;
    class?: string;
    labelOn: string;
    labelOff: string;
    onChange: (checked: boolean) => void;
    //onChange: (name: string) => void;
    //try: (name: string) => void; 
        
    
}
var str = 'test';
function printTest() {
    console.log(2);
    
}

export default function CustToggle(props: CustToggleProps) {
    const {checked, onChange} = props;

    const cls = {
        'toggle': true,
        'toggle--checked': checked,
        [props.class]: props.class
    };

    const clsOn = {
        'toggle__btn': true,
        'toggle__on': true,
        'toggle__btn--active': checked
    };

    const clsOff = {
        'toggle__btn': true,
        'toggle__off': true,
        'toggle__btn--active': !checked
    };

    printTest();

    return (
        <span class={cls}>
            <span
                class={clsOn}
                onclick={onChange ? () => !checked && onChange(true) : null}
            >
                {props.labelOn}
                {printTest}
            </span>
            <span
                class={clsOff}
                onclick={onChange ? () => checked && onChange(false) : null}
            >
                {props.labelOff}
                {printTest}
            </span>
        </span>
    );
    
}
