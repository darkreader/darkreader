import {isInTimeIntervalLocal, nextTimeInterval, isNightAtLocation, nextTimeChangeAtLocation, parseTime, getDuration, getDurationInMinutes} from '../../../src/utils/time';

test('Time interval', () => {
    // isInTimeIntervalLocal is time-zone dependent
    expect(isInTimeIntervalLocal('9:00', '12:00', new Date(2018, 11, 4, 10))).toEqual(true);
    expect(isInTimeIntervalLocal('10:00', '10:00', new Date(2018, 11, 4, 10))).toEqual(false);
    expect(isInTimeIntervalLocal('10:00', '10:00', new Date(2018, 11, 4, 12))).toEqual(false);
    expect(isInTimeIntervalLocal('10:00', '10:00', new Date(2018, 11, 4, 8))).toEqual(false);
    expect(isInTimeIntervalLocal('9:00', '10:00', new Date(2018, 11, 4, 10))).toEqual(false);
    expect(isInTimeIntervalLocal('9:01', '10:00', new Date(2018, 11, 4, 9, 2))).toEqual(true);
    expect(isInTimeIntervalLocal('9:00', '10:01', new Date(2018, 11, 4, 10))).toEqual(true);
    expect(isInTimeIntervalLocal('18:00', '12:00', new Date(2018, 11, 4, 10))).toEqual(true);
    expect(isInTimeIntervalLocal('18:00', '9:00', new Date(2018, 11, 4, 10))).toEqual(false);
    expect(isInTimeIntervalLocal('18:00', '9:00', new Date(2018, 11, 4, 22))).toEqual(true);
});

test('Time interval prediction', () => {
    // nextTimeInterval() returns time-zone dependent timestamp
    expect(nextTimeInterval('9:00', '12:00', new Date(2018, 11, 4, 10))).toEqual(new Date(2018, 11, 4, 12).getTime());
    expect(nextTimeInterval('10:00', '10:00', new Date(2018, 11, 4, 10))).toEqual(null);
    expect(nextTimeInterval('10:00', '10:00', new Date(2018, 11, 4, 12))).toEqual(null);
    expect(nextTimeInterval('10:00', '10:00', new Date(2018, 11, 4, 8))).toEqual(null);
    expect(nextTimeInterval('9:00', '10:00', new Date(2018, 11, 4, 10))).toEqual(new Date(2018, 11, 5, 9).getTime());
    expect(nextTimeInterval('9:01', '10:00', new Date(2018, 11, 4, 9, 2))).toEqual(new Date(2018, 11, 4, 10).getTime());
    expect(nextTimeInterval('9:00', '10:01', new Date(2018, 11, 4, 10))).toEqual(new Date(2018, 11, 4, 10, 1).getTime());
    expect(nextTimeInterval('18:00', '12:00', new Date(2018, 11, 4, 10))).toEqual(new Date(2018, 11, 4, 12).getTime());
    expect(nextTimeInterval('18:00', '9:00', new Date(2018, 11, 4, 10))).toEqual(new Date(2018, 11, 4, 18).getTime());
    expect(nextTimeInterval('18:00', '9:00', new Date(2018, 11, 4, 22))).toEqual(new Date(2018, 11, 5, 9).getTime());
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
        days: 3,
    })).toEqual(289488000);

    expect(getDurationInMinutes({
        seconds: 27,
        minutes: 25,
        hours: 5,
        days: 7,
    })).toEqual(10405.45);
});

test('Nigth check', () => {
    const utcDate = (y: number, m: number, d: number, hh: number, mm: number) => new Date(Date.UTC(y, m, d, hh, mm));

    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 0, 0))).toEqual(true);
    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 5, 0))).toEqual(true);
    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 7, 0))).toEqual(false);
    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 12, 0))).toEqual(false);
    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 18, 0))).toEqual(false);
    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 20, 0))).toEqual(true);
    expect(isNightAtLocation(52, 0, utcDate(2019, 8, 9, 23, 59))).toEqual(true);

    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 0, 0))).toEqual(true);
    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 3, 0))).toEqual(true);
    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 5, 0))).toEqual(false);
    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 10, 0))).toEqual(false);
    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 16, 0))).toEqual(false);
    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 18, 0))).toEqual(true);
    expect(isNightAtLocation(52, 30, utcDate(2019, 8, 9, 23, 59))).toEqual(true);

    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 0, 0))).toEqual(true);
    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 7, 0))).toEqual(true);
    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 9, 0))).toEqual(false);
    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 14, 0))).toEqual(false);
    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 20, 0))).toEqual(false);
    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 22, 0))).toEqual(true);
    expect(isNightAtLocation(52, -30, utcDate(2019, 8, 9, 23, 59))).toEqual(true);

    // Polar day and night
    expect(isNightAtLocation(71, 0, utcDate(2019, 5, 15, 0, 0))).toEqual(false);
    expect(isNightAtLocation(-71, 0, utcDate(2019, 5, 15, 0, 0))).toEqual(true);

    // Places where sunset comes before sunrise (in UTC)
    expect(isNightAtLocation(0, 180, utcDate(2019, 8, 9, 0, 0))).toEqual(false);
    expect(isNightAtLocation(0, 180, utcDate(2019, 8, 9, 7, 0))).toEqual(true);
});

