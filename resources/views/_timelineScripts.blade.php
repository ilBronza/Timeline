
<div id="timeline-item-modal-template" hidden>
    <div class="uk-modal" uk-modal>
        <div class="uk-modal-dialog uk-modal-body">
            <button class="uk-modal-close-default" type="button" uk-close></button>

            <div class="uk-card uk-card-small">
                <div class="uk-card-header">
                    <h2 class="uk-modal-title"></h2>
                </div>
                <div class="uk-card-body">
                    <div class="timeline-modal-content"></div>
                </div>        
                <div class="uk-card-footer">
                    <dl class="uk-column-1-3">
                        <dt>Start</dt>
                        <dd class="start"></dd>
                        <dt>End</dt>
                        <dd class="end"></dd>
                        <dt>Days</dt>
                        <dd class="days"></dd>
                    </dl>
                </div>        
            </div>
        </div>
    </div>
</div>


<script type="text/javascript">

    window.timelineDefaultTitle = 'N.D.';
    window.possibleSellables = [];
    window.possibleSuppliers = [];
    window.possibleOrders = [];

    window.timelineLinkIframe = function(link)
    {
        const faIcon = link.faIcon ?? 'link';
        const textString = link.text ? link.text : '';
        const label = link.title ?? link.text ?? '';
        const titleString = label ? ` title="${label}"` : '';
        const marginClass = link.text ? ' uk-margin-left ' : '';
        const classString = "uk-button uk-button-default uk-button-small";
        const extraClasses = Array.isArray(link.htmlClasses) ? ' ' + link.htmlClasses.join(' ') : '';

        return `<div class="uk-inline ${marginClass}" uk-lightbox onclick="event.stopPropagation();" onmousedown="event.stopPropagation();" onpointerdown="event.stopPropagation();">
    <a class="${classString}${extraClasses}" data-type="iframe" href="${link.url}" ${titleString}>
        ${textString}<i class="fa fa-${faIcon}"></i>
    </a>
</div>`;
    }

    window.createTimelineIframeLinkElement = function(link)
    {
        const template = document.createElement('template');
        template.innerHTML = window.timelineLinkIframe(link).trim();

        const wrapper = template.content.firstElementChild;
        const anchor = wrapper.querySelector('a');

        if (anchor)
        {
            anchor.addEventListener('click', function(e)
            {
                e.preventDefault();
                e.stopPropagation();

                clearTimeout(liveItemHideTimer);

                if (typeof UIkit !== 'undefined' && UIkit.lightboxPanel)
                {
                    UIkit.lightboxPanel({
                        items: [
                            {
                                source: link.url,
                                type: 'iframe',
                            },
                        ],
                    }).show();
                }
            });
        }

        return wrapper;
    }

    window.isTimelineLightboxOpen = function()
    {
        return document.querySelector('.uk-lightbox.uk-open') !== null;
    }

    window.timelineLinkTarget = function(link, target)
    {
        const faIcon = link.faIcon ?? 'link';
        const textString = link.text ? link.text : '';
        const titleString = link.text ? ` title="${link.text}"` : '';
        const marginClass = link.text ? ' uk-margin-left ' : '';
        const classString = "uk-button uk-button-default uk-button-small";
        const extraClasses = Array.isArray(link.htmlClasses) ? ' ' + link.htmlClasses.join(' ') : '';

        const targetAttr = target ? ` target="${target}"` : '';

        return `<div class="uk-inline ${marginClass}" onclick="event.stopPropagation();" onmousedown="event.stopPropagation();" onpointerdown="event.stopPropagation();">
    <a class="${classString}${extraClasses}" href="${link.url}" ${titleString} ${targetAttr}>
        ${textString}<i class="fa fa-${faIcon}"></i>
    </a>
</div>`;
    };

    window.timelineLinkForm = function(link)
    {
        const faIcon = link.faIcon ?? 'link';
        const textString = link.text ? link.text : '';
        const titleString = link.text ? ` title="${link.text}"` : '';
        const marginClass = link.text ? ' uk-margin-left ' : '';
        const classString = "uk-button uk-button-default uk-button-small";
        const extraClasses = Array.isArray(link.htmlClasses) ? ' ' + link.htmlClasses.join(' ') : '';
        const csrfToken = (typeof window.csrfToken !== 'undefined') ? window.csrfToken : (document.querySelector('meta[name="csrf-token"]')?.content || '');
        const method = link.method || 'POST';

        return `<form method="POST" action="${link.url}" class="uk-inline ${marginClass}" style="display:inline" onclick="event.stopPropagation();" onmousedown="event.stopPropagation();" onpointerdown="event.stopPropagation();">
    <input type="hidden" name="_token" value="${csrfToken}">
    <input type="hidden" name="_method" value="${method}">
    <input type="hidden" name="closeIframe" value="1">
    <button type="submit" class="${classString}${extraClasses}" ${titleString}>
        ${textString}<i class="fa fa-${faIcon}"></i>
    </button>
</form>`;
    };

    window.openTimelineItemLinksModal = function(button)
    {
        const itemId = button.dataset.itemId;
        if (!itemId) return;

        const item = items.get(itemId);
        if (!item) return;

        const template = document.getElementById('timeline-item-modal-template');
        if (!template) return;

        const clone = template.firstElementChild.cloneNode(true);
        const modalId = 'timeline-modal-' + Date.now();
        clone.id = modalId;

        const modalContent = clone.querySelector('.timeline-modal-content');
        const modalTitleEl = clone.querySelector('.uk-modal-title');

        modalTitleEl.textContent = item.title ?? window.timelineDefaultTitle;

        let html = '';

        const renderLink = function(link) {
            if (link.method === 'DELETE')
                return window.timelineLinkForm(link);

            if (link.target === 'iframe')
                return window.timelineLinkIframe(link);

            if (link.target)
                return window.timelineLinkTarget(link, link.target);

            return window.timelineLinkTarget(link, false);
        };

        if (Array.isArray(item.links)) {
            html += item.links.map(renderLink).join('');
        }

        if (Array.isArray(item.rightLinks) && item.rightLinks.length) {
            html += '<div class="uk-margin-top">';
            html += item.rightLinks.map(renderLink).join('');
            html += '</div>';
        }

        if (item.description)
            html += `<div class="uk-margin-top"><small>${item.description}</small></div>`;

        if (item.content)
            html += `<div class="uk-margin-top">${item.content}</div>`;

        modalContent.innerHTML = html;

        // --- Compute precise start/end and inject into footer ---
        const startDate = item.start ? new Date(item.start) : null;
        const endDate   = item.end ? new Date(item.end) : null;

        const formatDateTime = function(d) {
            if (!d) return '—';
            const date = d.toLocaleDateString('it-IT');
            const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            return date + ' ' + time;
        };

        const startEl = clone.querySelector('.start');
        const endEl   = clone.querySelector('.end');
        const daysEl  = clone.querySelector('.days');

        if (startEl) startEl.textContent = formatDateTime(startDate);
        if (endEl)   endEl.textContent   = formatDateTime(endDate);
        if (daysEl)  daysEl.textContent  = '';

        document.body.appendChild(clone);

        const modal = UIkit.modal('#' + modalId);
        modal.show();

        clone.addEventListener('hidden', function () {
            modal.$destroy(true);
            clone.remove();
        });
    };

    window.addEventListener('sis-lightboxClosed', function() {
        window.fetchTimeline();
    });

    const API_URL = "{{ $apiEndpoint }}";
    const UPDATE_URL = "{{ $timelineUpdateRoute ?? '' }}";
    const POSSIBLE_SELLABLES_URL = "{{ $possibleSellablesEndpoint ?? '' }}";
    const STORE_TIMELINE_ROW_URL = "{{ $timelineStoreRowEndpoint ?? '' }}";
    const TIMELINE_ZOOM_DAYS = {{ $zoom ?? config('timeline.zoom', 14) }};
    const TIMELINE_VIEW_STORAGE_KEY = [
        'timeline-view',
        window.location.origin,
        window.location.pathname,
        window.location.search
    ].join(':');
    let timelineViewStorageTimer = null;

    function getStoredTimelineWindow()
    {
        try
        {
            const stored = window.localStorage.getItem(TIMELINE_VIEW_STORAGE_KEY);
            if (! stored)
                return null;

            const parsed = JSON.parse(stored);
            const start = new Date(parsed.start);
            const end = new Date(parsed.end);

            if (! Number.isFinite(start.getTime()) || ! Number.isFinite(end.getTime()) || end <= start)
                return null;

            return {start, end};
        }
        catch (error)
        {
            return null;
        }
    }

    function storeTimelineWindow(start, end)
    {
        if (! start || ! end)
            return;

        clearTimeout(timelineViewStorageTimer);
        timelineViewStorageTimer = setTimeout(function ()
        {
            try
            {
                window.localStorage.setItem(TIMELINE_VIEW_STORAGE_KEY, JSON.stringify({
                    start: new Date(start).toISOString(),
                    end: new Date(end).toISOString()
                }));
            }
            catch (error)
            {
                // Ignore unavailable storage, private mode, or quota errors.
            }
        }, 250);
    }

    async function fetchJSON(url)
    {
        const res = await fetch(url, {headers: {'Accept': 'application/json'}});
        if (!res.ok) throw new Error('HTTP ' + res.status + ' on ' + url);
        return await res.json();
    }

    // DOM element where the Timeline will be attached
    var container = document.getElementById('timelinecontainer');

    if (container)
    {
        container.setAttribute('tabindex', '0');

        container.addEventListener('pointerdown', function (event)
        {
            if (event.target.closest('a, button, input, select, textarea, [contenteditable="true"]'))
                return;

            container.focus({preventScroll: true});
        });

        container.addEventListener('focusout', function (event)
        {
            if (event.relatedTarget && container.contains(event.relatedTarget))
                return;
        });
    }

    // Create a DataSet (allows two way data-binding)
    var items = new vis.DataSet([]);
    var groups = new vis.DataSet([]);
    var timeline = null;


    // --- LIVE button inside timeline-item on hover (direct binding) ---
    let liveItemTimer = null;
    let liveItemHideTimer = null;

    function attachLiveHoverHandlers()
    {
        document.querySelectorAll('#timelinecontainer .timeline-item').forEach(function(itemEl)
        {
            itemEl.addEventListener('pointerenter', function(ev)
            {
                clearTimeout(liveItemTimer);
                clearTimeout(liveItemHideTimer);

                const contentEl = itemEl.closest('.vis-item')?.querySelector('.vis-item-content');
                if (!contentEl) return;

                if (!itemEl.dataset.itemId) return;

                const changeSupplierUrl = itemEl.dataset.changeSupplierUrl || null;
                const rect = contentEl.getBoundingClientRect();
                const initialOffsetX = ev.clientX - rect.left;

                liveItemTimer = setTimeout(function()
                {
                    if (contentEl.querySelector('.timeline-live-inline-group')) return;

                    const group = document.createElement('div');
                    group.className = 'timeline-live-inline-group';
                    group.style.position = 'absolute';
                    group.style.zIndex = '30';
                    group.style.pointerEvents = 'auto';
                    group.style.display = 'flex';
                    group.style.gap = '4px';

                    const linkBtn = document.createElement('button');
                    linkBtn.type = 'button';
                    linkBtn.className = 'uk-button uk-button-danger uk-button-small timeline-live-inline';
                    linkBtn.innerHTML = '<i class="fa fa-link"></i>';
                    linkBtn.dataset.itemId = itemEl.dataset.itemId;

                    linkBtn.onclick = function(e)
                    {
                        e.stopPropagation();
                        window.openTimelineItemLinksModal(linkBtn);
                    };

                    linkBtn.onmousedown = function(e){ e.stopPropagation(); };
                    linkBtn.onpointerdown = function(e){ e.stopPropagation(); };

                    group.appendChild(linkBtn);

                    if (changeSupplierUrl)
                    {
                        const shuffleWrapper = window.createTimelineIframeLinkElement({
                            url: changeSupplierUrl,
                            faIcon: 'shuffle',
                            title: 'Cambia fornitore',
                        });

                        shuffleWrapper.classList.add('timeline-live-inline');
                        group.appendChild(shuffleWrapper);
                    }

                    group.addEventListener('pointerenter', function()
                    {
                        clearTimeout(liveItemHideTimer);
                    });

                    group.addEventListener('pointerleave', function()
                    {
                        clearTimeout(liveItemHideTimer);

                        liveItemHideTimer = setTimeout(function()
                        {
                            if (window.isTimelineLightboxOpen())
                                return;

                            if (group.parentNode)
                                group.remove();
                        }, 700);
                    });

                    if (getComputedStyle(contentEl).position === 'static')
                        contentEl.style.position = 'relative';

                    contentEl.appendChild(group);

                    const contentWidth = contentEl.offsetWidth;
                    const btnWidth = changeSupplierUrl ? 60 : 28;

                    let computedLeft = initialOffsetX + 10;

                    if (computedLeft + btnWidth > contentWidth)
                        computedLeft = contentWidth - btnWidth - 4;

                    if (computedLeft < 2)
                        computedLeft = 2;

                    group.style.left = computedLeft + 'px';
                    group.style.top = '2px';

                }, 250);
            });
            itemEl.addEventListener('pointerleave', function(e)
            {
                const contentEl = itemEl.closest('.vis-item')?.querySelector('.vis-item-content');
                if (!contentEl) return;

                const group = contentEl.querySelector('.timeline-live-inline-group');

                if (group && e.relatedTarget && group.contains(e.relatedTarget))
                    return;

                clearTimeout(liveItemHideTimer);

                liveItemHideTimer = setTimeout(function()
                {
                    if (window.isTimelineLightboxOpen())
                        return;

                    const currentGroup = contentEl.querySelector('.timeline-live-inline-group');
                    if (currentGroup)
                        currentGroup.remove();
                }, 700);
            });
        });
    }

    // Attach after each render/update
    if (container)
    {
        const observer = new MutationObserver(function()
        {
            attachLiveHoverHandlers();
        });

        observer.observe(container, { childList: true, subtree: true });
    }

    // Delegated handler for group buttons/links rendered by groupTemplate
    // Registered once to avoid duplicate listeners after repeated fetches.
    if (container) {
        container.addEventListener('click', function (e) {
            const el = e.target.closest('.timeline-group-action');
            if (!el) return;

            e.preventDefault();
            e.stopPropagation();

            const action = el.dataset.action;
            const payloadRaw = el.dataset.payload;
            let payload = null;

            try {
                payload = payloadRaw ? JSON.parse(payloadRaw) : null;
            } catch (err) {
                payload = payloadRaw;
            }

            window.dispatchEvent(new CustomEvent('timeline-group-action', {
                detail: { action, payload }
            }));
        }, true);
    }

