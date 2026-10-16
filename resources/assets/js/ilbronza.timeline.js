/**
 * IlBronza Timeline page script.
 * Requires vis-timeline (global `vis`) and jQuery (`$`) loaded before this file.
 * Reads runtime config from #timeline-config (rendered by timeline::_timelineConfig).
 */
    window.timelineDefaultTitle = 'N.D.';

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

                const itemEl = wrapper.closest('.vis-item');

                if (itemEl)
                    clearTimeout(getLiveTimers(itemEl).hide);

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

    window.openTimelineItemLinksModal = async function(button)
    {
        const itemId = button.dataset.itemId;
        if (!itemId) return;

        const item = items.get(itemId);
        if (!item) return;

        const itemModalUrl = item.modalUrl || '';

        if (!itemModalUrl)
            return;

        const template = document.getElementById('timeline-item-modal-template');
        if (!template) return;

        const clone = template.firstElementChild.cloneNode(true);
        const modalId = 'timeline-modal-' + Date.now();
        clone.id = modalId;

        const modalContent = clone.querySelector('.timeline-modal-content');
        const modalTitleEl = clone.querySelector('.uk-modal-title');

        modalTitleEl.textContent = item.popupTitle ?? item.title ?? window.timelineDefaultTitle;
        modalContent.innerHTML = '<div class="uk-text-center uk-padding"><div uk-spinner></div></div>';

        const headerActionsEl = clone.querySelector('.timeline-modal-header-actions');

        if (item.deleteUrl && headerActionsEl)
        {
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'uk-button uk-button-danger uk-button-small timeline-modal-delete-button';
            deleteBtn.innerHTML = '<i class="fa fa-trash"></i>';
            deleteBtn.setAttribute('uk-tooltip', 'Elimina riga timeline');

            deleteBtn.onclick = async function(e)
            {
                e.stopPropagation();

                if (! confirm('Eliminare questa riga della timeline?'))
                    return;

                deleteBtn.disabled = true;

                const deleteCsrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

                const deleteHeaders = {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                };

                if (deleteCsrfToken)
                    deleteHeaders['X-CSRF-TOKEN'] = deleteCsrfToken;

                try
                {
                    const deleteResponse = await fetch(item.deleteUrl, {
                        method: 'DELETE',
                        headers: deleteHeaders,
                    });

                    if (! deleteResponse.ok)
                        throw new Error('HTTP ' + deleteResponse.status);

                    UIkit.modal('#' + modalId).hide();

                    window.fetchTimeline();
                }
                catch (error)
                {
                    deleteBtn.disabled = false;
                    alert('Errore durante l\'eliminazione della riga timeline');
                }
            };

            headerActionsEl.appendChild(deleteBtn);
        }

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

        const response = await fetch(itemModalUrl, {
            method: 'GET',
            headers: {
                'Accept': 'text/html',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        modalContent.innerHTML = await response.text();

        if (typeof UIkit !== 'undefined' && typeof UIkit.update === 'function')
            UIkit.update(modalContent);
    };

    window.openTimelineGroupModal = async function(button)
    {
        const groupId = button.dataset.groupId;
        if (!groupId) return;

        const group = groups.get(groupId);
        if (!group || !group.modalUrl) return;

        const template = document.getElementById('timeline-item-modal-template');
        if (!template) return;

        const clone = template.firstElementChild.cloneNode(true);
        const modalId = 'timeline-group-modal-' + Date.now();
        clone.id = modalId;

        const modalContent = clone.querySelector('.timeline-modal-content');
        const modalTitleEl = clone.querySelector('.uk-modal-title');
        const modalFooter = clone.querySelector('.uk-card-footer');

        modalTitleEl.textContent = group.name ?? group.content ?? window.timelineDefaultTitle;
        modalContent.innerHTML = '<div class="uk-text-center uk-padding"><div uk-spinner></div></div>';

        if (modalFooter)
            modalFooter.remove();

        document.body.appendChild(clone);

        const modal = UIkit.modal('#' + modalId);
        modal.show();

        clone.addEventListener('hidden', function () {
            modal.$destroy(true);
            clone.remove();
        });

        const response = await fetch(group.modalUrl, {
            method: 'GET',
            headers: {
                'Accept': 'text/html',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        modalContent.innerHTML = await response.text();

        if (typeof UIkit !== 'undefined' && typeof UIkit.update === 'function')
            UIkit.update(modalContent);
    };

    window.addEventListener('sis-lightboxClosed', function() {
        // Il pannello .uk-lightbox.uk-open resta nel DOM dopo la chiusura
        // dell'iframe: isTimelineLightboxOpen() rimarrebbe true per sempre,
        // bloccando ogni rimozione dei pulsanti live.
        document.querySelectorAll('.uk-lightbox').forEach(function(panel)
        {
            panel.remove();
        });

        removeAllLiveGroups();

        window.fetchTimeline();
    });

    const timelineConfig = JSON.parse(document.getElementById('timeline-config').textContent);
    const API_URL = timelineConfig.apiUrl;
    const UPDATE_URL = timelineConfig.updateUrl || '';
    const CREATE_ROW_FORM_URL = timelineConfig.createRowFormUrl || '';

    if (! CREATE_ROW_FORM_URL)
        alert('Form creazione riga timeline non configurato "timelineConfig.createRowFormUrl"');

    const TIMELINE_ZOOM_DAYS = timelineConfig.zoomDays;
    const TIMELINE_DAY_MS = 24 * 60 * 60 * 1000;
    const TIMELINE_MAX_ZOOM_MONTHS = 18;
    const TIMELINE_MAX_ZOOM_MS = TIMELINE_MAX_ZOOM_MONTHS * (365.25 / 12) * TIMELINE_DAY_MS;
    const TIMELINE_VIEW_STORAGE_KEY = [
        'timeline-view',
        window.location.origin,
        window.location.pathname,
        window.location.search
    ].join(':');
    let timelineViewStorageTimer = null;

    function clampTimelineWindowToMaxZoom(start, end)
    {
        const startDate = new Date(start);
        const endDate = new Date(end);

        if (! Number.isFinite(startDate.getTime()) || ! Number.isFinite(endDate.getTime()) || endDate <= startDate)
            return null;

        const windowMs = endDate.getTime() - startDate.getTime();
        if (windowMs <= TIMELINE_MAX_ZOOM_MS)
            return {start: startDate, end: endDate};

        const middle = startDate.getTime() + (windowMs / 2);
        const halfMaxZoom = TIMELINE_MAX_ZOOM_MS / 2;

        return {
            start: new Date(middle - halfMaxZoom),
            end: new Date(middle + halfMaxZoom)
        };
    }

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

            return clampTimelineWindowToMaxZoom(start, end);
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

            clearTimelineSelection();
        });

        // Click fuori dalla timeline: esce dalla modalità modifica e l'item
        // torna al colore di base (la classe .vis-selected viene rimossa).
        document.addEventListener('pointerdown', function (event)
        {
            if (!timeline)
                return;

            if (container.contains(event.target))
                return;

            // Non deselezionare mentre si opera su modali/lightbox aperti dall'item.
            if (event.target.closest('.uk-modal, .uk-lightbox, .uk-drop, .uk-dropdown, .uk-notification'))
                return;

            clearTimelineSelection();
        }, true);

        document.addEventListener('keydown', function (event)
        {
            if (event.key === 'Escape')
                clearTimelineSelection();
        });
    }

    // Toglie la selezione (= modalità modifica) da tutti gli item.
    // Il colore di base non va salvato da nessuna parte: non viene mai
    // sovrascritto, la tinta di modifica è solo un overlay CSS legato a
    // .vis-selected. Basta togliere la selezione perché torni l'originale.
    function clearTimelineSelection()
    {
        if (timeline && typeof timeline.setSelection === 'function')
            timeline.setSelection([]);

        // Sicurezza: se vis dovesse lasciare la classe appesa dopo un redraw,
        // la si rimuove a mano.
        if (container)
            container.querySelectorAll('.vis-item.vis-selected').forEach(function (el)
            {
                el.classList.remove('vis-selected');
            });
    }

    // Colore/stile originale di ogni item, indicizzato per id.
    // Serve perché il template azzera item.style dopo il primo render.
    const timelineBaseStyles = new Map();

    // Create a DataSet (allows two way data-binding)
    var items = new vis.DataSet([]);
    var groups = new vis.DataSet([]);
    var timeline = null;
    var timelineAutomaticallyHiddenGroupIds = new Set();


    // --- LIVE button inside timeline-item on hover (direct binding) ---
    const LIVE_GROUP_SELECTOR = '.timeline-live-inline-group';

    // Timer per singolo item: usare variabili condivise faceva sì che
    // l'hover su un item annullasse il timer di nascondimento di un altro,
    // lasciando i pulsanti appesi.
    const liveItemTimers = new WeakMap();

    function getLiveTimers(itemEl)
    {
        let timers = liveItemTimers.get(itemEl);

        if (!timers)
        {
            timers = { show: null, hide: null };
            liveItemTimers.set(itemEl, timers);
        }

        return timers;
    }

    function getLiveGroupForItem(itemEl)
    {
        return Array.from(document.querySelectorAll(LIVE_GROUP_SELECTOR))
            .find(group => group._timelineItemEl === itemEl) || null;
    }

    function isLiveGroupTarget(group, target)
    {
        return Boolean(target && group && (target === group || group.contains(target)));
    }

    function isLiveGroupActive(group)
    {
        const itemEl = group?._timelineItemEl;

        return Boolean(
            group?.matches(':hover')
            || (itemEl?.isConnected && itemEl.matches(':hover'))
        );
    }

    function removeLiveGroup(group)
    {
        if (!group)
            return;

        const itemEl = group._timelineItemEl;

        if (itemEl)
        {
            const timers = getLiveTimers(itemEl);

            clearTimeout(timers.show);
            clearTimeout(timers.hide);
        }

        group.remove();
    }

    function scheduleLiveGroupRemoval(group)
    {
        if (!group)
            return;

        const itemEl = group._timelineItemEl;

        if (!itemEl)
        {
            removeLiveGroup(group);
            return;
        }

        const timers = getLiveTimers(itemEl);

        clearTimeout(timers.hide);

        timers.hide = setTimeout(function()
        {
            if (window.isTimelineLightboxOpen())
                return;

            if (!isLiveGroupActive(group))
                removeLiveGroup(group);
        }, 200);
    }

    function positionLiveGroup(group, itemEl)
    {
        if (!container || !group || !itemEl)
            return;

        const itemRect = itemEl.closest('.vis-item')?.getBoundingClientRect()
            || itemEl.getBoundingClientRect();
        const viewportPadding = 4;
        const gap = 8;
        const groupWidth = group.offsetWidth;
        const groupHeight = group.offsetHeight;
        const preferredLeft = itemRect.right + gap;
        const preferredTop = itemRect.top + ((itemRect.height - groupHeight) / 2);
        const maxLeft = window.innerWidth - groupWidth - viewportPadding;
        const maxTop = window.innerHeight - groupHeight - viewportPadding;

        group.style.left = Math.max(
            viewportPadding,
            Math.min(preferredLeft, maxLeft)
        ) + 'px';
        group.style.top = Math.max(
            viewportPadding,
            Math.min(preferredTop, maxTop)
        ) + 'px';
    }

    function repositionLiveGroups()
    {
        document.querySelectorAll(LIVE_GROUP_SELECTOR).forEach(function(group)
        {
            if (group._timelineItemEl?.isConnected)
                positionLiveGroup(group, group._timelineItemEl);
        });
    }

    // Rimuove tutti i gruppi di pulsanti tranne quello passato come eccezione.
    // È la rete di sicurezza per i pointerleave persi (mouse veloce, item
    // ridisegnato da vis-timeline mentre è sotto al cursore, uscita dalla finestra).
    function removeAllLiveGroups(exceptGroup)
    {
        if (window.isTimelineLightboxOpen())
            return;

        document.querySelectorAll(LIVE_GROUP_SELECTOR).forEach(function(group)
        {
            if (exceptGroup && group === exceptGroup)
                return;

            removeLiveGroup(group);
        });
    }

    function attachLiveHoverHandlers()
    {
        document.querySelectorAll('#timelinecontainer .timeline-item').forEach(function(itemEl)
        {
            // Evita di riagganciare i listener a ogni mutazione del DOM:
            // vis-timeline ridisegna di continuo e i listener si accumulavano.
            if (itemEl.dataset.liveHoverBound === '1')
                return;

            itemEl.dataset.liveHoverBound = '1';

            itemEl.addEventListener('pointerenter', function()
            {
                const timers = getLiveTimers(itemEl);

                clearTimeout(timers.show);
                clearTimeout(timers.hide);

                if (!itemEl.dataset.itemId) return;

                // Entrando su un item, ripulisce i pulsanti rimasti su altri item.
                const currentGroup = getLiveGroupForItem(itemEl);

                removeAllLiveGroups(currentGroup);

                if (currentGroup)
                {
                    clearTimeout(timers.hide);
                    positionLiveGroup(currentGroup, itemEl);
                    return;
                }

                const changeSupplierUrl = itemEl.dataset.changeSupplierUrl || null;
                const splitUrl = itemEl.dataset.splitUrl || null;
                const weekendSplitUrl = itemEl.dataset.weekendSplitUrl || null;

                timers.show = setTimeout(function()
                {
                    if (getLiveGroupForItem(itemEl)) return;

                    // Se nel frattempo il mouse non è più sull'item, non mostrare nulla.
                    if (!itemEl.matches(':hover')) return;

                    const group = document.createElement('div');
                    group.className = 'timeline-live-inline-group';
                    group.style.position = 'fixed';
                    group.style.zIndex = '10000';
                    group.style.pointerEvents = 'auto';
                    group.style.display = 'flex';
                    group.style.flexWrap = 'nowrap';
                    group.style.gap = '4px';
                    group._timelineItemEl = itemEl;

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

                    if (splitUrl)
                    {
                        const splitWrapper = window.createTimelineIframeLinkElement({
                            url: splitUrl,
                            faIcon: 'scissors',
                            title: itemEl.dataset.splitText || 'Dividi',
                        });

                        splitWrapper.classList.add('timeline-live-inline');
                        group.appendChild(splitWrapper);
                    }

                    if (weekendSplitUrl)
                    {
                        const weekendSplitWrapper = window.createTimelineIframeLinkElement({
                            url: weekendSplitUrl,
                            faIcon: 'calendar-week',
                            title: itemEl.dataset.weekendSplitText || 'Dividi sui week-end',
                        });

                        weekendSplitWrapper.classList.add('timeline-live-inline');
                        group.appendChild(weekendSplitWrapper);
                    }

                    group.addEventListener('pointerenter', function()
                    {
                        clearTimeout(timers.hide);
                    });

                    group.addEventListener('pointerleave', function(e)
                    {
                        if (e.relatedTarget && itemEl.contains(e.relatedTarget))
                            return;

                        scheduleLiveGroupRemoval(group);
                    });

                    // Il gruppo viene appeso al body per poter uscire dai pannelli
                    // overflow-hidden interni di vis-timeline.
                    group.style.visibility = 'hidden';
                    document.body.appendChild(group);
                    positionLiveGroup(group, itemEl);
                    group.style.visibility = '';

                }, 250);
            });
            itemEl.addEventListener('pointerleave', function(e)
            {
                const timers = getLiveTimers(itemEl);

                // Uscendo dall'item si annulla anche l'eventuale comparsa pendente.
                clearTimeout(timers.show);

                const group = getLiveGroupForItem(itemEl);

                if (group && isLiveGroupTarget(group, e.relatedTarget))
                    return;

                clearTimeout(timers.hide);

                scheduleLiveGroupRemoval(group);
            });
        });
    }

    // Attach after each render/update
    if (container)
    {
        let attachScheduled = false;

        const observer = new MutationObserver(function(mutations)
        {
            // Ignora le mutazioni generate dai pulsanti stessi, altrimenti
            // l'observer si auto-rilancia a ogni hover.
            const relevant = mutations.some(function(m)
            {
                return !(m.target.closest && m.target.closest(LIVE_GROUP_SELECTOR));
            });

            if (!relevant || attachScheduled)
                return;

            attachScheduled = true;

            requestAnimationFrame(function()
            {
                attachScheduled = false;
                attachLiveHoverHandlers();
            });
        });

        observer.observe(container, { childList: true, subtree: true });

        // Rete di sicurezza: se il puntatore non è più sopra né ai pulsanti né
        // al loro item (pointerleave perso, item ridisegnato, drag della timeline),
        // i pulsanti vengono rimossi comunque.
        let sweepScheduled = false;

        function sweepOrphanLiveGroups()
        {
            if (sweepScheduled)
                return;

            sweepScheduled = true;

            requestAnimationFrame(function()
            {
                sweepScheduled = false;

                if (window.isTimelineLightboxOpen())
                    return;

                document.querySelectorAll(LIVE_GROUP_SELECTOR).forEach(function(group)
                {
                    if (isLiveGroupActive(group))
                        return;

                    scheduleLiveGroupRemoval(group);
                });
            });
        }

        document.addEventListener('pointermove', function(e)
        {
            if (!document.querySelector(LIVE_GROUP_SELECTOR))
                return;

            if (e.target.closest && e.target.closest(LIVE_GROUP_SELECTOR))
                return;

            sweepOrphanLiveGroups();
        }, true);

        container.addEventListener('pointerleave', sweepOrphanLiveGroups);
        container.addEventListener('wheel', sweepOrphanLiveGroups, { passive: true });
        window.addEventListener('blur', sweepOrphanLiveGroups);
        window.addEventListener('resize', repositionLiveGroups);
        document.addEventListener('scroll', repositionLiveGroups, true);
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

    $.ajax({
        url: UPDATE_URL,
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({ _method: 'PUT', item: item }),
        success: function (data) {
            if (data.success === true && data.message && typeof window.addSuccessNotification === 'function') {
                window.addSuccessNotification(data.message);
            }
        },
        error: function (xhr) {
            console.error(xhr);
        }
    });
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
    const windowRange = timeline.getWindow();

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

window.openTimelineCreateRowFormPopup = async function (datetime, groupId, groupModel)
{
    const template = document.getElementById('timeline-item-modal-template');

    const startDatetime = window.snapTimelineCreateDatetime(datetime);
    const endDatetime = window.getTimelineCreateEndDatetime(startDatetime);
    const formUrl = new URL(CREATE_ROW_FORM_URL, window.location.origin);

    formUrl.searchParams.set('starts_at', window.formatTimeInputValue(startDatetime));
    formUrl.searchParams.set('ends_at', window.formatTimeInputValue(endDatetime));

    if (groupId)
        formUrl.searchParams.set('group_id', groupId);

    if (groupModel)
        formUrl.searchParams.set('group_model', groupModel);

    const response = await fetch(formUrl.toString(), {
        headers: {
            'Accept': 'text/html',
        },
    });

    if (!response.ok)
        throw new Error('HTTP ' + response.status);

    const clone = template.firstElementChild.cloneNode(true);
    const modalId = 'timeline-create-modal-' + Date.now();
    clone.id = modalId;

    const modalTitleEl = clone.querySelector('.uk-modal-title');
    const modalContent = clone.querySelector('.timeline-modal-content');
    const footer = clone.querySelector('.uk-card-footer');

    if (footer)
        footer.remove();

    modalContent.innerHTML = await response.text();

    const wrapper = clone.querySelector('.timeline-create-row-form-wrapper');
    const form = clone.querySelector('.timeline-create-row-form') || clone.querySelector('form');

    if (!form)
        throw new Error('Form timeline non configurato');

    modalTitleEl.textContent = wrapper?.dataset.title || form.dataset.title || 'Nuova riga timeline';

    const startsAtInput = clone.querySelector('[name="starts_at"]');
    const endsAtInput = clone.querySelector('[name="ends_at"]');
    const defaultStartValue = window.formatTimeInputValue(startDatetime);
    const defaultEndValue = window.formatTimeInputValue(endDatetime);

    if (startsAtInput && !startsAtInput.value)
        startsAtInput.value = defaultStartValue;

    if (endsAtInput && !endsAtInput.value)
        endsAtInput.value = defaultEndValue;

    document.body.appendChild(clone);

    const modal = UIkit.modal('#' + modalId);
    modal.show();

    if (startsAtInput)
        setTimeout(function () { startsAtInput.focus(); }, 0);

    form.addEventListener('submit', async function (event)
    {
        event.preventDefault();

        const formData = new FormData(form);
        const payload = {};

        formData.forEach(function (value, key)
        {
            if (key !== '_token')
                payload[key] = value;
        });

        if (payload.starts_at)
            payload.starts_at = window.parseTimeInputValue(payload.starts_at).toISOString();

        if (payload.ends_at)
            payload.ends_at = window.parseTimeInputValue(payload.ends_at).toISOString();

        const saveButton = form.querySelector('button[type="submit"]');

        if (saveButton)
            saveButton.disabled = true;

        try
        {
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            };
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

            if (csrfToken)
                headers['X-CSRF-TOKEN'] = csrfToken;

            const saveResponse = await fetch(form.getAttribute('action'), {
                method: form.getAttribute('method') || 'POST',
                headers: headers,
                body: JSON.stringify(payload),
            });

            const responseText = await saveResponse.text();
            let data = null;

            try
            {
                data = JSON.parse(responseText);
            }
            catch (error)
            {
                // Preserve the response body when the server does not return JSON.
            }

            if (!saveResponse.ok || data?.success !== true)
            {
                const messages = [data?.message];

                if (data?.errors && typeof data.errors === 'object')
                    messages.push(...Object.values(data.errors).flat());

                const message = [...new Set(messages.filter(function (value)
                {
                    return typeof value === 'string' && value.trim();
                }))].join('\n');

                throw new Error(message || responseText.trim() || ('HTTP ' + saveResponse.status));
            }

            if (typeof window.addSuccessNotification === 'function')
                window.addSuccessNotification(data.message || 'Riga creata');

            modal.hide();
            await window.fetchTimeline();
        }
        catch (error)
        {
            if (typeof window.addDangerNotification === 'function')
            {
                // UKN renders HTML: escape server messages before displaying them.
                const message = document.createElement('div');
                message.textContent = error.message || 'Errore durante il salvataggio';
                window.addDangerNotification(message.innerHTML.replace(/\r?\n/g, '<br>'));
            }
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

window.openTimelineCreateRowPopup = async function (datetime, groupId, groupModel)
{
    if (! CREATE_ROW_FORM_URL)
    {
        if (typeof window.addDangerNotification === 'function')
            window.addDangerNotification('Form creazione riga timeline non configurato');

        return;
    }

    return window.openTimelineCreateRowFormPopup(datetime, groupId, groupModel);
};

var options = {
    stack: true,
    showTooltips: false,
    zoomMax: TIMELINE_MAX_ZOOM_MS,

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
            // item.style veniva azzerato per impedire a vis di applicarlo a .vis-item,
            // ma il template viene rieseguito a ogni redraw (selezione, drag, resize):
            // dal secondo giro in poi item.style era null e l'item cadeva nel colore
            // di fallback, restandoci per sempre. Il colore di base va quindi
            // memorizzato prima di azzerarlo.
            if (item.style)
                timelineBaseStyles.set(item.id, item.style);

            const baseStyle = item.style || timelineBaseStyles.get(item.id) || null;

            if (baseStyle)
            {
                // If style is a CSS string (default vis behavior)
                if (typeof baseStyle === 'string')
                {
                    wrapper.style.cssText += baseStyle;
                }
                // If style is an object coming from backend
                else if (typeof baseStyle === 'object')
                {
                    if (baseStyle.backgroundColor)
                        wrapper.style.backgroundColor = baseStyle.backgroundColor;

                    if (baseStyle.textColor)
                        wrapper.style.color = baseStyle.textColor;
                }

                item.style = null; // prevent vis from applying it to .vis-item
            }

            // --- Fallback background color if none provided ---
            if (!wrapper.style.backgroundColor) {
                wrapper.style.backgroundColor = '#607d8b'; // default fallback color
                wrapper.style.color = '#ffffff';
            }

            // Colore di base esposto anche come attributo, utile per debug
            // e per ripristini fatti da fuori.
            wrapper.dataset.baseBackground = wrapper.style.backgroundColor;
            wrapper.dataset.baseColor = wrapper.style.color;

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

            // Split link (scissors) esposto sul wrapper per i pulsanti live in hover.
            // Viene cercato sia nei rightLinks che nei links, così qualsiasi model
            // che lo dichiara lo rende disponibile su ogni timeline.
            const splitLink = [...(Array.isArray(item.rightLinks) ? item.rightLinks : []), ...(Array.isArray(item.links) ? item.links : [])]
                .find(function (link) { return link.faIcon === 'scissors'; });

            if (splitLink?.url)
            {
                wrapper.dataset.splitUrl = splitLink.url;

                if (splitLink.text)
                    wrapper.dataset.splitText = splitLink.text;
            }

            // Split week-end (calendar-week): stesso meccanismo del link split.
            const weekendSplitLink = [...(Array.isArray(item.rightLinks) ? item.rightLinks : []), ...(Array.isArray(item.links) ? item.links : [])]
                .find(function (link) { return link.faIcon === 'calendar-week'; });

            if (weekendSplitLink?.url)
            {
                wrapper.dataset.weekendSplitUrl = weekendSplitLink.url;

                if (weekendSplitLink.text)
                    wrapper.dataset.weekendSplitText = weekendSplitLink.text;
            }

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
            wrapper.dataset.groupId = String(group.id);

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

            const modalActionHtml = group.modalUrl ? `
                        <button
                            type="button"
                            class="uk-button uk-button-default uk-button-small timeline-group-modal-trigger"
                            title="Riepilogo ${title}"
                            data-group-id="${group.id}"
                        >
                            <i class="fa fa-link"></i>
                        </button>
            ` : '';

            wrapper.innerHTML = `
				<div class="uk-flex uk-flex-middle uk-flex-between uk-margin-small-bottom">
					<div class="timeline-group-title">${title}</div>

					<div class="timeline-group-actions uk-grid-small uk-child-width-auto" uk-grid>
                        ${modalActionHtml}
						${actionsHtml}
					</div>
				</div>
`;

            const groupTitleElement = wrapper.querySelector('.timeline-group-title');
            const hiddenNestedGroupsBadge = createTimelineHiddenNestedGroupsBadge(group.id);

            if (groupTitleElement && hiddenNestedGroupsBadge)
                groupTitleElement.appendChild(hiddenNestedGroupsBadge);

            const modalBtn = wrapper.querySelector('.timeline-group-modal-trigger');

            if (modalBtn)
            {
                modalBtn.addEventListener('click', function (event) {
                    event.stopPropagation();
                    window.openTimelineGroupModal(modalBtn);
                });
            }

            return wrapper;
        },

        // Enable time edits and fire when end is resized
        editable: {
            add: false,
			updateTime: Boolean(UPDATE_URL),
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

    function generateTimelineWeekendBackgrounds(start, end) {
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

    // Rimuove e ricrea gli sfondi week-end sulla finestra corrente.
    // Va richiamata anche dopo ogni refresh dei dati: items.clear()
    // (setTimelineData) cancella pure i background, e senza zoom/pan
    // nessun rangechanged li avrebbe ricreati.
    function regenerateTimelineWeekendBackgrounds(start, end) {
        if (! timeline)
            return;

        items.forEach(i => {
            if (i.type === 'background' && i.className?.startsWith('weekend')) {
                items.remove(i.id);
            }
        });

        if (! start || ! end) {
            const range = timeline.getWindow();
            start = range.start;
            end = range.end;
        }

        items.add(generateTimelineWeekendBackgrounds(start, end));
    }

    function addWeekendBackgrounds(timeline, items) {

        // prima generazione
        regenerateTimelineWeekendBackgrounds();

        // rigenera quando l’utente fa zoom o pan
        timeline.on('rangechanged', function (props) {
            regenerateTimelineWeekendBackgrounds(props.start, props.end);
        });
    }

    // --- Groups visibility filter (button + modal with checkboxes) ---
    const TIMELINE_HIDDEN_GROUPS_STORAGE_KEY = [
        'timeline-hidden-groups',
        window.location.origin,
        window.location.pathname,
        window.location.search
    ].join(':');

    function syncTimelineGroupsFilterWidth()
    {
        const filterToolbar = document.getElementById('timeline-groups-filter-toolbar');
        const groupsColumn = document.querySelector('#timelinecontainer .vis-left');

        if (! filterToolbar || ! groupsColumn)
            return;

        const groupsWidth = groupsColumn.getBoundingClientRect().width;

        if (groupsWidth > 0)
            filterToolbar.style.width = groupsWidth + 'px';
    }

    function scheduleTimelineGroupsFilterWidthSync()
    {
        if (typeof window.requestAnimationFrame === 'function')
            window.requestAnimationFrame(syncTimelineGroupsFilterWidth);
        else
            setTimeout(syncTimelineGroupsFilterWidth, 0);
    }

    window.addEventListener('resize', scheduleTimelineGroupsFilterWidthSync);

    function getStoredHiddenGroupIds()
    {
        try
        {
            const stored = JSON.parse(window.localStorage.getItem(TIMELINE_HIDDEN_GROUPS_STORAGE_KEY));

            return new Set(Array.isArray(stored) ? stored.map(String) : []);
        }
        catch (error)
        {
            return new Set();
        }
    }

    function getHiddenGroupIds()
    {
        const hiddenIds = getStoredHiddenGroupIds();

        timelineAutomaticallyHiddenGroupIds.forEach(function (groupId)
        {
            hiddenIds.add(String(groupId));
        });

        return hiddenIds;
    }

    function storeHiddenGroupIds(hiddenIds)
    {
        try
        {
            window.localStorage.setItem(
                TIMELINE_HIDDEN_GROUPS_STORAGE_KEY,
                JSON.stringify(Array.from(hiddenIds).map(String))
            );
        }
        catch (error)
        {
            // Storage non disponibile: il filtro vale solo per la sessione corrente.
        }
    }

    function getTimelineGroupPlainLabel(group)
    {
        const raw = group.name ?? group.content ?? group.title ?? group.label ?? String(group.id);
        const template = document.createElement('template');

        template.innerHTML = String(raw);

        return (template.content.textContent || String(group.id)).trim() || String(group.id);
    }

    function getTimelineGroupById(groupId, timelineGroups = groups.get())
    {
        return timelineGroups.find(function (group)
        {
            return String(group.id) === String(groupId);
        }) ?? null;
    }

    function getTimelineNestedGroupIds(groupId, timelineGroups = groups.get(), visited = new Set())
    {
        const groupKey = String(groupId);

        if (visited.has(groupKey))
            return [];

        visited.add(groupKey);

        const group = getTimelineGroupById(groupId, timelineGroups);
        const directNestedGroupIds = Array.isArray(group?.nestedGroups) ? group.nestedGroups : [];

        return directNestedGroupIds.flatMap(function (nestedGroupId)
        {
            return [nestedGroupId].concat(
                getTimelineNestedGroupIds(nestedGroupId, timelineGroups, visited)
            );
        });
    }

    function getTimelineTopLevelGroups(timelineGroups = groups.get())
    {
        const nestedGroupIds = new Set(
            timelineGroups.flatMap(function (group)
            {
                return Array.isArray(group.nestedGroups)
                    ? group.nestedGroups.map(String)
                    : [];
            })
        );

        return timelineGroups.filter(function (group)
        {
            return ! nestedGroupIds.has(String(group.id));
        });
    }

    function getTimelineGroupsWithItems(timelineGroups, timelineItems)
    {
        const groupsWithItems = new Set(
            timelineItems
                .filter(function (item)
                {
                    return item
                        && item.type !== 'background'
                        && item.group !== undefined
                        && item.group !== null;
                })
                .map(function (item)
                {
                    return String(item.group);
                })
        );

        let changed = true;

        while (changed)
        {
            changed = false;

            timelineGroups.forEach(function (group)
            {
                const nestedGroupIds = Array.isArray(group.nestedGroups)
                    ? group.nestedGroups
                    : [];

                if (groupsWithItems.has(String(group.id)) || ! nestedGroupIds.some(function (nestedGroupId)
                {
                    return groupsWithItems.has(String(nestedGroupId));
                }))
                    return;

                groupsWithItems.add(String(group.id));
                changed = true;
            });
        }

        return groupsWithItems;
    }

    function getTimelineAutomaticallyHiddenGroupIds(timelineGroups, timelineItems)
    {
        const groupsWithItems = getTimelineGroupsWithItems(timelineGroups, timelineItems);

        return new Set(
            timelineGroups
                .filter(function (group)
                {
                    return ! groupsWithItems.has(String(group.id));
                })
                .map(function (group)
                {
                    return String(group.id);
                })
        );
    }

    function normalizeTimelineHiddenGroupIds(hiddenIds, timelineGroups = groups.get())
    {
        const normalizedHiddenIds = new Set(hiddenIds);

        Array.from(normalizedHiddenIds).forEach(function (groupId)
        {
            getTimelineNestedGroupIds(groupId, timelineGroups).forEach(function (nestedGroupId)
            {
                normalizedHiddenIds.add(String(nestedGroupId));
            });
        });

        return normalizedHiddenIds;
    }

    function getTimelineGroupsFilterTree()
    {
        const timelineGroups = groups.get();
        const timelineGroupOrder = new Map(
            timelineGroups.map(function (group, index)
            {
                return [String(group.id), index];
            })
        );

        const sortGroupsByTimelineOrder = function (firstGroup, secondGroup)
        {
            return timelineGroupOrder.get(String(firstGroup.id))
                - timelineGroupOrder.get(String(secondGroup.id));
        };

        const createNode = function (group, visited = new Set())
        {
            const groupKey = String(group.id);

            if (visited.has(groupKey))
                return null;

            const nestedVisited = new Set(visited);
            nestedVisited.add(groupKey);

            const children = (Array.isArray(group.nestedGroups) ? group.nestedGroups : [])
                .map(function (nestedGroupId)
                {
                    const nestedGroup = getTimelineGroupById(nestedGroupId, timelineGroups);

                    return nestedGroup ? createNode(nestedGroup, nestedVisited) : null;
                })
                .filter(Boolean)
                .sort(function (firstNode, secondNode)
                {
                    return sortGroupsByTimelineOrder(firstNode.group, secondNode.group);
                });

            return {group: group, children: children};
        };

        return getTimelineTopLevelGroups(timelineGroups)
            .sort(sortGroupsByTimelineOrder)
            .map(function (group)
            {
                return createNode(group);
            })
            .filter(Boolean);
    }

    function getTimelineGroupsFilterOpenIds()
    {
        return new Set(
            Array.from(document.querySelectorAll('#timeline-groups-filter-list li.uk-open[data-group-id]'))
                .map(function (element)
                {
                    return element.dataset.groupId;
                })
        );
    }

    function updateTimelineGroupsFilterBadge()
    {
        const badge = document.getElementById('timeline-groups-filter-badge');
        if (! badge)
            return;

        const hiddenIds = normalizeTimelineHiddenGroupIds(getHiddenGroupIds());
        const hiddenCount = getTimelineTopLevelGroups().filter(function (group)
        {
            return hiddenIds.has(String(group.id));
        }).length;

        setTimelineHiddenCountBadgeContent(badge, hiddenCount);
        badge.hidden = hiddenCount === 0;
    }

    function setTimelineHiddenCountBadgeContent(badge, count)
    {
        badge.replaceChildren();

        const icon = document.createElement('i');
        icon.className = 'fa fa-eye-slash';
        icon.setAttribute('aria-hidden', 'true');

        badge.appendChild(icon);
        badge.appendChild(document.createTextNode(' ' + String(count)));
    }

    function createTimelineHiddenNestedGroupsBadge(groupId)
    {
        const hiddenIds = normalizeTimelineHiddenGroupIds(getHiddenGroupIds());
        const hiddenNestedGroupsCount = getTimelineNestedGroupIds(groupId)
            .filter(function (nestedGroupId)
            {
                return hiddenIds.has(String(nestedGroupId));
            }).length;

        if (hiddenNestedGroupsCount === 0)
            return null;

        const badge = document.createElement('span');
        badge.className = 'uk-badge uk-margin-small-left timeline-groups-hidden-nested-badge';
        setTimelineHiddenCountBadgeContent(badge, hiddenNestedGroupsCount);
        badge.title = 'Nested groups nascosti';

        return badge;
    }

    function refreshTimelineHiddenNestedGroupsBadges()
    {
        document.querySelectorAll('#timelinecontainer .timeline-group-label[data-group-id]')
            .forEach(function (groupLabel)
            {
                const groupTitleElement = groupLabel.querySelector('.timeline-group-title');

                if (! groupTitleElement)
                    return;

                groupTitleElement.querySelectorAll('.timeline-groups-hidden-nested-badge')
                    .forEach(function (badge)
                    {
                        badge.remove();
                    });

                const badge = createTimelineHiddenNestedGroupsBadge(groupLabel.dataset.groupId);

                if (badge)
                    groupTitleElement.appendChild(badge);
            });
    }

    function scheduleTimelineHiddenNestedGroupsBadgesRefresh()
    {
        if (typeof window.requestAnimationFrame === 'function')
            window.requestAnimationFrame(refreshTimelineHiddenNestedGroupsBadges);
        else
            setTimeout(refreshTimelineHiddenNestedGroupsBadges, 0);
    }

    function setTimelineGroupVisibility(groupId, visible, includeNestedGroups = false)
    {
        const groupIds = [groupId];

        if (includeNestedGroups)
            groupIds.push(...getTimelineNestedGroupIds(groupId));

        const hiddenIds = normalizeTimelineHiddenGroupIds(getStoredHiddenGroupIds());

        groupIds.forEach(function (id)
        {
            timelineAutomaticallyHiddenGroupIds.delete(String(id));

            if (visible)
                hiddenIds.delete(String(id));
            else
                hiddenIds.add(String(id));
        });

        storeHiddenGroupIds(hiddenIds);

        groups.update(groupIds.map(function (id)
        {
            return {id: id, visible: visible};
        }));

        renderTimelineGroupsFilterList();
        scheduleTimelineHiddenNestedGroupsBadgesRefresh();
    }

    function renderTimelineGroupsFilterList()
    {
        const listEl = document.getElementById('timeline-groups-filter-list');
        if (! listEl)
            return;

        const hiddenIds = normalizeTimelineHiddenGroupIds(getHiddenGroupIds());
        const openGroupIds = getTimelineGroupsFilterOpenIds();

        listEl.innerHTML = '';

        const createCheckbox = function (group, parentVisible = true)
        {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'uk-checkbox uk-margin-small-right timeline-groups-filter-checkbox';
            checkbox.checked = parentVisible && ! hiddenIds.has(String(group.id));
            checkbox.disabled = ! parentVisible;
            checkbox.dataset.groupId = String(group.id);

            const nestedGroupIds = getTimelineNestedGroupIds(group.id);
            const visibleNestedGroupsCount = nestedGroupIds.filter(function (nestedGroupId)
            {
                return ! hiddenIds.has(String(nestedGroupId));
            }).length;

            checkbox.indeterminate = checkbox.checked
                && nestedGroupIds.length > 0
                && visibleNestedGroupsCount !== nestedGroupIds.length;

            checkbox.addEventListener('click', function (event)
            {
                event.stopPropagation();
            });

            checkbox.addEventListener('change', function ()
            {
                setTimelineGroupVisibility(group.id, checkbox.checked, nestedGroupIds.length > 0);
            });

            return checkbox;
        };

        const createGroupLine = function (group, parentVisible = true, indented = false)
        {
            const label = document.createElement('label');
            label.className = 'uk-display-block uk-margin-small-bottom';

            if (indented)
                label.classList.add('uk-margin-small-left');

            const checkbox = createCheckbox(group, parentVisible);

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(getTimelineGroupPlainLabel(group)));

            return label;
        };

        const accordion = document.createElement('ul');
        accordion.className = 'uk-accordion';
        accordion.setAttribute('uk-accordion', 'multiple: true');

        const appendNode = function (node, targetAccordion, parentVisible = true, nested = false)
        {
            const group = node.group;
            const visible = parentVisible && ! hiddenIds.has(String(group.id));

            if (node.children.length === 0)
            {
                const item = document.createElement('li');
                item.appendChild(createGroupLine(group, parentVisible, nested));
                targetAccordion.appendChild(item);

                return;
            }

            const item = document.createElement('li');
            item.dataset.groupId = String(group.id);

            if (openGroupIds.has(String(group.id)))
                item.classList.add('uk-open');

            const title = document.createElement('a');
            title.href = '#';
            title.className = 'uk-accordion-title uk-flex uk-flex-middle uk-margin-small-bottom';

            if (nested)
                title.classList.add('uk-margin-small-left');

            title.appendChild(createCheckbox(group, parentVisible));
            title.appendChild(document.createTextNode(getTimelineGroupPlainLabel(group)));

            const content = document.createElement('div');
            content.className = 'uk-accordion-content uk-margin-small-top uk-margin-small-left';

            const nestedAccordion = document.createElement('ul');
            nestedAccordion.className = 'uk-accordion';
            nestedAccordion.setAttribute('uk-accordion', 'multiple: true');

            node.children.forEach(function (childNode)
            {
                appendNode(childNode, nestedAccordion, visible, true);
            });

            content.appendChild(nestedAccordion);
            item.appendChild(title);
            item.appendChild(content);
            targetAccordion.appendChild(item);
        };

        getTimelineGroupsFilterTree().forEach(function (node)
        {
            appendNode(node, accordion);
        });

        listEl.appendChild(accordion);

        if (typeof UIkit !== 'undefined' && typeof UIkit.update === 'function')
            UIkit.update(listEl);

        updateTimelineGroupsFilterBadge();
    }

    function setAllTimelineGroupsVisibility(visible)
    {
        if (visible)
            timelineAutomaticallyHiddenGroupIds.clear();

        const hiddenIds = visible ? new Set() : new Set(groups.getIds().map(String));

        storeHiddenGroupIds(hiddenIds);

        groups.update(groups.getIds().map(function (id)
        {
            return {id: id, visible: visible};
        }));

        renderTimelineGroupsFilterList();
    }

    document.getElementById('timeline-groups-filter-all')
        ?.addEventListener('click', function () { setAllTimelineGroupsVisibility(true); });

    document.getElementById('timeline-groups-filter-none')
        ?.addEventListener('click', function () { setAllTimelineGroupsVisibility(false); });

    window.setTimelineData = function (data)
    {
        const currentWindow = timeline ? timeline.getWindow() : null;
        const timelineGroups = Array.isArray(data.groups) ? data.groups : groups.get();
        const timelineItems = Array.isArray(data.items) ? data.items : items.get();
        const currentlyEmptyGroupIds = getTimelineAutomaticallyHiddenGroupIds(
            timelineGroups,
            timelineItems
        );

        if (! timeline)
        {
            timelineAutomaticallyHiddenGroupIds = currentlyEmptyGroupIds;
        }
        else
        {
            timelineAutomaticallyHiddenGroupIds = new Set(
                Array.from(timelineAutomaticallyHiddenGroupIds).filter(function (groupId)
                {
                    return currentlyEmptyGroupIds.has(groupId);
                })
            );
        }

        if (data.groups)
        {
            const hiddenGroupIds = normalizeTimelineHiddenGroupIds(
                getHiddenGroupIds(),
                data.groups
            );
            const persistedHiddenGroupIds = normalizeTimelineHiddenGroupIds(
                getStoredHiddenGroupIds(),
                data.groups
            );

            storeHiddenGroupIds(persistedHiddenGroupIds);

            data.groups.forEach(function (group)
            {
                group.visible = ! hiddenGroupIds.has(String(group.id));
            });

            groups.clear();
            groups.update(data.groups);

            renderTimelineGroupsFilterList();
            scheduleTimelineGroupsFilterWidthSync();
            scheduleTimelineHiddenNestedGroupsBadgesRefresh();
        }

        if (data.items)
        {
            items.clear();
            items.update(data.items);

            // items.clear() ha cancellato anche gli sfondi week-end:
            // se la timeline esiste già va rigenerati subito.
            regenerateTimelineWeekendBackgrounds();
        }

        // Create the timeline only once; subsequent calls only update datasets
        if (!timeline)
        {
            // Calcola finestra iniziale PRIMA di creare la timeline (evita il fit automatico di vis.js)
            var zoomDays = typeof TIMELINE_ZOOM_DAYS !== 'undefined' ? TIMELINE_ZOOM_DAYS : 14;
            var emptyTimelineZoomDays = 35;
            var zoomMs = Math.min(zoomDays * TIMELINE_DAY_MS, TIMELINE_MAX_ZOOM_MS);
            var emptyTimelineZoomMs = Math.min(emptyTimelineZoomDays * TIMELINE_DAY_MS, TIMELINE_MAX_ZOOM_MS);
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

            var clampedWindow = clampTimelineWindowToMaxZoom(windowStart, windowEnd);
            if (clampedWindow) {
                windowStart = clampedWindow.start;
                windowEnd = clampedWindow.end;
            }

            var timelineOptions = Object.assign({}, options, { start: windowStart, end: windowEnd });
            timeline = new vis.Timeline(container, items, groups, timelineOptions);
            window.timeline = timeline;
            scheduleTimelineGroupsFilterWidthSync();

            timeline.on('doubleClick', async function (properties)
            {
                if (properties && properties.item)
                    return;

                if (!properties || !properties.time)
                    return;

                const group = properties.group ? groups.get(properties.group) : null;

                await window.openTimelineCreateRowPopup(
                    new Date(properties.time),
                    properties.group,
                    group?.model
                );
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
                    const days = millis / TIMELINE_DAY_MS;

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
            scheduleTimelineGroupsFilterWidthSync();
        }
    }



    window.loadTimelineData = async function ()
    {
        return await fetchJSON(API_URL);
    };

    window.fetchTimeline = async function ()
    {
        window.setTimelineData(
            await window.loadTimelineData()
        );
    };

    ;(async function bootstrapTimeline()
    {
        await window.fetchTimeline();

        document.dispatchEvent(new CustomEvent('timeline:ready'));
    })();
