import { m } from 'malevic';

export function compileMarkdown(markdown: string) {
    return markdown
        .split('**')
        .map((text, i) => (i % 2 ? <strong>{text}</strong> : text));
}
