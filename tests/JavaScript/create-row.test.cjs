const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness.cjs');

async function createFormHarness(saveResponse) {
    const h = createHarness();
    await h.ready();

    const danger = [], requests = [], listeners = new Map();
    const button = { disabled: false };
    const modal = { hidden: false, show() {}, hide() { this.hidden = true; } };
    const form = {
        dataset: {},
        entries: [['_token', 'csrf-test'], ['operator_id', '42'], ['starts_at', '2026-10-15T10:00']],
        getAttribute: name => ({ action: '/operators-manager/operators/timeline/store-row?iframed=1', method: 'POST' })[name],
        querySelector: () => button,
        addEventListener: (name, callback) => listeners.set(name, callback),
    };
    const clone = {
        querySelector: selector => ({
            '.uk-modal-title': {}, '.timeline-modal-content': {}, '.timeline-create-row-form': form,
        })[selector] ?? null,
        addEventListener() {},
    };
    h.elements.set('timeline-item-modal-template', { firstElementChild: { cloneNode: () => clone } });
    h.document.querySelector = () => ({ getAttribute: () => 'csrf-test' });
    h.document.createElement = () => ({
        textContent: '',
        get innerHTML() {
            return this.textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        },
    });
    h.context.FormData = class {
        constructor(form) { this.entries = form.entries; }
        forEach(callback) { this.entries.forEach(([key, value]) => callback(value, key)); }
    };
    h.context.UIkit = { modal: () => modal };
    h.context.addDangerNotification = message => danger.push(message);
    h.context.fetch = async (url, options) => {
        if (options.method) {
            requests.push({ url, options });
            return typeof saveResponse === 'function' ? saveResponse() : saveResponse;
        }
        return { ok: true, text: async () => '<form></form>' };
    };
    let refreshes = 0;
    h.context.fetchTimeline = async () => { refreshes++; };
    await h.context.openTimelineCreateRowFormPopup(new Date('2026-10-15T08:00:00Z'), 'operator-42', 'operator');

    return {
        ...h, danger, requests, button, modal,
        get refreshes() { return refreshes; },
        submit: () => listeners.get('submit')({ preventDefault() {} }),
    };
}

function response(status, body) {
    return { ok: status >= 200 && status < 300, status, text: async () => body };
}

const failures = [
    ['validation errors', 422, JSON.stringify({
        message: 'Dati non validi',
        errors: { operator_id: ['Operatore obbligatorio'], ends_at: ['Data finale non valida'] },
    }), 'Dati non validi<br>Operatore obbligatorio<br>Data finale non valida'],
    ['JSON server error', 500, JSON.stringify({ message: 'Operatore già assegnato' }), 'Operatore già assegnato'],
    ['plain text server error', 500, 'Impossibile creare la riga', 'Impossibile creare la riga'],
    ['empty response', 503, '', 'HTTP 503'],
    ['unsuccessful JSON with HTTP 200', 200, JSON.stringify({ success: false, message: 'Riga rifiutata' }), 'Riga rifiutata'],
    ['malformed JSON', 500, '{"message": "risposta incompleta', '{"message": "risposta incompleta'],
    ['null JSON', 500, 'null', 'null'],
    ['HTML in server messages', 422, JSON.stringify({ message: '<img src=x onerror=alert(1)> & errore' }), '&lt;img src=x onerror=alert(1)&gt; &amp; errore'],
    ['duplicate validation message', 422, JSON.stringify({ message: 'Operatore obbligatorio', errors: { operator_id: ['Operatore obbligatorio'] } }), 'Operatore obbligatorio'],
];

for (const [name, status, body, expected] of failures) {
    test(`creation displays UKN danger for ${name} and allows another attempt`, async () => {
        const h = await createFormHarness(response(status, body));
        await h.submit();
        assert.deepEqual(h.danger, [expected]);
        assert.equal(h.button.disabled, false);
        assert.equal(h.modal.hidden, false);
        assert.equal(h.refreshes, 0);
        assert.deepEqual(h.notifications, []);
        await h.submit();
        assert.equal(h.requests.length, 2);
    });
}

test('creation displays network failures and restores the submit button', async () => {
    const h = await createFormHarness(async () => { throw new Error('Failed to fetch'); });
    await h.submit();
    assert.deepEqual(h.danger, ['Failed to fetch']);
    assert.equal(h.button.disabled, false);
    assert.equal(h.modal.hidden, false);
});

test('creation restores the submit button even when UKN is unavailable', async () => {
    const h = await createFormHarness(response(500, 'Errore server'));
    delete h.context.addDangerNotification;
    await h.submit();
    assert.equal(h.button.disabled, false);
    assert.equal(h.modal.hidden, false);
});

test('creation keeps submit disabled while saving and closes and refreshes on success', async () => {
    let finish;
    const h = await createFormHarness(() => new Promise(resolve => { finish = resolve; }));
    const saving = h.submit();
    assert.equal(h.button.disabled, true);
    assert.equal(h.modal.hidden, false);
    finish(response(200, JSON.stringify({ success: true, message: 'Riga timeline creata' })));
    await saving;
    assert.deepEqual(h.danger, []);
    assert.deepEqual(h.notifications, ['Riga timeline creata']);
    assert.equal(h.button.disabled, false);
    assert.equal(h.modal.hidden, true);
    assert.equal(h.refreshes, 1);
    const request = h.requests[0];
    assert.equal(request.url, '/operators-manager/operators/timeline/store-row?iframed=1');
    assert.equal(request.options.method, 'POST');
    assert.equal(request.options.headers['X-CSRF-TOKEN'], 'csrf-test');
    assert.equal(request.options.headers.Accept, 'application/json');
    assert.deepEqual(JSON.parse(request.options.body), { operator_id: '42', starts_at: '2026-10-15T08:00:00.000Z' });
});
