import {parseGradient} from '../../src/utils/parsing';

test('type gradients', () => {
    expect(parseGradient('linear-gradient(rgb(200))')).toEqual([{
        type: 'linear-gradient',
        content: 'rgb(200)',
        hasComma: false,
    }]);
    expect(parseGradient(`linear-gradient(217deg, rgba(255,0,0,.8), rgba(255,0,0,0) 70.71%),
    linear-gradient(127deg, rgba(0,255,0,.8), rgba(0,255,0,0) 70.71%),
    linear-gradient(336deg, rgba(0,0,255,.8), rgba(0,0,255,0) 70.71%);`)).toEqual([
        {
            type: 'linear-gradient',
            content: '217deg, rgba(255,0,0,.8), rgba(255,0,0,0) 70.71%',
            hasComma: true,
        },
        {
            type: 'linear-gradient',
            content: '127deg, rgba(0,255,0,.8), rgba(0,255,0,0) 70.71%',
            hasComma: true,
        },
        {
            type: 'linear-gradient',
            content: '336deg, rgba(0,0,255,.8), rgba(0,0,255,0) 70.71%',
            hasComma: false,
        }
    ]);
    expect(parseGradient('radial-gradient(rgb(200))')).toEqual([{
        type: 'radial-gradient',
        content: 'rgb(200)',
        hasComma: false,
    }]);

    expect(parseGradient('repeating-linear-gradient(transparent, #4d9f0c 40px), repeating-linear-gradient(0.25turn, transparent, #3f87a6 20px);')).toEqual([
        {
            type: 'repeating-linear-gradient',
            content: 'transparent, #4d9f0c 40px',
            hasComma: true,
        },
        {
            type: 'repeating-linear-gradient',
            content: '0.25turn, transparent, #3f87a6 20px',
            hasComma: false,
        }
    ]);
});
