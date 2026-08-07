// Filter and sort for /projects-cards.
//
// Progressive enhancement, on the same terms as dino.js: the guard below means
// this file costs nothing on any other page, and the controls it drives are
// hidden until it runs. With JS off the grid still renders every project, grouped
// and ordered by the curation in projects.json — which is the order this script
// calls "curated" and restores by default.
//
// Sorting happens WITHIN each theme section, never across them. Flattening 69
// cards into one popularity ranking would throw away the only editorial judgement
// the dataset carries.
(function () {
    const form = document.querySelector('.pvc-controls');
    if (!form) return;

    const sections = Array.from(document.querySelectorAll('.pvc-section'));
    if (!sections.length) return;

    const search = form.querySelector('#pvc-q');
    const language = form.querySelector('#pvc-lang');
    const sort = form.querySelector('#pvc-sort');
    const count = form.querySelector('.pvc-count');

    // The DOM order at load IS the curated order, so capture it before touching
    // anything — it is the only place that ordering exists on the client.
    const groups = sections.map((section) => {
        const grid = section.querySelector('.pvc-grid');
        return { section, grid, curated: Array.from(grid.children) };
    });

    // Lowercase the haystack once rather than on every keystroke.
    const haystack = new WeakMap();
    for (const group of groups) {
        for (const card of group.curated) {
            haystack.set(card, (card.dataset.search || '').toLowerCase());
        }
    }

    const total = groups.reduce((sum, group) => sum + group.curated.length, 0);
    const byName = (a, b) => a.dataset.name.localeCompare(b.dataset.name);
    const COMPARATORS = {
        curated: null,
        stars: (a, b) => Number(b.dataset.stars) - Number(a.dataset.stars) || byName(a, b),
        // The dates are "YYYY-MM", so a string compare is a date compare.
        pushed: (a, b) => b.dataset.pushed.localeCompare(a.dataset.pushed) || byName(a, b),
        name: byName,
    };

    let empty = document.querySelector('.pvc-empty');
    if (!empty) {
        empty = document.createElement('p');
        empty.className = 'pvc-empty';
        empty.hidden = true;
        empty.textContent = form.dataset.empty || '';
        form.after(empty);
    }

    function apply() {
        const needle = search.value.trim().toLowerCase();
        const wanted = language.value;
        const comparator = COMPARATORS[sort.value] || null;
        let shown = 0;

        for (const group of groups) {
            const order = comparator ? group.curated.slice().sort(comparator) : group.curated;
            // Re-appending an existing child moves it; a DocumentFragment keeps it
            // to one reflow per section instead of one per card.
            const fragment = document.createDocumentFragment();
            let visible = 0;

            for (const card of order) {
                const matches =
                    (!wanted || card.dataset.language === wanted) &&
                    (!needle || haystack.get(card).includes(needle));
                card.hidden = !matches;
                if (matches) visible++;
                fragment.appendChild(card);
            }

            group.grid.appendChild(fragment);
            group.section.hidden = visible === 0;
            shown += visible;
        }

        count.textContent = shown === total ? String(total) : `${shown} / ${total}`;
        empty.hidden = shown > 0;
    }

    form.addEventListener('input', apply);
    form.addEventListener('change', apply);
    // Nothing to submit — the filtering is live, and a reload would only lose it.
    form.addEventListener('submit', (event) => event.preventDefault());

    form.removeAttribute('data-pv-jsonly');
    apply();
})();
