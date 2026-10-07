const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, plain, DAY, NOW } = require('./harness.cjs');

test('bootstrap fetches JSON and fires ready only after creating the timeline', async () => {
    const h = createHarness();
    const observed = [];
    h.document.addEventListener('timeline:ready', () => observed.push(Boolean(h.context.timeline)));
    await h.ready();
    assert.deepEqual(observed, [true]);
    assert.equal(h.requests.length, 1);
    assert.equal(h.requests[0].url, '/api/timeline');
    assert.equal(h.requests[0].options.headers.Accept, 'application/json');
});

test('refresh replaces datasets, preserves the viewport and reuses the timeline and listeners', async () => {
    const h = createHarness({ data: { groups: [{ id: 'old' }], items: [{ id: 'old', group: 'old' }] } }); await h.ready();
    const timeline = h.context.timeline;
    const range = { start: new Date(NOW), end: new Date(NOW + 7 * DAY) };
    timeline.range = range;
    const eventCounts = [...timeline.handlers].map(([name, handlers]) => [name, handlers.length]);
    h.context.setTimelineData({ groups: [{ id: 'new' }], items: [{ id: 'new', group: 'new', start: '2026-01-01' }] });
    assert.equal(h.context.timeline, timeline);
    assert.equal(h.context.groups.get('old'), null);
    assert.equal(h.context.items.get('old'), null);
    assert.equal(h.context.items.get('new').group, 'new');
    assert.deepEqual(plain(timeline.range), plain(range));
    assert.deepEqual(plain(timeline.setWindowCalls[0].options), { animation: false });
    assert.deepEqual([...timeline.handlers].map(([name, handlers]) => [name, handlers.length]), eventCounts);
});

test('partial data updates preserve the omitted dataset', async () => {
    const h = createHarness({ data: { groups: [{ id: 'g' }], items: [{ id: 1, group: 'g' }] } }); await h.ready();
    h.context.setTimelineData({ items: [{ id: 2, group: 'g' }] });
    assert.equal(h.context.groups.get('g').id, 'g');
    h.context.setTimelineData({ groups: [{ id: 'new' }] });
    assert.equal(h.context.items.get(2).id, 2);
});

test('empty arrays clear stale records and recreate weekend backgrounds', async () => {
    const h = createHarness({ data: { groups: [{ id: 'g' }], items: [{ id: 1, group: 'g' }] } }); await h.ready();
    h.context.setTimelineData({ groups: [], items: [] });
    assert.equal(h.context.groups.get().length, 0);
    assert.equal(h.context.items.get(1), null);
    assert.ok(h.context.items.get().length > 0);
    assert.ok(h.context.items.get().every(row => row.type === 'background'));
});

test('weekend regeneration removes stale weekends but preserves work and other backgrounds', async () => {
    const h = createHarness(); await h.ready();
    h.context.items.add([{ id: 'work', type: 'range' }, { id: 'holiday', type: 'background', className: 'holiday' }]);
    const previous = h.context.items.get().filter(row => row.className?.startsWith('weekend')).map(row => row.id);
    const start = new Date('2026-09-07T00:00'), end = new Date('2026-09-14T00:00');
    h.context.regenerateTimelineWeekendBackgrounds(start, end);
    h.context.regenerateTimelineWeekendBackgrounds(start, end);
    assert.ok(h.context.items.get('work'));
    assert.ok(h.context.items.get('holiday'));
    assert.equal(h.context.items.get().length, 4);
    assert.ok(previous.every(id => h.context.items.get(id) === null));
});

test('fetchTimeline rejects HTTP failures and leaves existing data intact', async () => {
    const h = createHarness({ data: { groups: [{ id: 'g' }], items: [] } }); await h.ready();
    h.context.fetch = async () => ({ ok: false, status: 503 });
    await assert.rejects(() => h.context.fetchTimeline(), /HTTP 503 on \/api\/timeline/);
    assert.equal(h.context.groups.get('g').id, 'g');
});

