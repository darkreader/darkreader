import {clamp, multiplyMatrices} from '../../utils/math';
import {FilterConfig} from '../../definitions';

export function createFilterMatrix(config: FilterConfig) {
    let m = Matrix.identity();
    if (config.sepia !== 0) {
        m = multiplyMatrices(m, Matrix.sepia(config.sepia / 100));
    }
    if (config.grayscale !== 0) {
        m = multiplyMatrices(m, Matrix.grayscale(config.grayscale / 100));
    }
    if (config.contrast !== 100) {
        m = multiplyMatrices(m, Matrix.contrast(config.contrast / 100));
    }
    if (config.brightness !== 100) {
        m = multiplyMatrices(m, Matrix.brightness(config.brightness / 100));
    }
    if (config.mode === 1) {
        m = multiplyMatrices(m, Matrix.invertNHue());
    }
    if (config.useColorCorrection && config.colorblindnessSensitivity > 0) {
        if (config.colorblindnessType == 0) {
            m = multiplyMatrices(Matrix.fullCorrectionDeuteranopia(config.colorblindnessSensitivity), m);
        } else if (config.colorblindnessType == 1) {
            m = multiplyMatrices(Matrix.fullCorrectionProtanopia(config.colorblindnessSensitivity), m);
        } else if (config.colorblindnessType == 2) {
            m = multiplyMatrices(Matrix.fullCorrectionTritanopia(config.colorblindnessSensitivity), m);
        }
    }
    return m;
}

export function applyColorMatrix([r, g, b]: number[], matrix: number[][]) {
    const rgb = [[r / 255], [g / 255], [b / 255], [1], [1]];
    const result = multiplyMatrices(matrix, rgb);
    return [0, 1, 2].map((i) => clamp(Math.round(result[i][0] * 255), 0, 255));
}

export const Matrix = {

    identity() {
        return [
            [1, 0, 0, 0, 0],
            [0, 1, 0, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1]
        ];
    },

    invertNHue() {
        return [
            [0.333, -0.667, -0.667, 0, 1],
            [-0.667, 0.333, -0.667, 0, 1],
            [-0.667, -0.667, 0.333, 0, 1],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1]
        ];
    },

    brightness(v: number) {
        return [
            [v, 0, 0, 0, 0],
            [0, v, 0, 0, 0],
            [0, 0, v, 0, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1]
        ];
    },

    contrast(v: number) {
        const t = (1 - v) / 2;
        return [
            [v, 0, 0, 0, t],
            [0, v, 0, 0, t],
            [0, 0, v, 0, t],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1]
        ];
    },

    sepia(v: number) {
        return [
            [(0.393 + 0.607 * (1 - v)), (0.769 - 0.769 * (1 - v)), (0.189 - 0.189 * (1 - v)), 0, 0],
            [(0.349 - 0.349 * (1 - v)), (0.686 + 0.314 * (1 - v)), (0.168 - 0.168 * (1 - v)), 0, 0],
            [(0.272 - 0.272 * (1 - v)), (0.534 - 0.534 * (1 - v)), (0.131 + 0.869 * (1 - v)), 0, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1]
        ];
    },

    grayscale(v: number) {
        return [
            [(0.2126 + 0.7874 * (1 - v)), (0.7152 - 0.7152 * (1 - v)), (0.0722 - 0.0722 * (1 - v)), 0, 0],
            [(0.2126 - 0.2126 * (1 - v)), (0.7152 + 0.2848 * (1 - v)), (0.0722 - 0.0722 * (1 - v)), 0, 0],
            [(0.2126 - 0.2126 * (1 - v)), (0.7152 - 0.7152 * (1 - v)), (0.0722 + 0.9278 * (1 - v)), 0, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1]
        ];
    },

    rgb2lms() {
        return [
            [17.8824, 43.5161, 4.11935],
            [3.45565, 27.1554, 3.86714],
            [0.0299566, 0.184309, 1.46709]
        ]
    },

    lms2rgb() {
        return [
            [0.0809444479, -0.130504409, 0.116721066],
            [-0.010248533515, 0.054019326636, -0.1136147082],
            [-0.000365296938, -0.00412161469, 0.693511405]
        ]
    },

    simulateDuteranopia() {
        return [
            [1, 0, 0],
            [0.49421, 0, 1.24827],
            [0, 0, 1]
        ]
    },

    simulateProtanopia() {
        return [
            [0, 2.02344, -2.52581],
            [0, 1, 0],
            [0, 0, 1]
        ]
    },

    errorCorrectionDuteranopia() {
        return [
            [1, 0.7, 0],
            [0, 0, 0],
            [0, 0.7, 1]
        ]
    },

    fullCorrectionDeuteranopia(strength: number) {
        return [
            [1 + 0.5023294041595 * strength, -0.50231420683723 * strength, 0, 0, 0],
            [0, 1, 0, 0, 0],
            [-0.18259012117263 * strength, 0.18258459563274 * strength, 1, 0, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1]
        ]
    },

    fullCorrectionProtanopia(strength: number) {
        return [
            [1, 0, 0, 0, 0],
            [0.50894941008343 * strength, 1 + (0.49105389057512 - 1) * strength, 0, 0, 0],
            [0.61732665235893 * strength, -0.61732264809677 * strength, 1, 0, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1]
        ]
    },

    fullCorrectionTritanopia(strength: number) {
        return [
            [1 + 2.6143476462267 * strength, -2.6143824108141 * strength, 0, 0, 0],
            [1.6143497395451 * strength, 1 + -1.6143712037127 * strength, 0, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1]
        ]
    }
};


function lmsDaltonize(rgb: number[]) {
    const rgbColumn = rgb.map((x) => [x / 255]);

    // 1, 2, 3. simulate colorblindness
    const lmsColumn = multiplyMatrices(Matrix.rgb2lms(), rgbColumn);
    const lmsSimulatedColumn = multiplyMatrices(Matrix.simulateDuteranopia(), lmsColumn);
    const rgbSimulatedColumn = multiplyMatrices(Matrix.lms2rgb(), lmsSimulatedColumn);

    // 4. find error caused by colorblindness
    const errorColumn = [0, 1, 2].map((i) => [rgbColumn[i][0] - rgbSimulatedColumn[i][0]]);

    // 5. find correction for error
    const correctionColumn = multiplyMatrices(Matrix.errorCorrectionDuteranopia(), errorColumn);

    // 6. apply correction
    const result = [0, 1, 2]
        .map((i) => rgbColumn[i][0] + correctionColumn[i][0])
        .map((x) => clamp(Math.round(x * 255), 0, 255));

    return result;
}