import {getAbsoluteURL} from '../../src/inject/dynamic-theme/url';

test('Absolute URL', () => {
    expect(getAbsoluteURL('https://www.google.com', 'image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('https://www.google.com', '/image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path', '/image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('//www.google.com', '/image.jpg')).toBe(`${location.protocol}//www.google.com/image.jpg`);
    expect(getAbsoluteURL('https://www.google.com', 'image.jpg?size=128')).toBe('https://www.google.com/image.jpg?size=128');
    expect(getAbsoluteURL('https://www.google.com/path', 'image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path/', 'image.jpg')).toBe('https://www.google.com/path/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/long/path', '../image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/long/path/', '../image.jpg')).toBe('https://www.google.com/long/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/long/path/', '../another/image.jpg')).toBe('https://www.google.com/long/another/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path/page.html', 'image.jpg')).toBe('https://www.google.com/path/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path/page.html', '/image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('https://www.google.com', '//www.google.com/path/image.jpg')).toBe('https://www.google.com/path/image.jpg');
    expect(getAbsoluteURL('https://www.google.com', '//www.google.com/path/../another/image.jpg')).toBe('https://www.google.com/another/image.jpg');
    expect(getAbsoluteURL('https://www.google.com', 'https://www.google.com/path/image.jpg')).toBe('https://www.google.com/path/image.jpg');
    expect(getAbsoluteURL('https://www.google.com', 'https://www.google.com/path/../another/image.jpg')).toBe('https://www.google.com/another/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path/page.html', 'image.jpg')).toBe('https://www.google.com/path/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path/page.html', '../image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('path/index.html', 'image.jpg')).toBe(`${location.origin}/path/image.jpg`);
    expect(getAbsoluteURL('path/index.html', '/image.jpg?size=128')).toBe(`${location.origin}/image.jpg?size=128`);
});
