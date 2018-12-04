import {isInTimeInterval} from '../src/utils/time';

test('Time interval', () => {
    expect(isInTimeInterval(new Date(2018, 11, 4, 10), '9:00', '12:00')).toBe(true);
    expect(isInTimeInterval(new Date(2018, 11, 4, 10), '9:00', '10:00')).toBe(false);
    expect(isInTimeInterval(new Date(2018, 11, 4, 10), '9:00', '10:01')).toBe(true);
    expect(isInTimeInterval(new Date(2018, 11, 4, 10), '18:00', '12:00')).toBe(true);
    expect(isInTimeInterval(new Date(2018, 11, 4, 10), '18:00', '9:00')).toBe(false);
});
