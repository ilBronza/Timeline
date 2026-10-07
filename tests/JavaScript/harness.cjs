const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the complete shipped browser script in an isolated context. These
// doubles cover its vis/network/storage contracts, not browser layout or vis's
// own rendering. No source extraction, transpilation or npm dependencies.
process.env.TZ = 'Europe/Rome';
const source = fs.readFileSync(path.join(__dirname, '../../resources/assets/js/ilbronza.timeline.js'), 'utf8');
const DAY = 86400000;
const NOW = new Date('2026-02-02T09:00:00Z').getTime();

class DataSet {
    constructor(data = []) { this.rows = new Map(); this.add(data); }
    add(data) {
        for (const row of Array.isArray(data) ? data : [data]) {
            if (this.rows.has(row.id)) throw new Error(`Duplicate id ${row.id}`);
            this.rows.set(row.id, { ...row });
        }
    }
    update(data) {
        for (const row of Array.isArray(data) ? data : [data]) {
            this.rows.set(row.id, { ...this.rows.get(row.id), ...row });
        }
    }
    get(id) { return arguments.length ? this.rows.get(id) ?? null : [...this.rows.values()]; }
    getIds() { return [...this.rows.keys()]; }
    clear() { this.rows.clear(); }
    remove(id) { this.rows.delete(id); }
    forEach(callback) { [...this.rows.values()].forEach(callback); }
}

class EventTarget {
    constructor() { this.listeners = new Map(); }
    addEventListener(name, fn) {
        this.listeners.set(name, [...this.listeners.get(name) ?? [], fn]);
    }
    dispatchEvent(event) {
        for (const fn of this.listeners.get(event.type) ?? []) fn(event);
    }
}

class Timeline {
    constructor(container, items, groups, options) {
        this.items = items;
        this.groups = groups;
        this.options = options;
        this.range = { start: options.start, end: options.end };
        this.handlers = new Map();
        this.setWindowCalls = [];
        this.selection = [];
    }
    on(name, fn) { this.handlers.set(name, [...this.handlers.get(name) ?? [], fn]); }
    async emit(name, event) { for (const fn of this.handlers.get(name) ?? []) await fn(event); }
    getWindow() { return this.range; }
    setWindow(start, end, options) { this.range = { start, end }; this.setWindowCalls.push({ start, end, options }); }
    setOptions(options) { Object.assign(this.options, options); }
    setSelection(ids) { this.selection = ids; }
}

function createHarness({ config = {}, data = { groups: [], items: [] }, stored = {}, storageError = false } = {}) {
    const timers = new Map();
    let nextTimer = 0;
    const storage = new Map(Object.entries(stored));
    const requests = [], ajax = [], alerts = [], errors = [], notifications = [];
    const document = new EventTarget();
    const container = new EventTarget();
    Object.assign(container, {
        clientWidth: 1000, style: {}, setAttribute() {}, focus() {},
        querySelectorAll: () => [], contains: () => false,
    });
    const runtimeConfig = { apiUrl: '/api/timeline', updateUrl: '', createRowFormUrl: '/create', zoomDays: 60, ...config };
    const elements = new Map([
        ['timeline-config', { textContent: JSON.stringify(runtimeConfig) }],
        ['timelinecontainer', container],
    ]);
    document.getElementById = id => elements.get(id) ?? null;
    document.querySelector = () => null;
    document.querySelectorAll = () => [];
    document.body = { appendChild() {} };

    class FixedDate extends Date {
        constructor(...args) { super(...(args.length ? args : [NOW])); }
        static now() { return NOW; }
    }
    const context = new EventTarget();
    Object.assign(context, {
        document, Date: FixedDate, URL, Set, Map, WeakMap,
        location: { origin: 'https://example.test', pathname: '/planning', search: '?team=1' },
        localStorage: {
            getItem(key) { if (storageError) throw new Error('Storage blocked'); return storage.get(key) ?? null; },
            setItem(key, value) { if (storageError) throw new Error('Quota exceeded'); storage.set(key, value); },
        },
        setTimeout(fn) { const id = ++nextTimer; timers.set(id, fn); return id; },
        clearTimeout(id) { timers.delete(id); },
        requestAnimationFrame(fn) { const id = ++nextTimer; timers.set(id, fn); return id; },
        MutationObserver: class { observe() {} },
        CustomEvent: class { constructor(type, options = {}) { this.type = type; Object.assign(this, options); } },
        vis: { DataSet, Timeline },
        fetch: async (url, options) => {
            requests.push({ url, options });
            return { ok: true, status: 200, json: async () => structuredClone(data) };
        },
        $: { ajax: options => ajax.push(options) },
        alert: message => alerts.push(message),
        console: { error: error => errors.push(error) },
        addSuccessNotification: message => notifications.push(message),
    });
    context.window = context;
    vm.createContext(context);
    vm.runInContext(source, context, { filename: 'ilbronza.timeline.js' });
    return {
        context, document, container, elements, storage, requests, ajax, alerts, errors, notifications,
        evaluate: expression => vm.runInContext(expression, context),
        async ready() {
            // Let the script's real asynchronous bootstrap complete.
            await new Promise(resolve => setImmediate(resolve));
            if (!context.timeline) throw new Error('Timeline bootstrap did not complete');
        },
        flushTimers() {
            const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn());
        },
    };
}

const plain = value => JSON.parse(JSON.stringify(value));
const viewKey = 'timeline-view:https://example.test:/planning:?team=1';
const hiddenKey = 'timeline-hidden-groups:https://example.test:/planning:?team=1';
module.exports = { createHarness, plain, DAY, NOW, viewKey, hiddenKey };
