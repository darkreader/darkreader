import {parseCSS} from '../../../src/utils/css-text/parse-css';
import {parseGradient} from '../../../src/utils/css-text/parse-gradient';

test('Parse CSS', () => {
    const cssText = '@media all { div { } img[src*="a,b;c"] { background-color: black; background-image: url(data:image/gif;base64,XYZ); color: red !important; } } @media print, screen and (min-width: 20rem) { h1, h2 { } } c-wiz[data-p^="%.@.[[1,3"] { color: green; }';
    const parsedCSS = parseCSS(cssText);
    expect(parsedCSS).toEqual([
        {
            type: '@media',
            query: 'all',
            rules: [
                {
                    selectors: ['div'],
                    declarations: [],
                },
                {
                    selectors: ['img[src*="a,b;c"]'],
                    declarations: [
                        {
                            property: 'background-color',
                            value: 'black',
                            important: false,
                        },
                        {
                            property: 'background-image',
                            value: 'url(data:image/gif;base64,XYZ)',
                            important: false,
                        },
                        {
                            property: 'color',
                            value: 'red',
                            important: true,
                        },
                    ],
                },
            ],
        },
        {
            type: '@media',
            query: 'print, screen and (min-width: 20rem)',
            rules: [
                {
                    selectors: ['h1', 'h2'],
                    declarations: [],
                },
            ],
        },
        {
            selectors: ['c-wiz[data-p^="%.@.[[1,3"]'],
            declarations: [
                {
                    property: 'color',
                    value: 'green',
                    important: false,
                },
            ],
        },
    ]);
});

test('type gradients', () => {
    expect(parseGradient('linear-gradient(rgb(200))')).toEqual([{
        typeGradient: 'linear-gradient',
        match: 'rgb(200)',
        offset: 17,
        index: 0,
        hasComma: false,
    }]);
    expect(parseGradient(`linear-gradient(217deg, rgba(255,0,0,.8), rgba(255,0,0,0) 70.71%),
    linear-gradient(127deg, rgba(0,255,0,.8), rgba(0,255,0,0) 70.71%),
    linear-gradient(336deg, rgba(0,0,255,.8), rgba(0,0,255,0) 70.71%);`)).toEqual([
        {
            offset: 17,
            match: '217deg, rgba(255,0,0,.8), rgba(255,0,0,0) 70.71%',
            hasComma: true,
            index: 0,
            typeGradient: 'linear-gradient',
        },
        {
            typeGradient: 'linear-gradient',
            match: '127deg, rgba(0,255,0,.8), rgba(0,255,0,0) 70.71%',
            hasComma: true,
            offset: 17,
            index: 71,
        },
        {
            typeGradient: 'linear-gradient',
            match: '336deg, rgba(0,0,255,.8), rgba(0,0,255,0) 70.71%',
            hasComma: false,
            offset: 17,
            index: 142,
        },
    ]);
    expect(parseGradient('radial-gradient(rgb(200))')).toEqual([{
        typeGradient: 'radial-gradient',
        match: 'rgb(200)',
        index: 0,
        offset: 17,
        hasComma: false,

    }]);

    expect(parseGradient('repeating-linear-gradient(transparent, #4d9f0c 40px), repeating-linear-gradient(0.25turn, transparent, #3f87a6 20px);')).toEqual([
        {
            typeGradient: 'repeating-linear-gradient',
            match: 'transparent, #4d9f0c 40px',
            hasComma: true,
            offset: 27,
            index: 0,
        },
        {
            typeGradient: 'repeating-linear-gradient',
            match: '0.25turn, transparent, #3f87a6 20px',
            hasComma: false,
            index: 54,
            offset: 27,
        },
    ]);
});
