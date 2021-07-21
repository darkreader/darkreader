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

export function getDurationInMinutes(time: Duration) {
    return getDuration(time) / 1000 / 60;
}

function getSunsetSunriseUTCTime(
    date: Date,
    latitude: number,
    longitude: number,
) {
    const dec31 = new Date(date.getUTCFullYear(), 0, 0);
    const oneDay = getDuration({days: 1});
    const dayOfYear = Math.floor((Number(date) - Number(dec31)) / oneDay);

    const zenith = 90.83333333333333;
    const D2R = Math.PI / 180;
    const R2D = 180 / Math.PI;

    // convert the longitude to hour value and calculate an approximate time
    const lnHour = longitude / 15;

    function getTime(isSunrise: boolean) {
        const t = dayOfYear + (((isSunrise ? 6 : 18) - lnHour) / 24);

        // calculate the Sun's mean anomaly
        const M = (0.9856 * t) - 3.289;

        // calculate the Sun's true longitude
        let L = M + (1.916 * Math.sin(M * D2R)) + (0.020 * Math.sin(2 * M * D2R)) + 282.634;
        if (L > 360) {
            L -= 360;
        } else if (L < 0) {
            L += 360;
        }

        // calculate the Sun's right ascension
        let RA = R2D * Math.atan(0.91764 * Math.tan(L * D2R));
        if (RA > 360) {
            RA -= 360;
        } else if (RA < 0) {
            RA += 360;
        }

        // right ascension value needs to be in the same qua
        const Lquadrant = (Math.floor(L / (90))) * 90;
        const RAquadrant = (Math.floor(RA / 90)) * 90;
        RA += (Lquadrant - RAquadrant);

        // right ascension value needs to be converted into hours
        RA /= 15;

        // calculate the Sun's declination
        const sinDec = 0.39782 * Math.sin(L * D2R);
        const cosDec = Math.cos(Math.asin(sinDec));

        // calculate the Sun's local hour angle
        const cosH = (Math.cos(zenith * D2R) - (sinDec * Math.sin(latitude * D2R))) / (cosDec * Math.cos(latitude * D2R));
        if (cosH > 1) {
            // always night
            return {
                alwaysDay: false,
                alwaysNight: true,
                time: 0,
            };
        } else if (cosH < -1) {
            // always day
            return {
                alwaysDay: true,
                alwaysNight: false,
                time: 0,
            };
        }

        const H = (isSunrise ? (360 - R2D * Math.acos(cosH)) : (R2D * Math.acos(cosH))) / 15;

        // calculate local mean time of rising/setting
        const T = H + RA - (0.06571 * t) - 6.622;

        // adjust back to UTC
        let UT = T - lnHour;
        if (UT > 24) {
            UT -= 24;
        } else if (UT < 0) {
            UT += 24;
        }

        // convert to milliseconds
        return {
            alwaysDay: false,
            alwaysNight: false,
            time: UT * getDuration({hours: 1}),
        };
    }

    const sunriseTime = getTime(true);
    const sunsetTime = getTime(false);

    if (sunriseTime.alwaysDay || sunsetTime.alwaysDay) {
        return {
            alwaysDay: true
        };
    } else if (sunriseTime.alwaysNight || sunsetTime.alwaysNight) {
        return {
            alwaysNight: true
        };
    }

    return {
        sunriseTime: sunriseTime.time,
        sunsetTime: sunsetTime.time
    };
}

export function isNightAtLocation(
    date: Date,
    latitude: number,
    longitude: number,
) {
    const time = getSunsetSunriseUTCTime(date, latitude, longitude);

    if (time.alwaysDay) {
        return false;
    } else if (time.alwaysNight) {
        return true;
    }

    const sunriseTime = time.sunriseTime;
    const sunsetTime = time.sunsetTime;
    const currentTime = (
        date.getUTCHours() * getDuration({hours: 1}) +
        date.getUTCMinutes() * getDuration({minutes: 1}) +
        date.getUTCSeconds() * getDuration({seconds: 1})
    );

    if (sunsetTime > sunriseTime) {
        return (currentTime > sunsetTime) || (currentTime < sunriseTime);
    }
    return (currentTime > sunsetTime) && (currentTime < sunriseTime);
}