window.onTimelineEndResize = function (item)
{
    if (! UPDATE_URL)
        return;

    fetch(UPDATE_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({_method: 'PUT', item: item})
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
        if (data.success === true && data.message && typeof window.addSuccessNotification === 'function') {
            window.addSuccessNotification(data.message);
        }
    })
    .catch(console.error);
};

window.loadPossibleSellables = async function ()
{
    if (!POSSIBLE_SELLABLES_URL)
    {
        window.possibleSellables = [];
        window.possibleSuppliers = [];
        window.possibleOrders = [];

        return;
    }

    const res = await fetch(POSSIBLE_SELLABLES_URL, {headers: {'Accept': 'application/json'}});
    if (!res.ok) throw new Error('HTTP ' + res.status + ' on ' + POSSIBLE_SELLABLES_URL);

    const data = await res.json();

    window.possibleSellables = Array.isArray(data.possibleSellables) ? data.possibleSellables : [];
    window.possibleSuppliers = Array.isArray(data.possibleSuppliers) ? data.possibleSuppliers : [];
    window.possibleOrders = Array.isArray(data.possibleOrders) ? data.possibleOrders : [];
};

window.escapeHtml = function (value)
{
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

window.formatTimeInputValue = function (date)
{
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
};

window.parseTimeInputValue = function (value)
{
    const parts = String(value).split('T');
    const dateParts = parts[0].split('-').map(Number);
    const timeParts = parts[1].split(':').map(Number);

    return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1], 0, 0);
};

