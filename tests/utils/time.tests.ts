import {isInTimeInterval, isNightAtLocation, parseTime, getDuration} from '../../src/utils/time';

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
});

test('Sunrize/sunset', () => {
    const utcDate = (y, m, d, hh, mm) => new Date(Date.UTC(y, m, d, hh, mm));

    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 0, 0)).rightNow).toBe(true);
    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 5, 0)).rightNow).toBe(true);
    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 7, 0)).rightNow).toBe(false);
    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 12, 0)).rightNow).toBe(false);
    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 18, 0)).rightNow).toBe(false);
    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 20, 0)).rightNow).toBe(true);
    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 23, 59)).rightNow).toBe(true);

    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 0, 0)).rightNow).toBe(true);
    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 3, 0)).rightNow).toBe(true);
    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 5, 0)).rightNow).toBe(false);
    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 10, 0)).rightNow).toBe(false);
    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 16, 0)).rightNow).toBe(false);
    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 18, 0)).rightNow).toBe(true);
    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 23, 59)).rightNow).toBe(true);

    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 0, 0)).rightNow).toBe(true);
    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 7, 0)).rightNow).toBe(true);
    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 9, 0)).rightNow).toBe(false);
    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 14, 0)).rightNow).toBe(false);
    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 20, 0)).rightNow).toBe(false);
    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 22, 0)).rightNow).toBe(true);
    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 23, 59)).rightNow).toBe(true);
});
