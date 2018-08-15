function parseTime(time: string) {
    return time.split(':').map((x) => parseInt(x));
}

function compareTime(a: number[], b: number[]) {
    if (a[0] === b[0] && a[1] === b[1]) {
        return 0;
    }
    if (a[0] < b[0] || (a[0] === b[0] && a[1] < b[1])) {
        return 1;
    }
    return -1;
}

export function isInTimeInterval(date: Date, time0: string, time1: string) {
    const t0 = parseTime(time0);
    const t1 = parseTime(time1);
    const t = [date.getHours(), date.getMinutes()];
    if (compareTime(t0, t1) < 0) {
        t1[0] += 24;
    }
    return compareTime(t0, t) >= 0 && compareTime(t, t1) > 0;
}
