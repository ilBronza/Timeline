const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, plain, DAY } = require('./harness.cjs');

test('local input formatting and parsing round trip through leap day and DST', async () => {
    const h = createHarness(); await h.ready();
    for (const value of ['2024-02-29T08:05', '2026-03-29T08:00', '2026-10-25T08:00', '2026-12-31T23:59']) {
        assert.equal(h.context.formatTimeInputValue(h.context.parseTimeInputValue(value)), value);
    }
});

test('vis date parser supports missing seconds and midnight 24:00', async () => {
    const h = createHarness(); await h.ready();
    assert.deepEqual(plain(h.context.parseVisDateTime(' 2026-01-01 08:30:15 ')), { hours: 8, minutes: 30, seconds: 15 });
    assert.deepEqual(plain(h.context.parseVisDateTime('2026-01-01 24:00')), { hours: 24, minutes: 0, seconds: 0 });
});

for (const [time, expected] of [['00:00', true], ['07:59', true], ['08:00', false], ['19:59', false], ['20:00', true], ['23:59', true]]) {
    test(`hidden working hours are start inclusive and end exclusive at ${time}`, async () => {
        const h = createHarness(); await h.ready();
        assert.equal(h.context.isTimelineHiddenDate(new Date(`2026-03-29T${time}:00`), h.context.options.hiddenDates), expected);
    });
}

test('missing or empty hidden dates never hide a date', async () => {
    const h = createHarness(); await h.ready();
    for (const rules of [undefined, null, [], {}]) assert.equal(h.context.isTimelineHiddenDate(new Date(), rules), false);
});

for (const [scale, step, click, expected] of [
    ['hour', 4, '2026-01-15T14:35', '2026-01-15T12:00'],
    ['hour', 4, '2026-01-15T12:00', '2026-01-15T08:00'],
    ['hour', 4, '2026-01-15T08:00', '2026-01-14T16:00'],
    ['hour', 1, '2026-01-15T09:30', '2026-01-15T09:00'],
    ['day', 1, '2026-01-15T10:00', '2026-01-15T08:00'],
    ['day', 1, '2026-01-15T08:00', '2026-01-14T08:00'],
    ['day', 7, '2026-01-15T07:00', '2026-01-08T08:00'],
    ['month', 1, '2026-01-01T07:00', '2025-12-01T08:00'],
    ['month', 1, '2026-02-28T13:00', '2026-02-01T08:00'],
    ['year', 1, '2026-01-01T08:00', '2025-01-01T08:00'],
    ['year', 1, '2026-10-15T12:00', '2026-01-01T08:00'],
]) {
    test(`snap ${scale}/${step}: ${click} -> ${expected}`, async () => {
        const h = createHarness(); await h.ready();
        h.context.options.timeAxis = { scale, step };
        const date = new Date(click);
        const original = date.getTime();
        assert.equal(h.context.formatTimeInputValue(h.context.snapTimelineCreateDatetime(date)), expected);
        assert.equal(date.getTime(), original, 'must not mutate click date');
    });
}

test('new item duration is twenty percent of the visible window', async () => {
    const h = createHarness(); await h.ready();
    const start = new Date('2026-02-01T08:00:00Z');
    h.context.timeline.range = { start, end: new Date(+start + 10 * DAY) };
    assert.equal(+h.context.getTimelineCreateEndDatetime(start), +start + 2 * DAY);
    assert.equal(h.context.getTimelineVisibleWindowMs(), 10 * DAY);
});

test('weekend backgrounds include Saturday and Sunday only, with stable distinct IDs', async () => {
    const h = createHarness(); await h.ready();
    const start = new Date('2026-02-02T12:00');
    const end = new Date('2026-02-09T12:00');
    const backgrounds = h.context.generateTimelineWeekendBackgrounds(start, end);
    assert.equal(backgrounds.length, 2);
    assert.deepEqual(Array.from(backgrounds, b => b.className), ['weekend-saturday', 'weekend-sunday']);
    assert.equal(new Set(backgrounds.map(b => b.id)).size, 2);
    for (const b of backgrounds) {
        assert.equal(b.type, 'background');
        assert.equal(b.start.getHours(), 0);
        assert.equal(b.end.getHours(), 0);
        assert.equal(b.end.getDate() - b.start.getDate(), 1);
    }
    assert.equal(start.getHours(), 12);
    assert.equal(end.getHours(), 12);
});

for (const [date, hours] of [['2026-03-29', 23], ['2026-10-25', 25]]) {
    test(`weekend backgrounds follow local midnight across DST on ${date}`, async () => {
        const h = createHarness(); await h.ready();
        const start = new Date(`${date}T00:00`);
        const end = new Date(start); end.setDate(end.getDate() + 1);
        const [b] = h.context.generateTimelineWeekendBackgrounds(start, end);
        assert.equal((b.end - b.start) / 3600000, hours);
    });
}

test('empty and reversed weekend intervals produce no backgrounds', async () => {
    const h = createHarness(); await h.ready();
    assert.equal(h.context.generateTimelineWeekendBackgrounds('2026-02-07', '2026-02-07').length, 0);
    assert.equal(h.context.generateTimelineWeekendBackgrounds('2026-02-09', '2026-02-02').length, 0);
});
