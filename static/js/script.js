// Three preferences, cycled in this order. 'auto' is the default: no stored
// preference means the OS decides, which is also what a first-time visitor gets.
const THEME_MODES = ['auto', 'light', 'dark'];
const THEME_STORAGE_KEY = 'theme';

class ThemeManager {
    constructor() {
        this.toggle = document.getElementById('theme-toggle');
        if (!this.toggle) return;

        this.icon = document.getElementById('theme-icon');
        const {
            iconBase, iconAuto, iconDark, iconLight,
            labelAuto, labelDark, labelLight,
            soundSrc
        } = this.toggle.dataset;

        this.iconBase = iconBase;
        this.icons = { auto: iconAuto, dark: iconDark, light: iconLight };
        this.labels = { auto: labelAuto, dark: labelDark, light: labelLight };

        // Create audio element lazily only when needed
        this.sound = null;
        this.soundSrc = soundSrc;

        this.systemDark = window.matchMedia('(prefers-color-scheme: dark)');
        this.mode = this.readMode();

        this.init();
    }

    init() {
        // The head script already applied the theme, only the button needs syncing.
        this.render();

        this.toggle.addEventListener('click', () => this.cycleMode());
        this.toggle.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.cycleMode();
            }
        });

        // In auto mode the OS can flip the theme while the page is open.
        this.systemDark.addEventListener('change', () => {
            if (this.mode === 'auto') this.applyTheme();
        });
    }

    readMode() {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        return THEME_MODES.includes(saved) ? saved : 'auto';
    }

    cycleMode() {
        const next = (THEME_MODES.indexOf(this.mode) + 1) % THEME_MODES.length;
        this.setMode(THEME_MODES[next]);
    }

    setMode(mode) {
        document.body.classList.add('theme-transition');

        this.mode = mode;
        localStorage.setItem(THEME_STORAGE_KEY, mode);
        this.applyTheme();
        this.render();
        this.playSound();

        // Use requestAnimationFrame for better performance on transition
        requestAnimationFrame(() => {
            setTimeout(() => {
                document.body.classList.remove('theme-transition');
            }, 300);
        });
    }

    // data-theme always carries a resolved theme, never 'auto': the stylesheets
    // and dino.js only ever match on 'light'/'dark'.
    applyTheme() {
        const theme = this.mode === 'auto'
            ? (this.systemDark.matches ? 'dark' : 'light')
            : this.mode;
        document.documentElement.setAttribute('data-theme', theme);
    }

    render() {
        if (this.icon) {
            this.icon.setAttribute('href', `${this.iconBase}${this.icons[this.mode]}`);
        }

        const label = this.labels[this.mode];
        if (label) {
            this.toggle.setAttribute('aria-label', label);
            this.toggle.setAttribute('title', label);
        }
    }

    playSound() {
        // Lazy load sound only when needed
        if (!this.sound && this.soundSrc) {
            this.sound = new Audio(this.soundSrc);
        }

        if (this.sound) {
            this.sound.play().catch(() => {});
        }
    }
}


// Initialize when content is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ThemeManager());
} else {
    new ThemeManager();
}
