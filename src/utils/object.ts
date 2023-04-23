export function getValidatedObject<T>(source: any, compare: T, sanitizeList: string[] = []): Partial<T> | null {
    const result: Partial<T> = {};
    if (source == null || typeof source !== 'object' || Array.isArray(source)) {
        return null;
    }
    Object.keys(source).forEach((key) => {
        const value = source[key];
        if (sanitizeList.includes(value)) {
            return;
        }
        const compareValue = compare[key as keyof T];
        if (value == null || compareValue == null) {
            return;
        }
        const array1 = Array.isArray(value);
        const array2 = Array.isArray(compareValue);
        if (array1 || array2) {
            if (array1 && array2) {
                (result as any)[key] = value;
            }
        } else if (typeof value === 'object' && typeof compareValue === 'object') {
            (result as any)[key] = getValidatedObject(value, compareValue, sanitizeList);
        } else if (typeof value === typeof compareValue) {
            (result as any)[key] = value;
        }
    });
    return result;
}

export function getPreviousObject<T>(source: any, compare: T, previous: any): Partial<T> | null {
    const result: Partial<T> = {};
    if (source == null || typeof source !== 'object' || Array.isArray(source)) {
        return null;
    }
    Object.keys(source).forEach((key) => {
        const value = source[key];
        const compareValue = compare[key as keyof T];
        const previousValue = previous[key];
        if (value == null || compare[key as keyof T] == null) {
            return;
        }
        const sourceArray = Array.isArray(value);
        const compareArray = Array.isArray(compareValue);
        if (sourceArray || compareArray) {
            if (sourceArray && compareArray) {
                const addedValues = (compareValue as string[]).filter((entry) => !(previousValue as string[]).includes(entry));
                const removedValues = (previousValue as string[]).filter((entry) => !(compareValue as string[]).includes(entry));
                const newArray: string[] = (compareValue as string[]).filter((entry) => !addedValues.includes(entry));
                (result as any)[key] = [...newArray, ...removedValues];
            }
        } else if (typeof value === 'object' && typeof compareValue === 'object') {
            (result as any)[key] = getPreviousObject(value, compareValue, previous);
        } else if (value === compareValue) {
            (result as any)[key] = previousValue;
        }
    });
    return result;
}