window.parseVisDateTime = function (value)
{
    const parts = String(value).trim().split(/[\s:-]/);

    return {
        hours: parseInt(parts[3], 10),
        minutes: parseInt(parts[4], 10) || 0,
        seconds: parseInt(parts[5], 10) || 0,
    };
};

window.isTimelineHiddenDate = function (date, hiddenDates)
{
    if (!Array.isArray(hiddenDates) || hiddenDates.length === 0)
        return false;

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    for (let i = 0; i < hiddenDates.length; i++)
    {
        const hidden = hiddenDates[i];
        const startParts = window.parseVisDateTime(hidden.start);
        const endParts = window.parseVisDateTime(hidden.end);

        const rangeStart = new Date(dayStart);
        rangeStart.setHours(startParts.hours, startParts.minutes, startParts.seconds, 0);

        const rangeEnd = new Date(dayStart);
        if (endParts.hours === 24)
            rangeEnd.setDate(rangeEnd.getDate() + 1);

        rangeEnd.setHours(endParts.hours === 24 ? 0 : endParts.hours, endParts.minutes, endParts.seconds, 0);

        if (date >= rangeStart && date < rangeEnd)
            return true;
    }

    return false;
};

window.getTimelineVisibleWindowMs = function ()
{
    const windowRange = window.timeline.getWindow();

    return windowRange.end.getTime() - windowRange.start.getTime();
};

