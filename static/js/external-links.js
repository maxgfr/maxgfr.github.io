// Tells screen readers which links leave the site.
//
// Every off-site link here opens in a new tab: config.toml's
// `external_links_target_blank` does it for everything written in Markdown, and the
// /projects templates spell out the same two attributes for the links Zola never
// sees. Opening a tab is a change of context — a sighted reader watches the browser
// make it, a screen-reader user gets no signal at all unless the link says so. So
// each one carries the warning in its accessible name (WCAG technique G201).
//
// Appended as visually-hidden text rather than set as an aria-label, which REPLACES
// the accessible name: every one of these links would then be announced as "opens in
// a new tab" and nothing else, throwing away the repo name it was pointing at.
//
// A rule in script rather than in the markup because most of these links are
// generated and no template owns them: Zola writes the attribute onto every Markdown
// link on the site, and projects-shell.js builds its listing at runtime, as you type.
(function () {
    const NOTES = { fr: ' (nouvel onglet)', en: ' (opens in a new tab)' };
    const note = NOTES[document.documentElement.lang] || NOTES.en;
    const SELECTOR = 'a[target="_blank"]';

    function announce(link) {
        // Marked BEFORE the append, because the append is itself a mutation the
        // observer below hands straight back to us. Without this the first link
        // would collect an endless tail of identical spans.
        if (link.dataset.newTabNoted !== undefined) return;
        link.dataset.newTabNoted = '';
        const sr = document.createElement('span');
        sr.className = 'sr-only';
        sr.textContent = note;
        link.append(sr);
    }

    function scan(root) {
        if (root.nodeType !== Node.ELEMENT_NODE) return;
        if (root.matches(SELECTOR)) announce(root);
        for (const link of root.querySelectorAll(SELECTOR)) announce(link);
    }

    scan(document.body);

    // /projects-shell rewrites its screen on every command and /projects-cards
    // re-renders on every keystroke in the filter, so a single pass at load would
    // only ever cover the links that arrived in the HTML.
    new MutationObserver((records) => {
        for (const record of records) {
            for (const node of record.addedNodes) scan(node);
        }
    }).observe(document.body, { childList: true, subtree: true });
})();
