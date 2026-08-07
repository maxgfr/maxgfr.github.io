// The REPL behind /projects-shell.
//
// Reads its model out of the server-rendered `.sh-fs` listing, so the no-JS
// fallback and the shell can never disagree about what exists. Same self-disabling
// guard as dino.js: absent the markup, this file does nothing anywhere else.
//
// Everything is local — no fetch, no eval, no history rewriting. `open` is the only
// command with an effect beyond the screen, and it opens a link the page already
// contains.
(function () {
    const term = document.querySelector('.sh-term');
    const fs = document.getElementById('sh-fs');
    const form = document.getElementById('sh-form');
    if (!term || !fs || !form) return;

    const out = document.getElementById('sh-out');
    const input = document.getElementById('sh-in');
    const ps1 = document.getElementById('sh-ps1');

    let T;
    try {
        T = JSON.parse(document.getElementById('sh-i18n').textContent);
    } catch {
        return; // no strings, no shell — better than a half-English prompt
    }

    // --- model, lifted from the DOM ---------------------------------------

    const dirs = Array.from(fs.querySelectorAll('.sh-dir')).map((node) => ({
        slug: node.querySelector('.sh-dirname').dataset.slug,
        label: node.querySelector('.sh-dirlabel').textContent.trim(),
    }));

    const files = Array.from(fs.querySelectorAll('.sh-file')).map((node) => ({
        name: node.dataset.name,
        url: node.dataset.url,
        home: node.dataset.home || null,
        cat: Number(node.dataset.cat),
        stars: Number(node.dataset.stars),
        forks: Number(node.dataset.forks),
        language: node.dataset.language || null,
        license: node.dataset.license || null,
        created: node.dataset.created,
        pushed: node.dataset.pushed,
        topics: node.dataset.topics ? node.dataset.topics.split(' ') : [],
        desc: node.querySelector('.sh-desc').textContent.trim(),
    }));

    // Each theme's totals, folded in once. `ls` at the root lists themes rather than
    // repos, so without these `sort` would have nothing to act on there — see
    // DIR_SORTS below.
    for (const [index, dir] of dirs.entries()) {
        const own = files.filter((f) => f.cat === index);
        dir.count = own.length;
        dir.stars = own.reduce((total, f) => total + f.stars, 0);
        dir.created = own.reduce((latest, f) => (f.created > latest ? f.created : latest), '');
    }

    // --- state ------------------------------------------------------------

    let cwd = null; // null = root; otherwise a dir slug
    let order = 'name';
    const history = [];
    let historyAt = 0;

    // The listing currently on screen, as a thunk that redraws it. `sort` replays it
    // in the new order: a setting whose effect you cannot see reads as broken, and
    // the shell opens at the root where the only listing is the theme list.
    let lastListing = null;

    const SORTS = {
        name: (a, b) => a.name.localeCompare(b.name),
        stars: (a, b) => b.stars - a.stars || a.name.localeCompare(b.name),
        recent: (a, b) => b.created.localeCompare(a.created) || a.name.localeCompare(b.name),
    };

    // The same three keys applied to a theme, so `sort stars` reorders the root
    // listing too instead of announcing a change nothing on screen reflects.
    const DIR_SORTS = {
        name: (a, b) => a.slug.localeCompare(b.slug),
        stars: (a, b) => b.stars - a.stars || a.slug.localeCompare(b.slug),
        recent: (a, b) => b.created.localeCompare(a.created) || a.slug.localeCompare(b.slug),
    };

    const inDir = (slug) => {
        const index = dirs.findIndex((d) => d.slug === slug);
        return files.filter((f) => f.cat === index).sort(SORTS[order]);
    };

    // --- output -----------------------------------------------------------

    // textContent everywhere, never innerHTML: descriptions are real prose from a
    // config file and one apostrophe or angle bracket should not be able to reach
    // the parser.
    function line(text, cls) {
        const el = document.createElement('div');
        el.className = cls ? `sh-line ${cls}` : 'sh-line';
        el.textContent = text;
        out.appendChild(el);
        return el;
    }

    function echo(command) {
        const el = line('');
        const prompt = document.createElement('span');
        prompt.className = 'sh-echo-ps1';
        prompt.textContent = promptText();
        const said = document.createElement('span');
        said.textContent = ` ${command}`;
        el.append(prompt, said);
    }

    // The script replaces the server-rendered listing at boot, so these are the links
    // actually clicked. Same target/rel as the markup they stand in for, and as
    // `open` has always used: the shell keeps its screen, you keep your place.
    function offsite(href, text, cls) {
        const link = document.createElement('a');
        link.href = href;
        link.textContent = text;
        if (cls) link.className = cls;
        link.target = '_blank';
        link.rel = 'noopener external';
        return link;
    }

    // A repo row: the name is a real link, so a shell listing is still navigable by
    // keyboard and still shows a URL on hover.
    function fileLine(file) {
        const el = line('', 'sh-filerow');
        const link = offsite(file.url, file.name, 'sh-fname');
        const meta = document.createElement('span');
        meta.className = 'sh-meta';
        const bits = [];
        if (file.language) bits.push(file.language);
        if (file.stars > 0) bits.push(`★ ${file.stars}`);
        meta.textContent = bits.length ? ` ${bits.join(' · ')}` : '';
        const desc = document.createElement('span');
        desc.className = 'sh-inline-desc';
        desc.textContent = ` — ${file.desc}`;
        el.append(link, meta, desc);
    }

    // `T.repo` may be missing if a cached page predates it; the plural then reads
    // exactly as it did before rather than printing "undefined".
    const repoCount = (n) => `${n} ${n === 1 && T.repo ? T.repo : T.repos}`;

    function promptText() {
        return `maxgfr@projects:~${cwd ? `/${cwd}` : ''}$`;
    }

    function syncPrompt() {
        ps1.textContent = promptText();
    }

    // --- commands ---------------------------------------------------------

    function cmdLs(arg) {
        lastListing = () => cmdLs(arg);
        const target = arg || cwd;
        if (!target) {
            line(`${dirs.length} ${T.dirs}`, 'sh-dim');
            // Same shape as a repo row — name, totals, description — so the totals
            // the root listing is ordered by are on screen next to the order.
            for (const dir of [...dirs].sort(DIR_SORTS[order])) {
                const el = line('', 'sh-filerow');
                const name = document.createElement('span');
                name.className = 'sh-dirtag';
                name.textContent = `${dir.slug}/`;
                const meta = document.createElement('span');
                meta.className = 'sh-meta';
                meta.textContent = ` ${repoCount(dir.count)}${dir.stars ? ` · ★ ${dir.stars}` : ''}`;
                const label = document.createElement('span');
                label.className = 'sh-inline-desc';
                label.textContent = ` ${dir.label}`;
                el.append(name, meta, label);
            }
            return;
        }
        if (!dirs.some((d) => d.slug === target)) {
            line(`${T.noSuchDir} ${target}`, 'sh-err');
            return;
        }
        const list = inDir(target);
        line(repoCount(list.length), 'sh-dim');
        list.forEach(fileLine);
    }

    function cmdCd(arg) {
        if (!arg || arg === '/' || arg === '~') {
            cwd = null;
        } else if (arg === '..') {
            cwd = null;
        } else {
            const slug = arg.replace(/\/$/, '');
            if (!dirs.some((d) => d.slug === slug)) {
                line(`${T.noSuchDir} ${arg}`, 'sh-err');
                return;
            }
            cwd = slug;
        }
        syncPrompt();
        line(promptText().replace(/\$$/, ''), 'sh-dim');
    }

    function cmdCat(arg) {
        const file = files.find((f) => f.name === arg);
        if (!file) {
            line(`${T.noSuchRepo} ${arg || ''}`.trim(), 'sh-err');
            return;
        }
        const L = T.labels;
        const rows = [
            [L.theme, dirs[file.cat] ? dirs[file.cat].label : '—'],
            [L.language, file.language || '—'],
            [L.stars, String(file.stars)],
            [L.forks, String(file.forks)],
            [L.licence, file.license || '—'],
            [L.created, file.created],
            [L.pushed, file.pushed],
            [L.topics, file.topics.length ? file.topics.join(' ') : '—'],
        ];
        line(file.name, 'sh-strong');
        line(file.desc);
        const width = Math.max(...rows.map(([k]) => k.length));
        for (const [key, value] of rows) {
            line(`  ${key.padEnd(width)}  ${value}`, 'sh-kv');
        }
        const links = line('', 'sh-filerow');
        links.append(document.createTextNode('  '), offsite(file.url, L.code));
        if (file.home) {
            links.append(document.createTextNode('  '), offsite(file.home, L.demo));
        }
    }

    function cmdFind(arg) {
        lastListing = () => cmdFind(arg);
        if (!arg) {
            line(T.nothing, 'sh-dim');
            return;
        }
        const needle = arg.toLowerCase();
        const hits = files
            .filter((f) =>
                `${f.name} ${f.desc} ${f.topics.join(' ')} ${f.language || ''}`
                    .toLowerCase()
                    .includes(needle)
            )
            .sort(SORTS[order]);
        if (!hits.length) {
            line(T.nothing, 'sh-dim');
            return;
        }
        line(`${hits.length} ${T.matches}`, 'sh-dim');
        hits.forEach(fileLine);
    }

    function cmdOpen(args) {
        const wantsDemo = args.includes('--demo');
        const name = args.find((a) => !a.startsWith('--'));
        const file = files.find((f) => f.name === name);
        if (!file) {
            line(`${T.noSuchRepo} ${name || ''}`.trim(), 'sh-err');
            return;
        }
        if (wantsDemo && !file.home) {
            line(`${T.noDemo} ${file.name}`, 'sh-err');
            return;
        }
        const url = wantsDemo ? file.home : file.url;
        line(`${T.opening} ${url}`, 'sh-dim');
        window.open(url, '_blank', 'noopener');
    }

    // hasOwn, not `SORTS[arg]`: a plain object inherits Object.prototype, so `sort
    // constructor` and `sort toString` were accepted and then handed to Array#sort
    // as the comparator, which silently produced a nonsense order.
    function cmdSort(arg) {
        if (!Object.hasOwn(SORTS, String(arg))) {
            line(T.badSort, 'sh-err');
            return;
        }
        order = arg;
        line(`${T.sorted} ${arg}`, 'sh-dim');
        if (lastListing) lastListing();
    }

    function cmdTree() {
        lastListing = () => cmdTree();
        for (const dir of dirs) {
            line(`${dir.slug}/`, 'sh-dirtag');
            inDir(dir.slug).forEach(fileLine);
        }
    }

    function cmdHelp() {
        line(T.help, 'sh-strong');
        for (const l of T.helpLines) line(`  ${l}`, 'sh-kv');
    }

    function run(raw) {
        const parts = raw.trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return;
        const [cmd, ...args] = parts;
        switch (cmd) {
            case 'help': cmdHelp(); break;
            case 'ls': cmdLs(args[0]); break;
            case 'cd': cmdCd(args[0]); break;
            case 'pwd': line(`~${cwd ? `/${cwd}` : ''}`); break;
            case 'cat': cmdCat(args[0]); break;
            case 'find': cmdFind(args.join(' ')); break;
            case 'open': cmdOpen(args); break;
            case 'sort': cmdSort(args[0]); break;
            case 'tree': cmdTree(); break;
            case 'clear': out.replaceChildren(); break;
            default:
                line(`${T.notFound} ${cmd}`, 'sh-err');
                line(T.hint, 'sh-dim');
        }
    }

    function submit(raw) {
        echo(raw);
        run(raw);
        if (raw.trim()) {
            history.push(raw);
            historyAt = history.length;
        }
        // Keep the newest output in view without moving the page itself.
        out.scrollTop = out.scrollHeight;
    }

    // --- completion -------------------------------------------------------

    const COMMANDS = ['help', 'ls', 'cd', 'pwd', 'cat', 'find', 'open', 'sort', 'tree', 'clear'];

    function complete() {
        const value = input.value;
        const parts = value.split(/\s+/);
        const word = parts[parts.length - 1];
        let pool;
        if (parts.length <= 1) pool = COMMANDS;
        else if (parts[0] === 'cd' || parts[0] === 'ls') pool = dirs.map((d) => d.slug);
        else if (parts[0] === 'sort') pool = Object.keys(SORTS);
        else pool = files.map((f) => f.name);

        const hits = pool.filter((c) => c.startsWith(word));
        if (!hits.length) return;
        if (hits.length === 1) {
            parts[parts.length - 1] = hits[0];
            input.value = parts.join(' ') + ' ';
            return;
        }
        // Several candidates: fill in the longest shared prefix, then show the
        // options — what a real shell does, and it beats cycling blindly.
        let prefix = hits[0];
        for (const hit of hits) {
            while (!hit.startsWith(prefix)) prefix = prefix.slice(0, -1);
        }
        if (prefix.length > word.length) {
            parts[parts.length - 1] = prefix;
            input.value = parts.join(' ');
        }
        line(hits.join('  '), 'sh-dim');
        out.scrollTop = out.scrollHeight;
    }

    // --- wiring -----------------------------------------------------------

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const raw = input.value;
        input.value = '';
        submit(raw);
    });

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Tab') {
            event.preventDefault();
            complete();
        } else if (event.key === 'ArrowUp') {
            if (!history.length) return;
            event.preventDefault();
            historyAt = Math.max(0, historyAt - 1);
            input.value = history[historyAt] || '';
        } else if (event.key === 'ArrowDown') {
            if (!history.length) return;
            event.preventDefault();
            historyAt = Math.min(history.length, historyAt + 1);
            input.value = history[historyAt] || '';
        }
    });

    for (const button of document.querySelectorAll('.sh-hint')) {
        button.addEventListener('click', () => {
            submit(button.dataset.cmd);
            input.focus();
        });
    }

    // Clicking anywhere on the screen focuses the prompt, the way a terminal does —
    // but not when the click was on a link or a text selection.
    term.addEventListener('click', (event) => {
        if (event.target.closest('a')) return;
        if (window.getSelection() && String(window.getSelection())) return;
        input.focus();
    });

    // --- boot -------------------------------------------------------------

    // The static listing was the fallback; from here the shell owns the screen.
    fs.hidden = true;
    term.removeAttribute('data-pv-jsonly');
    form.removeAttribute('data-pv-jsonly');
    document.querySelector('.sh-hints').removeAttribute('data-pv-jsonly');
    syncPrompt();
    line(T.welcome, 'sh-dim');
    // Open on a real listing rather than a bare prompt: an empty terminal is the
    // fastest way to lose someone who did not come here to learn a command set.
    submit('ls');
})();
