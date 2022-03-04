import {scale, clamp, multiplyMatrices} from '../../../src/utils/math';

test('Scale', () => {
    expect(scale(5, 0, 10, 0, 100)).toEqual(50);
});

test('Clamp', () => {
    expect(clamp(1, 2, 3)).toEqual(2);
    expect(clamp(2, 1, 3)).toEqual(2);
    expect(clamp(3, 1, 2)).toEqual(2);
});

test('Matrix multiplication', () => {
    expect(multiplyMatrices([[1]], [[2]])).toEqual([[2]]);
    expect(multiplyMatrices([[1, 2, 3], [6, 5, 3]], [[1, 2], [7, 4], [6, 2]])).toEqual([[33, 16], [59, 38]]);
});