test('JSON parsing and network failures propagate to callers', async () => {
    const h = createHarness(); await h.ready();
    h.context.fetch = async () => { throw new Error('Network unavailable'); };
    await assert.rejects(() => h.context.loadTimelineData(), /Network unavailable/);
    h.context.fetch = async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } });
    await assert.rejects(() => h.context.fetchTimeline(), /Invalid JSON/);
});

test('read-only configuration disables editing and sends no update request', async () => {
    const h = createHarness(); await h.ready();
    assert.equal(h.context.options.editable.updateTime, false);
    h.context.onTimelineEndResize({ id: 1 });
    assert.equal(h.ajax.length, 0);
});

test('moving an editable item posts a PUT override with the complete item payload', async () => {
    const h = createHarness({ config: { updateUrl: '/update' } }); await h.ready();
    const item = { id: 'work', start: '2026-02-01', end: '2026-02-02', group: 'g' };
    const accepted = [];
    h.context.options.onMove(item, value => accepted.push(value));
    assert.equal(h.context.options.editable.updateTime, true);
    assert.equal(accepted[0], item);
    assert.equal(h.ajax.length, 1);
    const request = h.ajax[0];
    assert.equal(request.url, '/update');
    assert.equal(request.type, 'POST');
    assert.equal(request.contentType, 'application/json');
    assert.equal(request.dataType, 'json');
    assert.deepEqual(JSON.parse(request.data), { _method: 'PUT', item });
});

test('update success notifications require a successful response and message', async () => {
    const h = createHarness({ config: { updateUrl: '/update' } }); await h.ready();
    h.context.onTimelineEndResize({ id: 1 });
    const request = h.ajax[0];
    request.success({ success: false, message: 'no' });
    request.success({ success: true });
    request.success({ success: true, message: 'Saved' });
    assert.deepEqual(h.notifications, ['Saved']);
    delete h.context.addSuccessNotification;
    assert.doesNotThrow(() => request.success({ success: true, message: 'Saved' }));
    request.error('server error');
    assert.deepEqual(h.errors, ['server error']);
});

test('double click opens creation with clicked time, group and morph model', async () => {
    const h = createHarness({ data: { groups: [{ id: 'g', model: 'supplier' }], items: [] } }); await h.ready();
    const calls = [];
    h.context.openTimelineCreateRowPopup = async (...args) => calls.push(args);
    const time = new Date('2026-04-01T10:00');
    await h.context.timeline.emit('doubleClick', { time, group: 'g' });
    assert.equal(calls.length, 1);
    assert.equal(+calls[0][0], +time);
    assert.equal(calls[0][1], 'g');
    assert.equal(calls[0][2], 'supplier');
});

test('double clicks on items or without a time do not open creation', async () => {
    const h = createHarness(); await h.ready();
    let calls = 0;
    h.context.openTimelineCreateRowPopup = async () => calls++;
    for (const event of [undefined, {}, { item: 'work', time: new Date() }]) await h.context.timeline.emit('doubleClick', event);
    assert.equal(calls, 0);
});

test('missing creation endpoint notifies and never requests a form', async () => {
    const h = createHarness({ config: { createRowFormUrl: '' } }); await h.ready();
    const messages = [];
    h.context.addDangerNotification = message => messages.push(message);
    await h.context.openTimelineCreateRowPopup(new Date(), 'g', 'supplier');
    assert.equal(messages.length, 1);
    assert.equal(h.requests.length, 1);
});

test('configured creation delegates all arguments to the form loader', async () => {
    const h = createHarness(); await h.ready();
    const expected = [new Date(), 'g', 'supplier'];
    h.context.openTimelineCreateRowFormPopup = async (...args) => {
        assert.deepEqual(args, expected); return 'opened';
    };
    assert.equal(await h.context.openTimelineCreateRowPopup(...expected), 'opened');
});

