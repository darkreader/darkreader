export function parseTime($time: string) {
    const parts = $time.split(':').slice(0, 2);
    const lowercased = $time.trim().toLowerCase();
    const isAM = lowercased.endsWith('am') || lowercased.endsWith('a.m.');
    const isPM = lowercased.endsWith('pm') || lowercased.endsWith('p.m.');

    let hours = parts.length > 0 ? parseInt(parts[0]) : 0;
    if (isNaN(hours) || hours > 23) {
        hours = 0;
    }
    if (isAM && hours === 12) {
        hours = 0;
    }
    if (isPM && hours < 12) {
        hours += 12;
    }

    let minutes = parts.length > 1 ? parseInt(parts[1]) : 0;
    if (isNaN(minutes) || minutes > 59) {
        minutes = 0;
    }

    return [hours, minutes];
}

function parse24HTime(time: string) {
    return time.split(':').map((x) => parseInt(x));
}

function compareTime(a: number[], b: number[]) {
    if (a[0] === b[0] && a[1] === b[1]) {
        return 0;
    }
    if (a[0] < b[0] || (a[0] === b[0] && a[1] < b[1])) {
        return -1;
    }
    return 1;
}

export function isInTimeInterval(date: Date, time0: string, time1: string) {
    const a = parse24HTime(time0);
    const b = parse24HTime(time1);
    const t = [date.getHours(), date.getMinutes()];
    if (compareTime(a, b) > 0) {
        return compareTime(a, t) <= 0 || compareTime(t, b) < 0;
    }
    return compareTime(a, t) <= 0 && compareTime(t, b) < 0;
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
