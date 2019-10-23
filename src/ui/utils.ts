export function classes(...args: (string | {[cls: string]: boolean})[]) {
    const classes = [];
    args.filter((c) => Boolean(c)).forEach((c) => {
        if (typeof c === 'string') {
            classes.push(c);
        } else if (typeof c === 'object') {
            classes.push(...Object.keys(c).filter((key) => Boolean(c[key])));
        }
    });
    return classes.join(' ');
}

export function compose<T extends Malevic.Component>(type: T, ...wrappers: ((t: T) => T)[]) {
    return wrappers.reduce((t, w) => w(t), type);
}