test('modal guards do not fetch for missing IDs, missing records, URLs or templates', async () => {
    const h = createHarness({ data: { groups: [{ id: 'g' }, { id: 'url', modalUrl: '/group-modal' }], items: [{ id: 'i' }, { id: 'url', modalUrl: '/item-modal' }] } }); await h.ready();
    for (const id of [undefined, 'missing', 'i', 'url']) await h.context.openTimelineItemLinksModal({ dataset: { itemId: id } });
    for (const id of [undefined, 'missing', 'g', 'url']) await h.context.openTimelineGroupModal({ dataset: { groupId: id } });
    assert.equal(h.requests.length, 1);
});

test('Escape and focus leaving the timeline clear selection', async () => {
    const h = createHarness(); await h.ready();
    h.context.timeline.selection = ['item'];
    h.document.dispatchEvent({ type: 'keydown', key: 'Enter' });
    assert.deepEqual(h.context.timeline.selection, ['item']);
    h.document.dispatchEvent({ type: 'keydown', key: 'Escape' });
    assert.deepEqual(plain(h.context.timeline.selection), []);
    h.context.timeline.selection = ['item'];
    h.container.dispatchEvent({ type: 'focusout', relatedTarget: null });
    assert.deepEqual(plain(h.context.timeline.selection), []);
});

test('outside clicks clear selection except while interacting with a modal', async () => {
    const h = createHarness(); await h.ready();
    h.context.timeline.selection = ['item'];
    h.document.dispatchEvent({ type: 'pointerdown', target: { closest: () => ({}) } });
    assert.deepEqual(h.context.timeline.selection, ['item']);
    h.document.dispatchEvent({ type: 'pointerdown', target: { closest: () => null } });
    assert.deepEqual(plain(h.context.timeline.selection), []);
});

for (const [raw, expected] of [['{"id":7}', { id: 7 }], ['malformed', 'malformed'], [undefined, null]]) {
    test(`group actions dispatch their payload: ${raw}`, async () => {
        const h = createHarness(); await h.ready();
        const events = [];
        h.context.addEventListener('timeline-group-action', event => events.push(event.detail));
        let prevented = false, stopped = false;
        h.container.dispatchEvent({ type: 'click',
            target: { closest: () => ({ dataset: { action: 'inspect', payload: raw } }) },
            preventDefault() { prevented = true; }, stopPropagation() { stopped = true; },
        });
        assert.deepEqual(plain(events), [{ action: 'inspect', payload: expected }]);
        assert.ok(prevented && stopped);
    });
}

test('iframe and target links retain configured icons, titles, classes and target', async () => {
    const h = createHarness(); await h.ready();
    const link = { url: '/details', text: 'Details', title: 'Open details', faIcon: 'eye', htmlClasses: ['custom', 'compact'] };
    const iframe = h.context.timelineLinkIframe(link);
    assert.match(iframe, /data-type="iframe"/);
    assert.match(iframe, /title="Open details"/);
    assert.match(iframe, /fa-eye/);
    assert.match(iframe, /custom compact/);
    const target = h.context.timelineLinkTarget(link, '_blank');
    assert.match(target, /target="_blank"/);
    assert.match(target, /href="\/details"/);
    assert.doesNotMatch(h.context.timelineLinkTarget({ url: '/x' }, false), /target=/);
    assert.match(h.context.timelineLinkIframe({ url: '/x' }), /fa-link/);
});

test('form links carry CSRF, method override and iframe close flag', async () => {
    const h = createHarness(); await h.ready();
    h.context.csrfToken = 'csrf-test';
    const form = h.context.timelineLinkForm({ url: '/delete', method: 'DELETE', text: 'Delete' });
    assert.match(form, /method="POST" action="\/delete"/);
    assert.match(form, /name="_token" value="csrf-test"/);
    assert.match(form, /name="_method" value="DELETE"/);
    assert.match(form, /name="closeIframe" value="1"/);
    assert.match(h.context.timelineLinkForm({ url: '/create' }), /name="_method" value="POST"/);
});
