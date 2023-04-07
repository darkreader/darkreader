import {m} from 'malevic';

export default function MoreNewHighlight() {
    const a1 = {x: 244, y: 26};
    const aq = {x: 144, y: 26};
    const a2 = {x: 128, y: 8};

    const b1 = {x: 244, y: 22};
    const bq = {x: 208, y: 22};
    const b2 = {x: 200, y: 8};

    const r = 2;

    return (
        <div class="header__more-new-highlight">
            <svg class="header__more-new-highlight__lines" viewBox="0 0 272 32" width="272" height="32">
                <path d={`M${a1.x},${a1.y} Q${aq.x},${aq.y} ${a2.x},${a2.y}`} />
                <path d={`M${b1.x},${b1.y} Q${bq.x},${bq.y} ${b2.x},${b2.y}`} />
                <circle cx={a2.x} cy={a2.y} r={r} />
                <circle cx={b2.x} cy={b2.y} r={r} />
            </svg>
            <span class="header__more-new-highlight__text">New</span>
        </div>
    );
}