test('Sunrise/sunset', () => {
    const utcDate = (y: number, m: number, d: number, hh: number, mm: number) => new Date(Date.UTC(y, m, d, hh, mm));

    expect(nextTimeChangeAtLocation(52, 0, utcDate(2019, 8, 9, 0, 0))).toEqual(Date.UTC(2019, 8, 9, 5, 24, 2, 501));
    expect(nextTimeChangeAtLocation(52, 0, utcDate(2019, 8, 9, 5, 0))).toEqual(Date.UTC(2019, 8, 9, 5, 24, 2, 501));
    expect(nextTimeChangeAtLocation(52, 0, utcDate(2019, 8, 9, 7, 0))).toEqual(Date.UTC(2019, 8, 9, 18, 29, 46, 448));
    expect(nextTimeChangeAtLocation(52, 0, utcDate(2019, 8, 9, 12, 0))).toEqual(Date.UTC(2019, 8, 9, 18, 29, 46, 448));
    expect(nextTimeChangeAtLocation(52, 0, utcDate(2019, 8, 9, 18, 0))).toEqual(Date.UTC(2019, 8, 9, 18, 29, 46, 448));
    expect(nextTimeChangeAtLocation(52, 0, utcDate(2019, 8, 9, 20, 0))).toEqual(Date.UTC(2019, 8, 10, 5, 24, 2, 501));
    expect(nextTimeChangeAtLocation(52, 0, utcDate(2019, 8, 9, 23, 59))).toEqual(Date.UTC(2019, 8, 10, 5, 24, 2, 501));

    expect(nextTimeChangeAtLocation(52, 30, utcDate(2019, 8, 9, 0, 0))).toEqual(Date.UTC(2019, 8, 9, 3, 23, 54, 365));
    expect(nextTimeChangeAtLocation(52, 30, utcDate(2019, 8, 9, 3, 0))).toEqual(Date.UTC(2019, 8, 9, 3, 23, 54, 365));
    expect(nextTimeChangeAtLocation(52, 30, utcDate(2019, 8, 9, 5, 0))).toEqual(Date.UTC(2019, 8, 9, 16, 29, 58, 45));
    expect(nextTimeChangeAtLocation(52, 30, utcDate(2019, 8, 9, 10, 0))).toEqual(Date.UTC(2019, 8, 9, 16, 29, 58, 45));
    expect(nextTimeChangeAtLocation(52, 30, utcDate(2019, 8, 9, 16, 0))).toEqual(Date.UTC(2019, 8, 9, 16, 29, 58, 45));
    expect(nextTimeChangeAtLocation(52, 30, utcDate(2019, 8, 9, 18, 0))).toEqual(Date.UTC(2019, 8, 10, 3, 23, 54, 365));
    expect(nextTimeChangeAtLocation(52, 30, utcDate(2019, 8, 9, 23, 59))).toEqual(Date.UTC(2019, 8, 10, 3, 23, 54, 365));

    expect(nextTimeChangeAtLocation(52, -30, utcDate(2019, 8, 9, 0, 0))).toEqual(Date.UTC(2019, 8, 9, 7, 24, 10, 637));
    expect(nextTimeChangeAtLocation(52, -30, utcDate(2019, 8, 9, 7, 0))).toEqual(Date.UTC(2019, 8, 9, 7, 24, 10, 637));
    expect(nextTimeChangeAtLocation(52, -30, utcDate(2019, 8, 9, 9, 0))).toEqual(Date.UTC(2019, 8, 9, 20, 29, 34, 848));
    expect(nextTimeChangeAtLocation(52, -30, utcDate(2019, 8, 9, 14, 0))).toEqual(Date.UTC(2019, 8, 9, 20, 29, 34, 848));
    expect(nextTimeChangeAtLocation(52, -30, utcDate(2019, 8, 9, 20, 0))).toEqual(Date.UTC(2019, 8, 9, 20, 29, 34, 848));
    expect(nextTimeChangeAtLocation(52, -30, utcDate(2019, 8, 9, 22, 0))).toEqual(Date.UTC(2019, 8, 10, 7, 24, 10, 637));
    expect(nextTimeChangeAtLocation(52, -30, utcDate(2019, 8, 9, 23, 59))).toEqual(Date.UTC(2019, 8, 10, 7, 24, 10, 637));

    // Polar day and night
    expect(nextTimeChangeAtLocation(71, 0, utcDate(2019, 5, 15, 0, 0))).toEqual(Date.UTC(2019, 5, 16, 0, 0, 0, 0));
    expect(nextTimeChangeAtLocation(-71, 0, utcDate(2019, 5, 15, 0, 0))).toEqual(Date.UTC(2019, 5, 16, 0, 0, 0, 0));

    // Places where sunset comes before sunrise (in UTC)
    expect(nextTimeChangeAtLocation(0, 180, utcDate(2019, 8, 9, 0, 0))).toEqual(Date.UTC(2019, 8, 9, 6, 0, 50, 152));
    expect(nextTimeChangeAtLocation(0, 180, utcDate(2019, 8, 9, 7, 0))).toEqual(Date.UTC(2019, 8, 9, 17, 54, 18, 610));
});
