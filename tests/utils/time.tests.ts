import {isInTimeInterval, isNightAtLocation, parseTime, getDuration, getDurationInMinutes} from '../../src/utils/time';

test('Time interval', () => {
    expect(isInTimeInterval('9:00', '12:00', new Date(2018, 11, 4, 10))).toEqual({rightNow: true, nextCheck: new Date(2018, 11, 4, 12).getTime()});
    expect(isInTimeInterval('10:00', '10:00', new Date(2018, 11, 4, 10))).toEqual({rightNow: false, nextCheck: null});
    expect(isInTimeInterval('10:00', '10:00', new Date(2018, 11, 4, 12))).toEqual({rightNow: false, nextCheck: null});
    expect(isInTimeInterval('10:00', '10:00', new Date(2018, 11, 4, 8))).toEqual({rightNow: false, nextCheck: null});
    expect(isInTimeInterval('9:00', '10:00', new Date(2018, 11, 4, 10))).toEqual({rightNow: false, nextCheck: new Date(2018, 11, 5, 9).getTime()});
    expect(isInTimeInterval('9:01', '10:00', new Date(2018, 11, 4, 9, 2))).toEqual({rightNow: true, nextCheck: new Date(2018, 11, 4, 10).getTime()});
    expect(isInTimeInterval('9:00', '10:01', new Date(2018, 11, 4, 10))).toEqual({rightNow: true, nextCheck: new Date(2018, 11, 4, 10, 1).getTime()});
    expect(isInTimeInterval('18:00', '12:00', new Date(2018, 11, 4, 10))).toEqual({rightNow: true, nextCheck: new Date(2018, 11, 4, 12).getTime()});
    expect(isInTimeInterval('18:00', '9:00', new Date(2018, 11, 4, 10))).toEqual({rightNow: false, nextCheck: new Date(2018, 11, 4, 18).getTime()});
    expect(isInTimeInterval('18:00', '9:00', new Date(2018, 11, 4, 22))).toEqual({rightNow: true, nextCheck: new Date(2018, 11, 5, 9).getTime()});
});

test('Time parse', () => {
    expect(parseTime('10:30')).toEqual([10, 30]);
    expect(parseTime('10:30AM')).toEqual([10, 30]);
    expect(parseTime('10:30 a.m.')).toEqual([10, 30]);
    expect(parseTime('10:30PM')).toEqual([22, 30]);
    expect(parseTime('10:30 p.m.')).toEqual([22, 30]);
    expect(parseTime('0:30')).toEqual([0, 30]);
    expect(parseTime('12:30am')).toEqual([0, 30]);
    expect(parseTime('12:30pm')).toEqual([12, 30]);
});

test('Duration', () => {
    expect(getDuration({
        seconds: 48,
        minutes: 24,
        hours: 8,
        days: 3
    })).toEqual(289488000);

    expect(getDurationInMinutes({
        seconds: 27,
        minutes: 25,
        hours: 5,
        days: 7
    })).toEqual(10405.45);
});

test('Sunrize/sunset', () => {
    const utcDate = (y, m, d, hh, mm) => new Date(Date.UTC(y, m, d, hh, mm));

    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 0, 0))).toEqual({rightNow: true, nextCheck: Date.UTC(2019, 8, 9, 5, 24, 2, 501)});
    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 5, 0))).toEqual({rightNow: true, nextCheck: Date.UTC(2019, 8, 9, 5, 24, 2, 501)});
    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 7, 0))).toEqual({rightNow: false, nextCheck: Date.UTC(2019, 8, 9, 18, 29, 46, 448)});
    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 12, 0))).toEqual({rightNow: false, nextCheck: Date.UTC(2019, 8, 9, 18, 29, 46, 448)});
    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 18, 0))).toEqual({rightNow: false, nextCheck: Date.UTC(2019, 8, 9, 18, 29, 46, 448)});
    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 20, 0))).toEqual({rightNow: true, nextCheck: Date.UTC(2019, 8, 10, 5, 24, 2, 501)});
    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 23, 59))).toEqual({rightNow: true, nextCheck: Date.UTC(2019, 8, 10, 5, 24, 2, 501)});

    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 0, 0))).toEqual({rightNow: true, nextCheck: Date.UTC(2019, 8, 9, 3, 23, 54, 365)});
    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 3, 0))).toEqual({rightNow: true, nextCheck: Date.UTC(2019, 8, 9, 3, 23, 54, 365)});
    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 5, 0))).toEqual({rightNow: false, nextCheck: Date.UTC(2019, 8, 9, 16, 29, 58, 45)});
    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 10, 0))).toEqual({rightNow: false, nextCheck: Date.UTC(2019, 8, 9, 16, 29, 58, 45)});
    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 16, 0))).toEqual({rightNow: false, nextCheck: Date.UTC(2019, 8, 9, 16, 29, 58, 45)});
    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 18, 0))).toEqual({rightNow: true, nextCheck: Date.UTC(2019, 8, 10, 3, 23, 54, 365)});
    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 23, 59))).toEqual({rightNow: true, nextCheck: Date.UTC(2019, 8, 10, 3, 23, 54, 365)});

    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 0, 0))).toEqual({rightNow: true, nextCheck: Date.UTC(2019, 8, 9, 7, 24, 10, 637)});
    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 7, 0))).toEqual({rightNow: true, nextCheck: Date.UTC(2019, 8, 9, 7, 24, 10, 637)});
    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 9, 0))).toEqual({rightNow: false, nextCheck: Date.UTC(2019, 8, 9, 20, 29, 34, 848)});
    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 14, 0))).toEqual({rightNow: false, nextCheck: Date.UTC(2019, 8, 9, 20, 29, 34, 848)});
    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 20, 0))).toEqual({rightNow: false, nextCheck: Date.UTC(2019, 8, 9, 20, 29, 34, 848)});
    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 22, 0))).toEqual({rightNow: true, nextCheck: Date.UTC(2019, 8, 10, 7, 24, 10, 637)});
    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 23, 59))).toEqual({rightNow: true, nextCheck: Date.UTC(2019, 8, 10, 7, 24, 10, 637)});

    // Polar day and night
    expect(isNightAtLocation(71, 0, utcDate(2019, 5, 15, 0, 0))).toEqual({rightNow: false, nextCheck: Date.UTC(2019, 5, 16, 0, 0, 0, 0)});
    expect(isNightAtLocation(-71, 0, utcDate(2019, 5, 15, 0, 0))).toEqual({rightNow: true, nextCheck: Date.UTC(2019, 5, 16, 0, 0, 0, 0)});

    // Places where sunset comes before sunrise (in UTC)
    expect(isNightAtLocation(0, 180, utcDate(2019, 8, 9, 0, 0))).toEqual({rightNow: false, nextCheck: Date.UTC(2019, 8, 9, 6, 0, 50, 152)});
    expect(isNightAtLocation(0, 180, utcDate(2019, 8, 9, 7, 0))).toEqual({rightNow: true, nextCheck: Date.UTC(2019, 8, 9, 17, 54, 18, 610)});
});