window.getTimelineSchedulingRules = function ()
{
    return {
        hiddenDates: options.hiddenDates || [],
        timeAxis: options.timeAxis || {scale: 'hour', step: 4},
    };
};

window.snapTimelineCreateDatetime = function (clickDate)
{
    const schedulingRules = window.getTimelineSchedulingRules();
    const hiddenDates = schedulingRules.hiddenDates;
    const timeAxis = schedulingRules.timeAxis;
    const step = timeAxis.step || 1;
    const scale = timeAxis.scale || 'hour';
    const click = new Date(clickDate.getTime());

    click.setSeconds(0, 0);
    click.setMilliseconds(0);

    let candidate = new Date(click.getTime());

    if (scale === 'hour')
    {
        candidate.setMinutes(0);
        candidate.setHours(Math.floor(candidate.getHours() / step) * step);

        while (candidate >= click || window.isTimelineHiddenDate(candidate, hiddenDates))
            candidate.setHours(candidate.getHours() - step);
    }
    else if (scale === 'day')
    {
        candidate.setHours(8, 0, 0, 0);

        if (candidate >= click)
            candidate.setDate(candidate.getDate() - step);

        while (candidate >= click || window.isTimelineHiddenDate(candidate, hiddenDates))
        {
            candidate.setDate(candidate.getDate() - step);
            candidate.setHours(8, 0, 0, 0);
        }
    }
    else if (scale === 'month')
    {
        candidate.setDate(1);
        candidate.setHours(8, 0, 0, 0);

        if (candidate >= click)
            candidate.setMonth(candidate.getMonth() - step);

        while (candidate >= click || window.isTimelineHiddenDate(candidate, hiddenDates))
        {
            candidate.setMonth(candidate.getMonth() - step);
            candidate.setHours(8, 0, 0, 0);
        }
    }
    else if (scale === 'year')
    {
        candidate.setMonth(0, 1);
        candidate.setHours(8, 0, 0, 0);

        if (candidate >= click)
            candidate.setFullYear(candidate.getFullYear() - step);

        while (candidate >= click || window.isTimelineHiddenDate(candidate, hiddenDates))
        {
            candidate.setFullYear(candidate.getFullYear() - step);
            candidate.setHours(8, 0, 0, 0);
        }
    }

    return candidate;
};

window.getTimelineCreateEndDatetime = function (startDate)
{
    return new Date(startDate.getTime() + (window.getTimelineVisibleWindowMs() * 0.20));
};

