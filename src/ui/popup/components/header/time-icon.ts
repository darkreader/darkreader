export default function getTimeIcon() {
    const time = new Date();
    const hours = time.getHours();
    const minutes = time.getMinutes();

    const cx = 8;
    const cy = 8;
    const lh = 5;
    const lm = 7;
    const ah = ((hours > 11 ? hours - 12 : hours) + minutes / 60) / 12 * Math.PI * 2;
    const am = minutes / 60 * Math.PI * 2;
    const hx = cx + lh * Math.sin(ah);
    const hy = cy - lh * Math.cos(ah);
    const mx = cx + lm * Math.sin(am);
    const my = cy - lm * Math.cos(am);

    return [
        `url('`,
        `data:image/svg+xml;utf-8,`,
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">`,
        `<path fill="none" stroke="white" stroke-width="2" d="M${hx},${hy} L${cx},${cy} L${mx},${my}" />`,
        `</svg>`,
        `')`,
    ].join('');
}
