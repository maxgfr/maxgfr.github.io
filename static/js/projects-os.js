// maxOS — the desktop behind /projects.
//
// Reads its model out of the server-rendered `.os-catalog`, so the no-JS grid and
// the desktop can never disagree about what exists (the same contract as
// projects-shell.js). Absent the markup, this file does nothing anywhere else.
//
// The apps hosted under https://maxgfr.github.io/<app>/ open in windows: plain
// iframes, no sandbox — they are this site's own apps, same origin, and
// allow-scripts + allow-same-origin would cancel a sandbox anyway. Everything else
// is a shortcut to a new tab: GitHub, npm and skills.sh all refuse to be framed.
//
// State that matters lives in the address bar (#open=kanbo,tick — share the link,
// share the desktop). Window geometry is a per-visitor convenience in
// localStorage, and every storage access is allowed to fail.
(function () {
    const root = document.getElementById('os-root');
    const catalog = document.getElementById('os-catalog');
    const screen = document.getElementById('os-screen');
    if (!root || !catalog || !screen) return;

    let T;
    try {
        T = JSON.parse(document.getElementById('os-i18n').textContent);
    } catch {
        return; // no strings, no desktop — the catalogue below still works
    }

    const desk = document.getElementById('os-desk');
    const iconsEl = document.getElementById('os-icons');
    const layer = document.getElementById('os-windows');
    const startBtn = document.getElementById('os-start');
    const tasksEl = document.getElementById('os-tasks');
    const fullBtn = document.getElementById('os-full');
    const clock = document.getElementById('os-clock');
    const launcher = document.getElementById('os-launcher');
    const search = document.getElementById('os-search');
    const results = document.getElementById('os-results');
    const boot = document.getElementById('os-boot');
    const readmeTpl = document.getElementById('os-readme');

    const FRAMABLE_HOST = 'maxgfr.github.io';
    // Apps that refuse to run framed, on purpose (pdfvault throws if
    // window.top !== window.self, as anti-clickjacking). They stay shortcuts.
    const NO_FRAME = new Set(['pdfvault']);
    const ALLOW = 'clipboard-read; clipboard-write; fullscreen; camera; microphone; display-capture';
    const PINNED = 8;
    const GEOM_KEY = 'maxos-geom';
    const SEEN_KEY = 'maxos-readme-seen';
    const BOOT_KEY = 'maxos-booted';
    const lang = document.documentElement.lang === 'en' ? 'en' : 'fr';
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const phoneQuery = matchMedia('(max-width: 720px)');

    // --- model, lifted from the DOM ---------------------------------------

    function framable(name, home) {
        if (!home || NO_FRAME.has(name)) return false;
        try {
            const url = new URL(home);
            return url.hostname === FRAMABLE_HOST && url.pathname.length > 1;
        } catch {
            return false;
        }
    }

    const cats = Array.from(catalog.querySelectorAll('.os-cat')).map((node) => {
        const label = node.dataset.label;
        const space = label.indexOf(' ');
        return {
            slug: node.dataset.slug,
            label,
            emoji: space > 0 ? label.slice(0, space) : '📁',
            title: space > 0 ? label.slice(space + 1) : label,
            apps: [],
        };
    });

    const apps = Array.from(catalog.querySelectorAll('.os-app')).map((node, order) => {
        const app = {
            name: node.dataset.name,
            url: node.dataset.url,
            home: node.dataset.home || null,
            cat: Number(node.dataset.cat),
            stars: Number(node.dataset.stars),
            language: node.dataset.language || '',
            topics: node.dataset.topics || '',
            type: node.dataset.type,
            desc: node.querySelector('.os-app-desc').textContent.trim(),
            sprite: node.querySelector('.os-sprite'),
            order,
        };
        app.window = framable(app.name, app.home);
        app.haystack = [app.name, app.desc, app.topics, app.language, cats[app.cat]?.label || '']
            .join(' ')
            .toLowerCase();
        cats[app.cat]?.apps.push(app);
        return app;
    });

    const byName = new Map(apps.map((app) => [app.name, app]));
    const windowApps = apps.filter((app) => app.window);

    // --- small helpers ----------------------------------------------------

    function h(tag, attrs, ...children) {
        const node = document.createElement(tag);
        for (const [key, value] of Object.entries(attrs || {})) {
            if (value === null || value === undefined || value === false) continue;
            node.setAttribute(key, value === true ? '' : value);
        }
        node.append(...children.filter((child) => child !== null && child !== undefined));
        return node;
    }

    function fill(text) {
        return text
            .replace('{repos}', root.dataset.repos)
            .replace('{stars}', root.dataset.stars)
            .replace('{apps}', String(windowApps.length));
    }

    function tile(app) {
        const node = h('span', { class: 'os-tile', 'data-type': app.type, 'aria-hidden': 'true' });
        if (app.sprite) node.append(app.sprite.cloneNode(true));
        return node;
    }

    function glyph(text) {
        return h('span', { class: 'os-tile', 'aria-hidden': 'true' }, h('span', { class: 'os-tile-glyph' }, text));
    }

    function store(kind, key, value) {
        try {
            const area = kind === 'session' ? sessionStorage : localStorage;
            if (value === undefined) return area.getItem(key);
            area.setItem(key, value);
        } catch {
            // private mode, blocked storage: the desktop simply forgets
        }
        return null;
    }

    let geom = {};
    try {
        geom = JSON.parse(store('local', GEOM_KEY) || '{}') || {};
    } catch {
        geom = {};
    }

    function isPhone() {
        return root.classList.contains('is-phone');
    }

    // --- icons ------------------------------------------------------------

    function appIcon(app) {
        const label = h('span', { class: 'os-icon-label' }, app.name);
        if (app.window) {
            return h('button', { type: 'button', class: 'os-icon', 'data-app': app.name, title: app.desc }, tile(app), label);
        }
        // Leaves the desktop, so it is a real link and says so — external-links.js
        // adds the "new tab" note for screen readers like everywhere else.
        return h(
            'a',
            {
                class: 'os-icon',
                href: app.home || app.url,
                target: '_blank',
                rel: 'noopener external',
                title: app.desc,
                'data-external': true,
            },
            tile(app),
            label
        );
    }

    function folderIcon(cat) {
        return h(
            'button',
            { type: 'button', class: 'os-icon os-folder', 'data-folder': cat.slug, title: cat.label },
            glyph(cat.emoji),
            h('span', { class: 'os-badge', 'aria-hidden': 'true' }, String(cat.apps.length)),
            h('span', { class: 'os-icon-label' }, cat.title)
        );
    }

    function buildDesktop() {
        const items = [
            h('button', { type: 'button', class: 'os-icon', 'data-readme': true }, glyph('📄'), h('span', { class: 'os-icon-label' }, T.readme)),
        ];
        for (const cat of cats) {
            if (cat.apps.length) items.push(folderIcon(cat));
        }
        const pinned = [...windowApps].sort((a, b) => b.stars - a.stars || a.order - b.order).slice(0, PINNED);
        for (const app of pinned) items.push(appIcon(app));
        iconsEl.replaceChildren(...items.map((item) => h('li', null, item)));
    }

    // --- windows ----------------------------------------------------------

    const wins = new Map(); // id -> { id, el, task, title }
    let zTop = 10;

    function deskSize() {
        return { w: desk.clientWidth, h: desk.clientHeight };
    }

    function clampPos(win, x, y) {
        const { w, h: dh } = deskSize();
        const ww = win.el.offsetWidth;
        return {
            x: Math.min(Math.max(x, -(ww - 120)), w - 120),
            y: Math.min(Math.max(y, 0), dh - 34),
        };
    }

    function place(win, x, y, w, hgt) {
        if (w !== undefined) {
            win.el.style.width = `${w}px`;
            win.el.style.height = `${hgt}px`;
        }
        const pos = clampPos(win, x, y);
        win.el.style.left = `${pos.x}px`;
        win.el.style.top = `${pos.y}px`;
    }

    function saveGeom(win) {
        geom[win.id] = {
            x: win.el.offsetLeft,
            y: win.el.offsetTop,
            w: win.el.offsetWidth,
            h: win.el.offsetHeight,
        };
        store('local', GEOM_KEY, JSON.stringify(geom));
    }

    function topmost() {
        let best = null;
        for (const win of wins.values()) {
            if (win.el.classList.contains('is-min')) continue;
            if (!best || Number(win.el.style.zIndex) > Number(best.el.style.zIndex)) best = win;
        }
        return best;
    }

    function focusWin(win) {
        if (win) {
            win.el.classList.remove('is-min');
            win.task.classList.remove('is-min');
            if (win.el.style.zIndex !== String(zTop)) win.el.style.zIndex = String(++zTop);
        }
        for (const other of wins.values()) {
            const on = other === win;
            other.el.classList.toggle('is-focused', on);
            other.task.setAttribute('aria-pressed', String(on));
        }
    }

    function minimize(win) {
        win.el.classList.add('is-min');
        win.task.classList.add('is-min');
        focusWin(topmost());
    }

    function toggleMax(win) {
        if (isPhone()) return;
        win.el.classList.toggle('is-max');
    }

    function closeWin(win) {
        wins.delete(win.id);
        win.task.parentElement.remove();
        syncHash();
        const done = () => win.el.remove();
        if (reducedMotion) {
            done();
        } else {
            win.el.classList.add('is-closing');
            win.el.addEventListener('animationend', done, { once: true });
            setTimeout(done, 250);
        }
        const next = topmost();
        focusWin(next);
        if (next) next.el.focus({ preventScroll: true });
        else startBtn.focus({ preventScroll: true });
    }

    // spec: { id, title, icon, home?, url?, size: [w, h], center?, body(container, win) }
    function openWindow(spec) {
        closeLauncher(false);
        const existing = wins.get(spec.id);
        if (existing) {
            focusWin(existing);
            existing.el.focus({ preventScroll: true });
            return existing;
        }

        const titleId = `os-t-${spec.id.replace(/[^a-z0-9-]/gi, '-')}`;
        const lights = h(
            'div',
            { class: 'os-lights' },
            h('button', { type: 'button', class: 'os-light', 'data-act': 'close', 'aria-label': T.close, title: T.close }, '×'),
            h('button', { type: 'button', class: 'os-light', 'data-act': 'min', 'aria-label': T.minimize, title: T.minimize }, '–'),
            h('button', { type: 'button', class: 'os-light', 'data-act': 'max', 'aria-label': T.maximize, title: T.maximize }, '+')
        );
        const tools = h('div', { class: 'os-tools' });
        if (spec.home) {
            tools.append(h('a', { class: 'os-tool', href: spec.home, target: '_blank', rel: 'noopener external', title: T.openTab, 'aria-label': T.openTab }, '↗'));
        }
        if (spec.url) {
            tools.append(h('a', { class: 'os-tool', href: spec.url, target: '_blank', rel: 'noopener external', title: T.source, 'aria-label': T.source }, '</>'));
        }
        const titlebar = h(
            'div',
            { class: 'os-titlebar' },
            h('button', { type: 'button', class: 'os-back', 'data-act': 'close' }, `‹ ${T.back}`),
            lights,
            h('div', { class: 'os-title', id: titleId }, spec.icon.cloneNode(true), h('span', null, spec.title)),
            tools
        );
        const body = h('div', { class: `os-winbody ${spec.bodyClass || ''}` });
        const grip = h('div', { class: 'os-grip', 'aria-hidden': 'true' });
        const el = h('section', { class: 'os-win', 'data-id': spec.id, role: 'dialog', 'aria-labelledby': titleId, tabindex: '-1' }, titlebar, body, grip);

        const task = h('button', { type: 'button', class: 'os-task', 'aria-pressed': 'false' }, spec.icon.cloneNode(true), h('span', null, spec.title));
        tasksEl.append(h('li', null, task));

        const win = { id: spec.id, el, task, title: spec.title };
        wins.set(spec.id, win);
        layer.append(el);
        spec.body(body, win);

        // Geometry: what this visitor left last time, else a cascade.
        const { w: dw, h: dh } = deskSize();
        const saved = geom[spec.id];
        const w = Math.min(saved?.w || spec.size[0], dw - 16);
        const hh = Math.min(saved?.h || spec.size[1], dh - 12);
        let x;
        let y;
        if (saved) {
            ({ x, y } = saved);
        } else if (spec.center) {
            x = (dw - w) / 2 + 60;
            y = Math.max(12, (dh - hh) / 3);
        } else {
            const n = wins.size % 7;
            x = Math.min(130 + n * 30, Math.max(8, dw - w - 8));
            y = Math.min(18 + n * 26, Math.max(0, dh - hh - 8));
        }
        place(win, x, y, w, hh);

        wire(win, titlebar, grip);
        task.addEventListener('click', () => {
            if (el.classList.contains('is-min')) focusWin(win);
            else if (el.classList.contains('is-focused')) minimize(win);
            else focusWin(win);
        });

        focusWin(win);
        el.focus({ preventScroll: true });
        syncHash();
        return win;
    }

    function wire(win, titlebar, grip) {
        const { el } = win;
        el.addEventListener('pointerdown', () => focusWin(win), true);

        titlebar.addEventListener('click', (event) => {
            const act = event.target.closest('[data-act]')?.dataset.act;
            if (act === 'close') closeWin(win);
            else if (act === 'min') minimize(win);
            else if (act === 'max') toggleMax(win);
        });
        titlebar.addEventListener('dblclick', (event) => {
            if (!event.target.closest('button, a')) toggleMax(win);
        });

        drag(titlebar, 'is-dragging', (event) => {
            if (event.target.closest('button, a') || el.classList.contains('is-max') || isPhone()) return null;
            const start = { x: el.offsetLeft, y: el.offsetTop };
            return (dx, dy) => place(win, start.x + dx, start.y + dy);
        }, () => saveGeom(win));

        drag(grip, 'is-resizing', () => {
            if (isPhone()) return null;
            const start = { w: el.offsetWidth, h: el.offsetHeight };
            const { w: dw, h: dh } = deskSize();
            return (dx, dy) => {
                el.style.width = `${Math.min(Math.max(start.w + dx, 272), dw - el.offsetLeft)}px`;
                el.style.height = `${Math.min(Math.max(start.h + dy, 176), dh - el.offsetTop)}px`;
            };
        }, () => saveGeom(win));
    }

    // Pointer-captured drag: `begin` returns a move(dx, dy) callback, or null to
    // refuse. The root class turns off pointer events on every iframe meanwhile.
    function drag(handle, rootClass, begin, end) {
        handle.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) return;
            const move = begin(event);
            if (!move) return;
            event.preventDefault();
            const ox = event.clientX;
            const oy = event.clientY;
            handle.setPointerCapture(event.pointerId);
            root.classList.add(rootClass);
            const onMove = (e) => move(e.clientX - ox, e.clientY - oy);
            const onUp = () => {
                root.classList.remove(rootClass);
                handle.removeEventListener('pointermove', onMove);
                handle.removeEventListener('pointerup', onUp);
                handle.removeEventListener('pointercancel', onUp);
                end();
            };
            handle.addEventListener('pointermove', onMove);
            handle.addEventListener('pointerup', onUp);
            handle.addEventListener('pointercancel', onUp);
        });
    }

    // A click inside an iframe never reaches this document; the only trace it
    // leaves is the page losing focus to that frame.
    window.addEventListener('blur', () => {
        setTimeout(() => {
            const active = document.activeElement;
            if (active && active.tagName === 'IFRAME') {
                const win = wins.get(active.closest('.os-win')?.dataset.id);
                if (win) focusWin(win);
            }
        }, 0);
    });

    window.addEventListener('resize', () => {
        for (const win of wins.values()) place(win, win.el.offsetLeft, win.el.offsetTop);
    });

    // --- the three kinds of window ----------------------------------------

    function openApp(app) {
        return openWindow({
            id: app.name,
            title: app.name,
            icon: tile(app),
            home: app.home,
            url: app.url,
            size: [920, 600],
            body(container, win) {
                const frame = h('iframe', { class: 'os-frame', src: app.home, title: app.name, allow: ALLOW, allowfullscreen: true });
                frame.addEventListener('load', () => win.el.classList.add('is-loaded'), { once: true });
                container.append(frame, h('div', { class: 'os-loading', 'aria-hidden': 'true' }, tile(app), h('span', null, `${T.loading} ${app.name}…`)));
            },
        });
    }

    function openFolder(cat) {
        return openWindow({
            id: `dir:${cat.slug}`,
            title: cat.title,
            icon: glyph(cat.emoji),
            size: [600, 420],
            bodyClass: 'os-folderbody',
            body(container) {
                const sorted = [...cat.apps].sort((a, b) => Number(b.window) - Number(a.window) || b.stars - a.stars || a.order - b.order);
                container.append(
                    h('ul', { class: 'os-grid' }, ...sorted.map((app) => h('li', null, appIcon(app)))),
                    h('p', { class: 'os-folderfoot' }, `${cat.apps.length} ${T.items}`)
                );
            },
        });
    }

    function openReadme() {
        store('local', SEEN_KEY, '1');
        return openWindow({
            id: 'readme',
            title: T.readme,
            icon: glyph('📄'),
            size: [500, 450],
            center: true,
            body(container) {
                container.append(readmeTpl.content.cloneNode(true));
            },
        });
    }

    // --- address bar --------------------------------------------------------

    function syncHash() {
        const ids = [...wins.keys()].filter((id) => id !== 'readme');
        const url = ids.length ? `#open=${ids.map((id) => encodeURIComponent(id).replace('%3A', ':')).join(',')}` : location.pathname + location.search;
        history.replaceState(history.state, '', url);
    }

    function restoreFromHash() {
        const match = location.hash.match(/^#open=(.+)$/);
        if (!match) return false;
        let opened = false;
        for (const raw of match[1].split(',')) {
            const id = decodeURIComponent(raw);
            if (id.startsWith('dir:')) {
                const cat = cats.find((c) => c.slug === id.slice(4));
                if (cat) {
                    openFolder(cat);
                    opened = true;
                }
            } else if (byName.get(id)?.window) {
                openApp(byName.get(id));
                opened = true;
            }
        }
        return opened;
    }

    // --- launcher -----------------------------------------------------------

    let hits = [];
    let selected = 0;

    function openLauncher() {
        launcher.hidden = false;
        startBtn.setAttribute('aria-expanded', 'true');
        search.value = '';
        renderResults();
        search.focus({ preventScroll: true });
    }

    function closeLauncher(restoreFocus) {
        if (launcher.hidden) return;
        launcher.hidden = true;
        startBtn.setAttribute('aria-expanded', 'false');
        if (restoreFocus) startBtn.focus({ preventScroll: true });
    }

    function renderResults() {
        const words = search.value.toLowerCase().split(/\s+/).filter(Boolean);
        const first = words[0] || '';
        hits = apps
            .filter((app) => words.every((word) => app.haystack.includes(word)))
            .sort((a, b) =>
                Number(b.name.startsWith(first) && !!first) - Number(a.name.startsWith(first) && !!first) ||
                Number(b.window) - Number(a.window) ||
                b.stars - a.stars ||
                a.order - b.order
            )
            .slice(0, 40);
        selected = 0;
        if (!hits.length) {
            results.replaceChildren(h('li', { class: 'os-empty', role: 'presentation' }, T.noResults));
            search.removeAttribute('aria-activedescendant');
            return;
        }
        results.replaceChildren(
            ...hits.map((app, index) =>
                h(
                    'li',
                    { class: 'os-result', role: 'option', id: `os-r-${index}`, 'aria-selected': String(index === 0), 'data-index': String(index) },
                    tile(app),
                    h('span', { class: 'os-result-text' }, h('span', { class: 'os-result-name' }, app.name), h('span', { class: 'os-result-desc' }, app.desc)),
                    h('span', { class: 'os-result-kind', 'data-kind': app.window ? 'window' : 'tab' }, app.window ? T.inWindow : `↗ ${T.newTab}`)
                )
            )
        );
        search.setAttribute('aria-activedescendant', 'os-r-0');
    }

    function select(index) {
        if (!hits.length) return;
        selected = (index + hits.length) % hits.length;
        for (const node of results.querySelectorAll('.os-result')) {
            node.setAttribute('aria-selected', String(Number(node.dataset.index) === selected));
        }
        const node = document.getElementById(`os-r-${selected}`);
        search.setAttribute('aria-activedescendant', node.id);
        node.scrollIntoView({ block: 'nearest' });
    }

    function launch(app) {
        closeLauncher(false);
        if (app.window) openApp(app);
        else window.open(app.home || app.url, '_blank', 'noopener');
    }

    search.placeholder = fill(T.search);
    search.setAttribute('aria-label', fill(T.search));
    search.addEventListener('input', renderResults);
    search.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            select(selected + 1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            select(selected - 1);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (hits[selected]) launch(hits[selected]);
        }
    });
    results.addEventListener('click', (event) => {
        const node = event.target.closest('.os-result');
        if (node) launch(hits[Number(node.dataset.index)]);
    });
    startBtn.addEventListener('click', () => (launcher.hidden ? openLauncher() : closeLauncher(true)));
    screen.addEventListener('pointerdown', (event) => {
        if (!launcher.hidden && !event.target.closest('#os-launcher, #os-start')) closeLauncher(false);
    });

    // --- desktop clicks, keyboard -------------------------------------------

    screen.addEventListener('click', (event) => {
        const target = event.target.closest('[data-app], [data-folder], [data-readme]');
        if (!target) return;
        if (target.dataset.app) openApp(byName.get(target.dataset.app));
        else if (target.dataset.folder) openFolder(cats.find((c) => c.slug === target.dataset.folder));
        else openReadme();
    });

    function typing() {
        const el = document.activeElement;
        return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
    }

    document.addEventListener('keydown', (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            if (launcher.hidden) openLauncher();
            else closeLauncher(true);
        } else if (event.key === '/' && !typing() && launcher.hidden) {
            event.preventDefault();
            openLauncher();
        } else if (event.key === 'Escape') {
            if (!launcher.hidden) {
                closeLauncher(true);
            } else if (screen.contains(document.activeElement)) {
                const win = [...wins.values()].find((w) => w.el.classList.contains('is-focused'));
                if (win) closeWin(win);
            }
        }
    });

    // --- tray ----------------------------------------------------------------

    if (screen.requestFullscreen) {
        fullBtn.addEventListener('click', () => {
            if (document.fullscreenElement) document.exitFullscreen();
            else screen.requestFullscreen().catch(() => {});
        });
    } else {
        fullBtn.hidden = true;
    }

    const timeFormat = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'fr-FR', { hour: '2-digit', minute: '2-digit' });
    function tick() {
        const now = new Date();
        clock.textContent = timeFormat.format(now);
        clock.dateTime = now.toISOString();
    }
    tick();
    setInterval(tick, 15000);

    function syncPhone() {
        root.classList.toggle('is-phone', phoneQuery.matches);
    }
    syncPhone();
    phoneQuery.addEventListener('change', syncPhone);

    // --- boot ------------------------------------------------------------------

    function runBoot() {
        if (reducedMotion || store('session', BOOT_KEY)) return;
        store('session', BOOT_KEY, '1');
        boot.hidden = false;
        const lines = T.boot.map(fill);
        let i = 0;
        let timer = null;
        const finish = () => {
            clearTimeout(timer);
            document.removeEventListener('keydown', finish, true);
            boot.classList.add('is-done');
            setTimeout(() => {
                boot.hidden = true;
            }, 400);
        };
        const next = () => {
            if (i >= lines.length) {
                boot.lastElementChild?.classList.add('os-boot-cursor');
                timer = setTimeout(finish, 450);
                return;
            }
            boot.append(h('div', { class: 'os-boot-line' }, lines[i++]));
            timer = setTimeout(next, 170);
        };
        boot.append(h('div', { class: 'os-boot-skip' }, T.skip));
        boot.addEventListener('click', finish, { once: true });
        document.addEventListener('keydown', finish, true);
        next();
    }

    // --- go ------------------------------------------------------------------

    buildDesktop();
    root.classList.add('is-live');
    screen.removeAttribute('data-pv-jsonly');
    runBoot();
    if (!restoreFromHash() && !store('local', SEEN_KEY)) openReadme();
})();
