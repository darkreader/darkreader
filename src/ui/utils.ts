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

export function openFile(options: {extensions: string[]}, callback: (content: string) => void) {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    if (options.extensions && options.extensions.length > 0) {
        input.accept = options.extensions.map((ext) => `.${ext}`).join(',');
    }
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result as string);
    input.onchange = () => {
        if (input.files[0]) {
            reader.readAsText(input.files[0]);
            document.body.removeChild(input);
        }
    };
    document.body.appendChild(input);
    input.click();
}

export function saveFile(name: string, content: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content]));
    a.download = name;
    a.click();
}