window.openTimelineCreateRowPopup = async function (datetime, groupId)
{
    if (!STORE_TIMELINE_ROW_URL)
    {
        if (typeof window.addDangerNotification === 'function')
            window.addDangerNotification('Store endpoint timeline non configurato');

        return;
    }

    await window.loadPossibleSellables();

    const template = document.getElementById('timeline-item-modal-template');
    if (!template)
        return;

    const clone = template.firstElementChild.cloneNode(true);
    const modalId = 'timeline-create-modal-' + Date.now();
    clone.id = modalId;

    const modalTitleEl = clone.querySelector('.uk-modal-title');
    const modalContent = clone.querySelector('.timeline-modal-content');
    const footer = clone.querySelector('.uk-card-footer');

    if (footer)
        footer.remove();

    const selectedSellable = groupId
        ? window.possibleSellables.find(function (sellable) { return String(sellable.id) === String(groupId); })
        : null;
    const selectedSupplier = groupId
        ? window.possibleSuppliers.find(function (supplier) { return String(supplier.id) === String(groupId); })
        : null;

    modalTitleEl.textContent = selectedSellable
        ? 'Nuova riga timeline — ' + selectedSellable.name
        : (selectedSupplier ? 'Nuova riga timeline — ' + selectedSupplier.name : 'Nuova riga timeline');

    const startDatetime = window.snapTimelineCreateDatetime(datetime);
    const endDatetime = window.getTimelineCreateEndDatetime(startDatetime);
    const defaultStartValue = window.formatTimeInputValue(startDatetime);
    const defaultEndValue = window.formatTimeInputValue(endDatetime);
    const sellablesOptions = window.possibleSellables.map(function (sellable) {
        return `<option value="${window.escapeHtml(sellable.id)}">${window.escapeHtml(sellable.name)}</option>`;
    }).join('');
    const suppliersOptions = window.possibleSuppliers.map(function (supplier) {
        return `<option value="${window.escapeHtml(supplier.id)}">${window.escapeHtml(supplier.name)}</option>`;
    }).join('');
    const sellableFieldHtml = window.possibleSellables.length
        ? `<div class="uk-margin">
                <label class="uk-form-label" for="timeline-create-sellable">Sellable</label>
                <div class="uk-form-controls">
                    <select id="timeline-create-sellable" class="uk-select" name="sellable_id" required>
                        <option value="">Seleziona sellable</option>
                        ${sellablesOptions}
                    </select>
                </div>
            </div>`
        : '';
    const supplierFieldHtml = window.possibleSuppliers.length
        ? `<div class="uk-margin">
                <label class="uk-form-label" for="timeline-create-supplier">Fornitore</label>
                <div class="uk-form-controls">
                    <select id="timeline-create-supplier" class="uk-select" name="supplier_id" required>
                        <option value="">Seleziona fornitore</option>
                        ${suppliersOptions}
                    </select>
                </div>
            </div>`
        : '';
    const ordersOptions = window.possibleOrders.map(function (order) {
        return `<option value="${window.escapeHtml(order.id)}">${window.escapeHtml(order.name)}</option>`;
    }).join('');
    const orderFieldHtml = window.possibleOrders.length
        ? `<div class="uk-margin">
                <label class="uk-form-label" for="timeline-create-order">Commessa</label>
                <div class="uk-form-controls">
                    <select id="timeline-create-order" class="uk-select" name="order_id" required>
                        <option value="">Seleziona commessa</option>
                        ${ordersOptions}
                    </select>
                </div>
            </div>`
        : '';

    modalContent.innerHTML = `
        <form class="uk-form-stacked timeline-create-row-form">
            <div class="uk-margin">
                <label class="uk-form-label" for="timeline-create-starts-at">Inizio</label>
                <div class="uk-form-controls">
                    <input id="timeline-create-starts-at" class="uk-input" type="datetime-local" name="starts_at" value="${defaultStartValue}" required>
                </div>
            </div>
            <div class="uk-margin">
                <label class="uk-form-label" for="timeline-create-ends-at">Fine</label>
                <div class="uk-form-controls">
                    <input id="timeline-create-ends-at" class="uk-input" type="datetime-local" name="ends_at" value="${defaultEndValue}" required>
                </div>
            </div>
            ${orderFieldHtml}
            ${sellableFieldHtml}
            ${supplierFieldHtml}
            <div class="uk-margin uk-text-right">
                <button type="submit" class="uk-button uk-button-primary">Salva</button>
            </div>
        </form>
    `;

    document.body.appendChild(clone);

    const modal = UIkit.modal('#' + modalId);
    modal.show();

    const form = clone.querySelector('.timeline-create-row-form');
    const startsAtInput = clone.querySelector('#timeline-create-starts-at');
    const sellableSelect = clone.querySelector('#timeline-create-sellable');
    const supplierSelect = clone.querySelector('#timeline-create-supplier');

    if (sellableSelect && selectedSellable)
        sellableSelect.value = String(selectedSellable.id);

    if (supplierSelect && selectedSupplier)
        supplierSelect.value = String(selectedSupplier.id);

    if (startsAtInput)
        setTimeout(function () { startsAtInput.focus(); }, 0);

    form.addEventListener('submit', async function (event)
    {
        event.preventDefault();

        const formData = new FormData(form);
        const payload = {
            starts_at: window.parseTimeInputValue(formData.get('starts_at')).toISOString(),
            ends_at: window.parseTimeInputValue(formData.get('ends_at')).toISOString(),
        };

        if (window.possibleSellables.length)
            payload.sellable_id = formData.get('sellable_id');

        if (window.possibleSuppliers.length)
            payload.supplier_id = formData.get('supplier_id');

        if (window.possibleOrders.length)
            payload.order_id = formData.get('order_id');

        const saveButton = form.querySelector('button[type="submit"]');
        if (saveButton)
            saveButton.disabled = true;

        try
        {
            const res = await fetch(STORE_TIMELINE_ROW_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok || data.success !== true)
                throw new Error(data.message || ('HTTP ' + res.status));

            if (typeof window.addSuccessNotification === 'function')
                window.addSuccessNotification(data.message || 'Riga creata');

            modal.hide();
            await window.fetchTimeline();
        }
        catch (error)
        {
            if (typeof window.addDangerNotification === 'function')
                window.addDangerNotification(error.message || 'Errore durante il salvataggio');
        }
        finally
        {
            if (saveButton)
                saveButton.disabled = false;
        }
    });

    clone.addEventListener('hidden', function () {
        modal.$destroy(true);
        clone.remove();
    });
};

