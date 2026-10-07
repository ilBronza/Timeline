const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, plain, hiddenKey } = require('./harness.cjs');

const hierarchy = () => [
    { id: 'root', nestedGroups: [2, 'other'] },
    { id: 2, nestedGroups: ['leaf'] },
    { id: 'leaf' }, { id: 'other' }, { id: 'independent' },
];

test('group lookup accepts equivalent numeric and string IDs and unknown groups', async () => {
    const h = createHarness(); await h.ready();
    const rows = hierarchy();
    assert.equal(h.context.getTimelineGroupById('2', rows), rows[1]);
    assert.equal(h.context.getTimelineGroupById('missing', rows), null);
});

test('descendant traversal includes all levels and handles unknown IDs', async () => {
    const h = createHarness(); await h.ready();
    assert.deepEqual(plain(h.context.getTimelineNestedGroupIds('root', hierarchy())), [2, 'leaf', 'other']);
    assert.deepEqual(plain(h.context.getTimelineNestedGroupIds('absent', hierarchy())), []);
});

test('descendant traversal terminates on cycles', async () => {
    const h = createHarness(); await h.ready();
    const rows = [{ id: 'a', nestedGroups: ['b'] }, { id: 'b', nestedGroups: ['a'] }];
    const ids = h.context.getTimelineNestedGroupIds('a', rows);
    assert.deepEqual(new Set(ids), new Set(['a', 'b']));
    assert.equal(ids.length, 2);
});

test('top level groups exclude nested numeric IDs and preserve input order', async () => {
    const h = createHarness(); await h.ready();
    assert.deepEqual(Array.from(h.context.getTimelineTopLevelGroups(hierarchy()), row => row.id), ['root', 'independent']);
});

test('items make all ancestors visible regardless of input order', async () => {
    const h = createHarness(); await h.ready();
    for (const rows of [hierarchy(), hierarchy().reverse()]) {
        assert.deepEqual(h.context.getTimelineGroupsWithItems(rows, [{ group: 'leaf' }]), new Set(['leaf', '2', 'root']));
    }
});

test('backgrounds, null items, and items without a group do not reveal groups', async () => {
    const h = createHarness(); await h.ready();
    const used = h.context.getTimelineGroupsWithItems(hierarchy(), [null, {}, { group: null }, { group: 'leaf', type: 'background' }]);
    assert.equal(used.size, 0);
});

test('group zero is a valid item group', async () => {
    const h = createHarness(); await h.ready();
    assert.deepEqual(h.context.getTimelineGroupsWithItems([{ id: 0 }], [{ group: 0 }]), new Set(['0']));
});

test('automatic hiding excludes groups containing real items or populated descendants', async () => {
    const h = createHarness(); await h.ready();
    assert.deepEqual(h.context.getTimelineAutomaticallyHiddenGroupIds(hierarchy(), [{ group: 2 }]), new Set(['leaf', 'other', 'independent']));
});

test('hidden parent normalization includes descendants without modifying the original set', async () => {
    const h = createHarness(); await h.ready();
    const hidden = new Set(['root']);
    assert.deepEqual(h.context.normalizeTimelineHiddenGroupIds(hidden, hierarchy()), new Set(['root', '2', 'leaf', 'other']));
    assert.deepEqual(hidden, new Set(['root']));
});

test('filter tree follows dataset order, omits missing references and preserves nesting', async () => {
    const rows = [{ id: 'root', nestedGroups: ['second', 'missing', 'first'] }, { id: 'first' }, { id: 'second' }, { id: 'last' }];
    const h = createHarness({ data: { groups: rows, items: [] } }); await h.ready();
    const tree = h.context.getTimelineGroupsFilterTree();
    assert.deepEqual(Array.from(tree, node => node.group.id), ['root', 'last']);
    assert.deepEqual(Array.from(tree[0].children, node => node.group.id), ['first', 'second']);
});

test('filter tree stops cycles reachable from a root', async () => {
    const h = createHarness({ data: { groups: [
        { id: 'root', nestedGroups: ['a'] }, { id: 'a', nestedGroups: ['b'] }, { id: 'b', nestedGroups: ['a'] },
    ], items: [] } }); await h.ready();
    const tree = h.context.getTimelineGroupsFilterTree();
    assert.equal(tree[0].children[0].children[0].group.id, 'b');
    assert.equal(tree[0].children[0].children[0].children.length, 0);
});

