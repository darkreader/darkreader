import {m} from 'malevic';

interface TrackProps {
    value: number;
    label: string;
    onChange?: (value: number) => void;
}

export default function Track(props: TrackProps) {
    const valueStyle = {'width': `${props.value * 100}%`};
    const isClickable = Boolean(props.onChange);

    function onMouseDown(e: MouseEvent) {
        const targetNode = e.currentTarget as HTMLElement;
        const valueNode = targetNode.firstElementChild as HTMLElement;
        targetNode.classList.add('track--active');

        function getValue(clientX: number) {
            const rect = targetNode.getBoundingClientRect();
            return (clientX - rect.left) / rect.width;
        }

        function setWidth(value: number) {
            valueNode.style.width = `${value * 100}%`;
        }

        function onMouseMove(e: MouseEvent) {
            const value = getValue(e.clientX);
            setWidth(value);
        }

        function onMouseUp(e: MouseEvent) {
            const value = getValue(e.clientX);
            props.onChange!(value);
            cleanup();
        }

        function onKeyPress(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setWidth(props.value);
                cleanup();
            }
        }

        function cleanup() {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('keypress', onKeyPress);
            targetNode.classList.remove('track--active');
        }

        window.addEventListener('mousemove', onMouseMove, {passive: true});
        window.addEventListener('mouseup', onMouseUp, {passive: true});
        window.addEventListener('keypress', onKeyPress, {passive: true});

        const value = getValue(e.clientX);
        setWidth(value);
    }

    return (
        <span
            class={{
                'track': true,
                'track--clickable': Boolean(props.onChange),
            }}
            onmousedown={isClickable ? onMouseDown : undefined}
        >
            <span class="track__value" style={valueStyle}></span>
            <label class="track__label">
                {props.label}
            </label>
        </span >
    );
}
