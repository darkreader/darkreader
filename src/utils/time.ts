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

interface Duration {
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
}

export function getDuration(time: Duration) {
    let duration = 0;
    if (time.seconds) {
        duration += time.seconds * 1000;
    }
    if (time.minutes) {
        duration += time.minutes * 60 * 1000;
    }
    if (time.hours) {
        duration += time.hours * 60 * 60 * 1000;
    }
    if (time.days) {
        duration += time.days * 24 * 60 * 60 * 1000;
    }
    return duration;
}

export function isHalloween() {
    const today = new Date();
    return (
        (today.getDate() === 31 && today.getMonth() === 9) ||
        (today.getDate() === 1 && today.getMonth() === 10)
    );
}
