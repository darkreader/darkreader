export function getValidatedObject<T>(source: any, compare: T): Partial<T> {
    const result = {};
    if (source == null || typeof source !== 'object' || Array.isArray(source)) {
        return null;
    }
    Object.keys(source).forEach((key) => {
        const value = source[key];
        if (value == null || compare[key] == null) {
            return;
        }
        const array1 = Array.isArray(value);
        const array2 = Array.isArray(compare[key]);
        if (array1 || array2) {
            if (array1 && array2) {
                result[key] = value;
            }
        } else if (typeof value === 'object' && typeof compare[key] === 'object') {
            result[key] = getValidatedObject(value, compare[key]);
        } else if (typeof value === typeof compare[key]) {
            result[key] = value;
        }
    });
    return result;
}
