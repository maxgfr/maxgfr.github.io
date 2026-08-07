// Pointer tilt and gloss for the cards on /projects-dex.
//
// Pure enhancement. Every card is fully rendered server-side, so with this file
// blocked the page is still a complete, readable, linkable catalogue — it just
// stops leaning towards the cursor. Same self-disabling guard as dino.js, so it
// costs nothing anywhere else.
//
// The script only ever writes four custom properties (--rx, --ry, --mx, --my);
// all the visual consequences live in static/css/projects-dex.css.
(function () {
    const grid = document.querySelector('.dex');
    if (!grid) return;

    // Honour the OS setting, and keep honouring it if it changes mid-visit rather
    // than only at load. The CSS already neutralises the transform under the same
    // query; this stops the listeners doing pointless work behind it.
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Tuned by eye: past about 8° the pixel sprite starts to shear visibly, and
    // the card stops reading as a card.
    const MAX_TILT = 7;

    let frame = null;
    let queued = null;

    function paint() {
        frame = null;
        if (!queued) return;
        const { card, x, y } = queued;
        queued = null;
        card.style.setProperty('--ry', `${(x - 0.5) * 2 * MAX_TILT}deg`);
        // Inverted: pushing the pointer down should tip the top of the card away.
        card.style.setProperty('--rx', `${(0.5 - y) * 2 * MAX_TILT}deg`);
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
    }

    function onMove(event) {
        if (calm.matches) return;
        const card = event.target.closest('.dex-card');
        if (!card) return;
        const box = card.getBoundingClientRect();
        if (!box.width || !box.height) return;
        // Coalesce to one write per frame: pointermove fires far faster than the
        // screen refreshes, and each write invalidates layout on a 70-card page.
        queued = {
            card,
            x: (event.clientX - box.left) / box.width,
            y: (event.clientY - box.top) / box.height,
        };
        if (frame === null) frame = requestAnimationFrame(paint);
    }

    function reset(event) {
        const card = event.target.closest('.dex-card');
        if (!card) return;
        if (queued && queued.card === card) queued = null;
        for (const prop of ['--rx', '--ry']) card.style.removeProperty(prop);
        card.style.setProperty('--mx', '50%');
        card.style.setProperty('--my', '50%');
    }

    // Delegated from the grid: 70 cards would otherwise mean 140 listeners.
    // pointermove covers mouse, pen and touch-drag alike.
    grid.addEventListener('pointermove', onMove);
    grid.addEventListener('pointerleave', reset, true);
    grid.addEventListener('pointercancel', reset, true);

    // A card tilted by the pointer and then left behind by a keyboard tab would
    // stay crooked; straighten whatever gains focus.
    grid.addEventListener('focusin', reset);

    calm.addEventListener('change', () => {
        if (!calm.matches) return;
        for (const card of grid.querySelectorAll('.dex-card')) {
            card.style.removeProperty('--rx');
            card.style.removeProperty('--ry');
        }
    });
})();