for (const value of ['garbage', 'null', '{}', '42']) {
    test(`invalid hidden group storage ${value} falls back to empty`, async () => {
        const h = createHarness({ stored: { [hiddenKey]: value } }); await h.ready();
        assert.equal(h.context.getStoredHiddenGroupIds().size, 0);
    });
}

test('hidden group storage normalizes IDs and tolerates storage exceptions', async () => {
    const h = createHarness({ stored: { [hiddenKey]: '[1,"2",1]' } }); await h.ready();
    assert.deepEqual(h.context.getStoredHiddenGroupIds(), new Set(['1', '2']));
    const blocked = createHarness({ storageError: true }); await blocked.ready();
    assert.doesNotThrow(() => blocked.context.storeHiddenGroupIds(new Set(['a'])));
    assert.equal(blocked.context.getStoredHiddenGroupIds().size, 0);
});

test('initial empty groups are hidden automatically without persisting that choice', async () => {
    const h = createHarness({ data: { groups: hierarchy(), items: [{ id: 'work', group: 'leaf' }] } }); await h.ready();
    assert.equal(h.context.groups.get('root').visible, true);
    assert.equal(h.context.groups.get('leaf').visible, true);
    assert.equal(h.context.groups.get('other').visible, false);
    assert.deepEqual(JSON.parse(h.storage.get(hiddenKey)), []);
});

test('refresh reveals newly populated groups but does not hide previously visible groups', async () => {
    const h = createHarness({ data: { groups: [{ id: 'a' }, { id: 'b' }], items: [{ id: 1, group: 'a' }] } }); await h.ready();
    h.context.setTimelineData({ groups: [{ id: 'a' }, { id: 'b' }], items: [{ id: 2, group: 'b' }] });
    assert.equal(h.context.groups.get('a').visible, true);
    assert.equal(h.context.groups.get('b').visible, true);
});

test('persisted user hiding survives refresh even when the group gains items', async () => {
    const h = createHarness({ stored: { [hiddenKey]: '["a"]' }, data: { groups: [{ id: 'a' }], items: [] } }); await h.ready();
    h.context.setTimelineData({ groups: [{ id: 'a' }], items: [{ id: 1, group: 'a' }] });
    assert.equal(h.context.groups.get('a').visible, false);
});

test('hiding and showing a parent cascades to descendants and persists', async () => {
    const h = createHarness({ data: { groups: hierarchy(), items: [] } }); await h.ready();
    h.context.setTimelineGroupVisibility('root', true, true);
    for (const id of ['root', 2, 'leaf', 'other']) assert.equal(h.context.groups.get(id).visible, true);
    assert.equal(h.context.groups.get('independent').visible, false);
    h.context.setTimelineGroupVisibility('root', false, true);
    assert.deepEqual(new Set(JSON.parse(h.storage.get(hiddenKey))), new Set(['root', '2', 'leaf', 'other']));
    for (const id of ['root', 2, 'leaf', 'other']) assert.equal(h.context.groups.get(id).visible, false);
});

test('single group visibility leaves siblings unchanged', async () => {
    const h = createHarness({ data: { groups: [{ id: 'a' }, { id: 'b' }], items: [] } }); await h.ready();
    h.context.setAllTimelineGroupsVisibility(true);
    h.context.setTimelineGroupVisibility('a', false);
    assert.equal(h.context.groups.get('a').visible, false);
    assert.equal(h.context.groups.get('b').visible, true);
});

test('show all clears automatic hiding and hide all persists every group', async () => {
    const h = createHarness({ data: { groups: hierarchy(), items: [] } }); await h.ready();
    h.context.setAllTimelineGroupsVisibility(false);
    assert.equal(JSON.parse(h.storage.get(hiddenKey)).length, 5);
    h.context.setAllTimelineGroupsVisibility(true);
    assert.deepEqual(JSON.parse(h.storage.get(hiddenKey)), []);
    assert.equal(h.context.getHiddenGroupIds().size, 0);
    assert.ok(h.context.groups.get().every(group => group.visible));
});