var options = {
    stack: true,
    showTooltips: false,

        locale: 'it',
        format: {
            minorLabels: {
                minute: 'HH:mm',
                hour: 'HH:mm',
            },
            majorLabels: {
                hour: 'ddd D MMM',
            }
        },

        hiddenDates: [
            {start: '2025-01-01 00:00:00', end: '2025-01-01 08:00:00', repeat: 'daily'},
            {start: '2025-01-01 20:00:00', end: '2025-01-01 24:00:00', repeat: 'daily'}
        ],

        timeAxis: {scale: 'hour', step: 4},

        template: function (item) {
            const wrapper = document.createElement('div');
            // Save state of missing title before fallback
            const hadMissingTitle = (!item.title || item.title === '');
            // Fallback title from window if item.title is missing
            if (hadMissingTitle && typeof window.timelineDefaultTitle !== 'undefined')
            {
                item.title = window.timelineDefaultTitle;
            }

            wrapper.className = 'timeline-item';

            // Add dynamic itemType as CSS class (if provided by backend JSON)
            if (item.itemType)
                wrapper.classList.add(item.itemType);

            wrapper.dataset.itemId = item.id;

            // --- Move style from vis-item to wrapper ---
            if (item.style)
            {
                // If style is a CSS string (default vis behavior)
                if (typeof item.style === 'string')
                {
                    wrapper.style.cssText += item.style;
                    item.style = null; // prevent vis from applying it to .vis-item
                }
                // If style is an object coming from backend
                else if (typeof item.style === 'object')
                {
                    if (item.style.backgroundColor)
                        wrapper.style.backgroundColor = item.style.backgroundColor;

                    if (item.style.textColor)
                        wrapper.style.color = item.style.textColor;
                }
            }

            // --- Fallback background color if none provided ---
            if (!wrapper.style.backgroundColor) {
                wrapper.style.backgroundColor = '#607d8b'; // default fallback color
                wrapper.style.color = '#ffffff';
            }

            let linksHtml = '';

            if(Array.isArray(item.links))
                linksHtml = item.links.map(function(link)
                    {
                        if(link.target === 'iframe')
                            return window.timelineLinkIframe(link);

                        if(link.target)
                            return window.timelineLinkTarget(link, link.target);

                        return window.timelineLinkTarget(link, false);

                    }).join('');

            // Add rightLinksHtml
            let rightLinksHtml = '';

            if (Array.isArray(item.rightLinks))
                rightLinksHtml = item.rightLinks.map(function(link)
                {
                    if (link.target === 'iframe')
                        return window.timelineLinkIframe(link);

                    if (link.target)
                        return window.timelineLinkTarget(link, link.target);

                    return window.timelineLinkTarget(link, false);
                }).join('');

                const tooltip = item.popupTitle ? ` uk-tooltip="${item.popupTitle}"` : '';

            const changeSupplierLink = Array.isArray(item.links)
                ? item.links.find(function (link) { return link.faIcon === 'shuffle'; })
                : null;

            if (changeSupplierLink?.url)
                wrapper.dataset.changeSupplierUrl = changeSupplierLink.url;

            wrapper.innerHTML = `
                <strong ${tooltip}>${item.title}</strong>
            `;

            // If title was missing, mark first button as danger
            if (hadMissingTitle)
            {
                const firstButton = wrapper.querySelector('.uk-button, button');
                if (firstButton)
                    firstButton.classList.add('uk-button-danger');
            }

            // if(item.progress)
            // {
            //     const progress = document.createElement('progress');
            //
            //     progress.className = 'uk-progress';
            //     progress.value = item.progress;
            //     progress.max = 100;
            //
            //     wrapper.appendChild(progress);
            // }

            return wrapper;
        },

        groupTemplate: function(group) {
            // Allows HTML in group labels (buttons/links). Uses delegated click handler below.
            const wrapper = document.createElement('div');
            wrapper.className = 'timeline-group-label uk-padding-small';

            const title = group.content ?? group.title ?? group.label ?? '';

            // You can add per-group actions via `group.actions` (array)
            let actionsHtml = '';

            if (Array.isArray(group.actions) && group.actions.length) {
                actionsHtml = group.actions.map(a => {
                    const icon = a.faIcon ?? 'bolt';
                    const text = a.text ?? '';
                    const titleAttr = a.title ? ` title="${a.title}"` : '';
                    const data = a.payload ? ` data-payload='${JSON.stringify(a.payload).replace(/'/g, "&apos;")}'` : '';
                    const href = a.url ? ` href="${a.url}"` : '';
                    const target = a.target ? ` target="${a.target}"` : '';
                    const rel = a.target ? ' rel="noopener"' : '';

                    // If url is provided, render as link; otherwise render as button with data-action
                    if (a.url) {
                        return `<a class="uk-button uk-button-default uk-button-small" ${href}${target}${rel}${titleAttr}${data}>${text} <i class="fa fa-${icon}"></i></a>`;
                    }

                    return `<button type="button" class="uk-button uk-button-default uk-button-small timeline-group-action" data-action="${a.action ?? 'action'}"${titleAttr}${data} onclick="event.stopPropagation();">${text} <i class="fa fa-${icon}"></i></button>`;
                }).join('');
            }

            // --- Group summary (computed from items) ---
            const groupItems = items.get().filter(item => item.group === group.id);

            const owners = new Set();
            let totalSeconds = 0;
            let firstStart = null;
            let lastEnd = null;
            let missingOperatorCount = 0;

            groupItems.forEach(item => {
                // distinct owner (future-proof: ownerId from backend)
                owners.add(item.ownerId ?? item.title ?? '__unknown__');

                if (!item.title || item.title === '')
                    missingOperatorCount++;

                const start = new Date(item.start);
                const end = new Date(item.end);

                if (!firstStart || start < firstStart)
                    firstStart = start;

                if (!lastEnd || end > lastEnd)
                    lastEnd = end;

                totalSeconds += (end - start) / 1000;
            });

            const totalHours = (totalSeconds / 3600).toFixed(2);

            const formatDate = d =>
                d ? `${d.toLocaleDateString()} ${d.toLocaleTimeString().slice(0,5)}` : '—';

            wrapper.innerHTML = `
				<div class="uk-flex uk-flex-middle uk-flex-between uk-margin-small-bottom">
					<div class="timeline-group-title">${title}</div>

					<div class="timeline-group-actions uk-grid-small uk-child-width-auto" uk-grid>
                        <button
                            type="button"
                            class="uk-button uk-button-default uk-button-small timeline-group-summary-toggle"
                            uk-toggle="target: #group-summary-${group.id}"
                            data-group-id="${group.id}"
                        >
                            <i class="fa-solid fa-toggle-on"></i>
                        </button>
						${actionsHtml}
					</div>
				</div>

                <div
                    id="group-summary-${group.id}"
                    class="timeline-group-summary uk-text-small uk-text-muted"
                    hidden
                >
                    <div><strong>Operators:</strong> ${owners.size}</div>
                    <div><strong>Total time:</strong> ${totalHours} h</div>
                    <div><strong>From:</strong> ${formatDate(firstStart)}</div>
                    <div><strong>To:</strong> ${formatDate(lastEnd)}</div>
                    <div><strong>Missing operator:</strong> ${missingOperatorCount}</div>
                </div>
`;

            // Recalculate group height after UIkit toggle animation
            const toggleBtn = wrapper.querySelector('.timeline-group-summary-toggle');

            if (toggleBtn)
            {
                toggleBtn.addEventListener('click', function () {
                    // UIkit default toggle animation ~200ms
                    setTimeout(function () {
                        if (window.timeline && typeof window.timeline.redraw === 'function') {
                            window.timeline.redraw();
                        }
                    }, 220);
                });
            }

            return wrapper;
        },

        // Enable time edits and fire when end is resized
        editable: {
            add: false,
			updateTime: true,
			updateGroup: false,
			remove: false
		},

        onMove: function (item, callback)
        {
            window.onTimelineEndResize(item);

            callback(item);
        },


    };

    window.timelineTimeAxis = {
        scale: options.timeAxis.scale,
        step: options.timeAxis.step,
    };

    function addWeekendBackgrounds(timeline, items) {

        function generateWeekends(start, end) {
            const bg = [];

            // clona le date per sicurezza
            const d = new Date(start);
            d.setHours(0,0,0,0); // 🔥 normalizza a mezzanotte

            const endDate = new Date(end);
            endDate.setHours(0,0,0,0);

            while (d < endDate) {
                const dow = d.getDay(); // 0 = domenica, 6 = sabato

                if (dow === 0 || dow === 6) {

                    const next = new Date(d);
                    next.setDate(next.getDate() + 1);
                    next.setHours(0,0,0,0); // 🔥 anche l’end deve essere mezzanotte

                    bg.push({
                        id: 'weekend-' + d.toISOString(),
                        start: new Date(d),
                        end: next,
                        type: 'background',
                        className: dow === 6 ? 'weekend-saturday' : 'weekend-sunday'
                    });
                }

                d.setDate(d.getDate() + 1);
                d.setHours(0,0,0,0); // 🔥 importantissimo
            }

            return bg;
        }

        // prima generazione
        const range = timeline.getWindow();
        items.add(generateWeekends(range.start, range.end));

        // rigenera quando l’utente fa zoom o pan
        timeline.on('rangechanged', function (props) {

            // elimina i vecchi weekend
            items.forEach(i => {
                if (i.type === 'background' && i.className?.startsWith('weekend')) {
                    items.remove(i.id);
                }
            });

            // aggiungi i nuovi
            items.add(generateWeekends(props.start, props.end));
        });
    }

    window.setTimelineData = function (data)
    {
        const currentWindow = timeline ? timeline.getWindow() : null;

        if (data.groups)
        {
            groups.clear();
            groups.update(data.groups);
        }

        if (data.items)
        {
            items.clear();
            items.update(data.items);
        }

        // Create the timeline only once; subsequent calls only update datasets
        if (!timeline)
        {
            // Calcola finestra iniziale PRIMA di creare la timeline (evita il fit automatico di vis.js)
            var zoomDays = typeof TIMELINE_ZOOM_DAYS !== 'undefined' ? TIMELINE_ZOOM_DAYS : 14;
            var emptyTimelineZoomDays = 35;
            var zoomMs = zoomDays * 24 * 60 * 60 * 1000;
            var emptyTimelineZoomMs = emptyTimelineZoomDays * 24 * 60 * 60 * 1000;
            var storedWindow = getStoredTimelineWindow();
            var itemIds = items.getIds();
            var windowStart, windowEnd;
            if (storedWindow) {
                windowStart = storedWindow.start;
                windowEnd = storedWindow.end;
            } else if (itemIds.length > 0) {
                var minStart = Infinity;
                itemIds.forEach(function(id) {
                    var it = items.get(id);
                    if (it.start) { var s = new Date(it.start).getTime(); if (s < minStart) minStart = s; }
                });
                windowStart = new Date(minStart !== Infinity ? minStart : Date.now());
            } else {
                windowStart = new Date();
                windowEnd = new Date(windowStart.getTime() + emptyTimelineZoomMs);
            }

            if (! windowEnd)
                windowEnd = new Date(windowStart.getTime() + zoomMs);

            var timelineOptions = Object.assign({}, options, { start: windowStart, end: windowEnd });
            timeline = new vis.Timeline(container, items, groups, timelineOptions);

            timeline.on('doubleClick', function (properties)
            {
                if (properties && properties.item)
                    return;

                if (!properties || !properties.time)
                    return;

                window.openTimelineCreateRowPopup(new Date(properties.time), properties.group).catch(function (error)
                {
                    if (typeof window.addDangerNotification === 'function')
                        window.addDangerNotification(error.message || 'Errore apertura popup timeline');
                });
            });

            addWeekendBackgrounds(timeline, items);

            timeline.on('rangechanged', function (props)
            {
                if (props && props.start && props.end)
                    storeTimelineWindow(props.start, props.end);

                // wait a tick so vis.js has time to (re)render the axis labels
                setTimeout(function () {
                    document
                        .querySelectorAll('#timelinecontainer .vis-time-axis .vis-text.vis-major')
                        .forEach(el =>
                        {
                            const text  = el.textContent.trim().toLowerCase();
                            const label = text.split(' ')[0]; // e.g. "lun", "mar", ...

                            // add a stable class like .day-lun, .day-mar, ...
                            el.classList.add('day-' + label);
                        });
                }, 0);

                if (props && props.start && props.end) {
                    const millis = props.end - props.start;
                    const days = millis / (1000 * 60 * 60 * 24);

                    const width = container ? (container.clientWidth || container.offsetWidth || 1) : 1;
                    const daysPerPixel = days / width; // e.g. 0.02 ≈ 1 day every 50px;

                    // Zoom thresholds (daysPerPixel):
                    // - zoomed in: hours
                    // - slight zoom out: days (step 1)
                    // - more zoom out: days (weekly ticks)
                    // - zoomed out: months (abbreviated)
                    // - extreme: years
                    if (daysPerPixel > 1) {
                        // extreme zoomed out: show years
                        window.timelineTimeAxis = { scale: 'year', step: 1 };
                        timeline.setOptions({
                            timeAxis: window.timelineTimeAxis,
                            format: {
                                minorLabels: { year: 'YY' },
                                majorLabels: { year: 'YYYY' }
                            }
                        });
                    } else if (daysPerPixel > 0.35) {
                        // zoomed out: show months (abbreviated)
                        window.timelineTimeAxis = { scale: 'month', step: 1 };
                        timeline.setOptions({
                            timeAxis: window.timelineTimeAxis,
                            format: {
                                minorLabels: { month: 'MMM' },
                                majorLabels: { month: 'MMM YY' }
                            }
                        });
                    } else if (daysPerPixel > 0.023) {
                        // more zoomed out: show weekly ticks (keeps weekday context without clutter)
                        window.timelineTimeAxis = { scale: 'day', step: 7 };
                        timeline.setOptions({
                            timeAxis: window.timelineTimeAxis,
                            format: {
                                minorLabels: { day: 'ddd D' },
                                majorLabels: { day: 'MMM YY' }
                            }
                        });
                    } else if (daysPerPixel > 0.012) {
                        // slight zoom out: show daily ticks (you still see weekdays)
                        window.timelineTimeAxis = { scale: 'day', step: 1 };
                        timeline.setOptions({
                            timeAxis: window.timelineTimeAxis,
                            format: {
                                minorLabels: { day: 'ddd D' },
                                majorLabels: { day: 'MMM YY' }
                            }
                        });
                    } else {
                        // zoomed in: show hours
                        window.timelineTimeAxis = { scale: 'hour', step: 4 };
                        timeline.setOptions({
                            timeAxis: window.timelineTimeAxis,
                            format: {
                                minorLabels: {
                                    minute: 'HH:mm',
                                    hour: 'HH:mm'
                                },
                                majorLabels: {
                                    hour: 'ddd D MMM'
                                }
                            }
                        });
                    }
                }
            });
        }
        else if (currentWindow)
        {
            timeline.setWindow(currentWindow.start, currentWindow.end, {animation: false});
        }
    }



    window.loadTimelineData = async function ()
    {
        return await fetchJSON(API_URL);
    };

    window.fetchTimeline = async function ()
    {
        try
        {
            // Expected shape: { groups: [...], items: [...] }

            window.setTimelineData(
                await window.loadTimelineData()
            );


        } catch (e)
        {
            window.addDangerNotification('Failed to load data:', e);
        }
    };

    ;(async function bootstrapTimeline()
    {
        try
        {
            await window.loadPossibleSellables();
        }
        catch (error)
        {
            console.error(error);

            if (typeof window.addDangerNotification === 'function')
                window.addDangerNotification(error.message || 'Errore caricamento sellables timeline');
        }

        await window.fetchTimeline();
    })();

</script>
