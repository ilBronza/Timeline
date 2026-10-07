const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, plain, viewKey, DAY, NOW } = require('./harness.cjs');
const MAX = 18 * (365.25 / 12) * DAY;

for (const [start, end] of [['bad', '2026-01-01'], ['2026-01-01', 'bad'], ['2026-01-01', '2026-01-01'], ['2026-02-01', '2026-01-01']]) {
    test(`invalid window ${start} / ${end} is rejected`, async () => {
        const h = createHarness(); await h.ready();
        assert.equal(h.context.clampTimelineWindowToMaxZoom(start, end), null);
    });
}

test('valid short windows preserve both bounds', async () => {
    const h = createHarness(); await h.ready();
    const start = new Date('2026-01-01'), end = new Date('2026-01-15');
    const range = h.context.clampTimelineWindowToMaxZoom(start, end);
    assert.equal(+range.start, +start); assert.equal(+range.end, +end);
});

test('oversized windows clamp to eighteen months and keep their midpoint', async () => {
    const h = createHarness(); await h.ready();
    const start = new Date('2020-01-01'), end = new Date('2030-01-01');
    const range = h.context.clampTimelineWindowToMaxZoom(start, end);
    assert.equal(range.end - range.start, MAX);
    assert.equal((+range.end + +range.start) / 2, (+end + +start) / 2);
});

for (const stored of ['bad JSON', 'null', '{}', '{"start":"invalid","end":"invalid"}', '{"start":"2026-02-02","end":"2026-01-01"}']) {
    test(`invalid persisted window is ignored: ${stored}`, async () => {
        const h = createHarness({ stored: { [viewKey]: stored } }); await h.ready();
        assert.equal(h.context.getStoredTimelineWindow(), null);
        assert.equal(+h.context.timeline.range.start, NOW);
    });
}

test('persisted window takes precedence over item dates and configured zoom', async () => {
    const stored = { start: '2026-04-01T00:00:00.000Z', end: '2026-04-10T00:00:00.000Z' };
    const h = createHarness({ stored: { [viewKey]: JSON.stringify(stored) }, data: { groups: [], items: [{ id: 1, start: '2020-01-01' }] } }); await h.ready();
    assert.deepEqual(plain(h.context.timeline.range), stored);
});

test('storing the window debounces to the latest range and isolates it by page', async () => {
    const h = createHarness(); await h.ready();
    h.context.storeTimelineWindow('2026-01-01', '2026-01-05');
    h.context.storeTimelineWindow('2026-02-01', '2026-02-05');
    assert.equal(h.storage.has(viewKey), false);
    h.flushTimers();
    assert.deepEqual(JSON.parse(h.storage.get(viewKey)), { start: '2026-02-01T00:00:00.000Z', end: '2026-02-05T00:00:00.000Z' });
});

test('storage failures and invalid date persistence do not crash the timeline', async () => {
    const h = createHarness({ storageError: true }); await h.ready();
    assert.equal(h.context.getStoredTimelineWindow(), null);
    h.context.storeTimelineWindow('invalid', 'invalid');
    assert.doesNotThrow(() => h.flushTimers());
});

test('empty timeline opens at now with a thirty-five day window', async () => {
    const h = createHarness({ config: { zoomDays: 120 } }); await h.ready();
    assert.equal(+h.context.timeline.range.start, NOW);
    assert.equal(h.context.timeline.range.end - h.context.timeline.range.start, 35 * DAY);
});

test('nonempty timeline starts at earliest valid item and applies configured zoom', async () => {
    const h = createHarness({ config: { zoomDays: 7 }, data: { groups: [], items: [
        { id: 1, start: '2026-02-03' }, { id: 2, start: 'invalid' }, { id: 3, start: '2026-02-01' },
    ] } }); await h.ready();
    assert.equal(+h.context.timeline.range.start, +new Date('2026-02-01'));
    assert.equal(h.context.timeline.range.end - h.context.timeline.range.start, 7 * DAY);
});

test('nonempty timeline with missing dates starts at now', async () => {
    const h = createHarness({ data: { groups: [], items: [{ id: 1 }] } }); await h.ready();
    assert.equal(+h.context.timeline.range.start, NOW);
});

test('configured oversized zoom is capped', async () => {
    const h = createHarness({ config: { zoomDays: 2000 }, data: { groups: [], items: [{ id: 1, start: '2026-01-01' }] } }); await h.ready();
    assert.equal(h.context.timeline.range.end - h.context.timeline.range.start, MAX);
    assert.equal(h.context.options.zoomMax, MAX);
});

for (const [days, scale, step] of [[5, 'hour', 4], [12, 'hour', 4], [13, 'day', 1], [23, 'day', 1], [24, 'day', 7], [350, 'day', 7], [351, 'month', 1], [1000, 'month', 1], [1001, 'year', 1]]) {
    test(`range of ${days} days selects ${scale}/${step} ticks`, async () => {
        const h = createHarness(); await h.ready();
        await h.context.timeline.emit('rangechanged', { start: new Date(NOW), end: new Date(NOW + days * DAY) });
        assert.deepEqual(plain(h.context.timeline.options.timeAxis), { scale, step });
        assert.deepEqual(plain(h.context.timelineTimeAxis), { scale, step });
    });
}
