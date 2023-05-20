import {m} from 'malevic';

interface MultiSwitchProps {
    class?: string;
    options: string[];
    value: string;
    onChange: (value: string) => void;
}

export default function MultiSwitch(props: MultiSwitchProps, ...children: Malevic.Child[]) {
    return (
        <span class={['multi-switch', props.class]}>
            <span
                class="multi-switch__highlight"
                style={{
                    'left': `${props.options.indexOf(props.value) / props.options.length * 100}%`,
                    'width': `${1 / props.options.length * 100}%`,
                }}
            />
            {props.options.map((option) => (
                <span
                    class={{
                        'multi-switch__option': true,
                        'multi-switch__option--selected': option === props.value,
                    }}
                    onclick={() => option !== props.value && props.onChange(option)}
                >
                    {option}
                </span>
            ))}
            {...children}
        </span>
    );
}
