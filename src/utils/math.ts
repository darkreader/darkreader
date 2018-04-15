export function scale(x: number, inLow: number, inHigh: number, outLow: number, outHigh: number) {
    return (x - inLow) * (outHigh - outLow) / (inHigh - inLow) + outLow;
}

export function clamp(x: number, min: number, max: number) {
    return Math.min(max, Math.max(min, x));
}

export function multiplyMatrices(m1: number[][], m2: number[][]) {
    const result: number[][] = [];
    for (let i = 0; i < m1.length; i++) {
        result[i] = [];
        for (let j = 0; j < m2[0].length; j++) {
            let sum = 0;
            for (let k = 0; k < m1[0].length; k++) {
                sum += m1[i][k] * m2[k][j];
            }
            result[i][j] = sum;
        }
    }
    return result;
}
