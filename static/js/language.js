/**
 * Smart Language Detection and Switching
 * Detects user's preferred language based on browser settings and location
 */

(function() {
    'use strict';

    // Configuration
    const DEFAULT_LANGUAGE = 'en';
    const SUPPORTED_LANGUAGES = ['en', 'fr'];
    // Prefixed: the origin's localStorage is shared with every maxgfr.github.io/<app>/.
    const STORAGE_KEY = 'maxgfr:lang-preference';
    // sessionStorage: "the language just picked could not be stored".
    const NOTICE_KEY = 'maxgfr:lang-not-kept';

    // A brief, polite word when a choice could not be stored (storage full or
    // blocked): 'theme' or 'lang', worded per page language in templates/base.html.
    // Defined here because this is the first site-wide script; script.js uses it too.
    window.siteNotice = function (kind) {
        const notice = document.getElementById('site-notice');
        const message = notice && notice.dataset[kind + 'Msg'];
        if (!message) return;
        notice.textContent = message;
        notice.classList.add('is-shown');
        clearTimeout(window.siteNotice.timer);
        window.siteNotice.timer = setTimeout(() => {
            notice.classList.remove('is-shown');
            window.siteNotice.timer = setTimeout(() => { notice.textContent = ''; }, 300);
        }, 6000);
    };

    function showPendingNotice() {
        try {
            if (sessionStorage.getItem(NOTICE_KEY) === null) return;
            sessionStorage.removeItem(NOTICE_KEY);
        } catch (e) {
            return;
        }
        window.siteNotice('lang');
    }

    // Storage may be full or blocked (private mode, another app on the origin
    // filled the quota): reads give null, writes report whether they stuck.
    function readPreference() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            return null;
        }
    }

    function storePreference(lang) {
        try {
            localStorage.setItem(STORAGE_KEY, lang);
            return localStorage.getItem(STORAGE_KEY) === lang;
        } catch (e) {
            return false;
        }
    }

    /**
     * Get browser language with fallback to userLanguage (IE)
     */
    function getBrowserLanguage() {
        return navigator.language || navigator.userLanguage || 'en';
    }

    /**
     * Get browser languages list (most preferred first)
     */
    function getBrowserLanguages() {
        if (navigator.languages) {
            return navigator.languages;
        }
        return [getBrowserLanguage()];
    }

    /**
     * Normalize language code to 2-letter ISO code
     */
    function normalizeLanguage(lang) {
        if (!lang) return null;
        // Extract primary language subtag (e.g., 'en-US' -> 'en')
        const primaryLang = lang.split('-')[0].toLowerCase();
        return SUPPORTED_LANGUAGES.includes(primaryLang) ? primaryLang : null;
    }

    /**
     * Detect preferred language based on browser settings
     */
    function detectPreferredLanguage() {
        // Check localStorage first (user's explicit preference)
        const storedPref = readPreference();
        if (storedPref && SUPPORTED_LANGUAGES.includes(storedPref)) {
            return storedPref;
        }

        // Check browser languages in order of preference
        const browserLanguages = getBrowserLanguages();
        for (const lang of browserLanguages) {
            const normalized = normalizeLanguage(lang);
            if (normalized) {
                return normalized;
            }
        }

        // Fallback to default language (English)
        return DEFAULT_LANGUAGE;
    }

    /**
     * Check if current path is English
     */
    function isEnglishPath(path) {
        return path.startsWith('/en/') || path === '/en';
    }

    /**
     * Convert path to English version
     */
    function toEnglishPath(path) {
        if (path === '/' || path === '' || path === '/index.html') {
            return '/en/';
        }
        return '/en' + path;
    }

    /**
     * Convert path to French version
     */
    function toFrenchPath(path) {
        if (path === '/en/' || path === '/en') {
            return '/';
        }
        return path.replace('/en/', '/');
    }

    /**
     * Redirect to appropriate language version
     */
    function redirectToPreferredLanguage() {
        const currentPath = window.location.pathname;
        const preferredLang = detectPreferredLanguage();
        const isEnglish = isEnglishPath(currentPath);

        // Store detected preference. If it cannot be stored, do not redirect:
        // every later page would look like a first visit and keep overriding
        // the visitor's own choice of language.
        if (!storePreference(preferredLang)) return false;

        // Redirect if needed
        if (preferredLang === 'en' && !isEnglish) {
            window.location.replace(toEnglishPath(currentPath));
            return true;
        }

        if (preferredLang === 'fr' && isEnglish) {
            window.location.replace(toFrenchPath(currentPath));
            return true;
        }

        return false;
    }

    /**
     * Create language switcher element
     */
    function createLanguageSwitcher() {
        const switcher = document.createElement('button');
        switcher.id = 'lang-switcher';
        switcher.className = 'lang-switcher';
        switcher.setAttribute('type', 'button');
        switcher.setAttribute('aria-label', 'Switch language');
        
        const currentPath = window.location.pathname;
        const isEnglish = isEnglishPath(currentPath);
        
        const icon = document.createElement('span');
        icon.className = 'lang-icon';
        icon.textContent = isEnglish ? '🇬🇧' : '🇫🇷';
        
        const text = document.createElement('span');
        text.id = 'lang-text';
        text.className = 'lang-text';
        text.textContent = isEnglish ? 'FR' : 'EN';
        
        switcher.appendChild(icon);
        switcher.appendChild(text);
        
        return switcher;
    }

    /**
     * Initialize language selector functionality
     */
    function initLanguageSelector() {
        const selector = document.getElementById('lang-select');
        if (!selector) return;

        selector.addEventListener('change', function(e) {
            const selectedLang = e.target.value;
            const currentPath = window.location.pathname;
            
            let newPath;
            
            if (selectedLang === 'en') {
                newPath = toEnglishPath(currentPath);
            } else if (selectedLang === 'fr') {
                newPath = toFrenchPath(currentPath);
            }
            
            // Store preference. If it cannot be kept, say so on the next page
            // (flagged in sessionStorage), or here before leaving when even
            // that is refused.
            if (!storePreference(selectedLang)) {
                try {
                    sessionStorage.setItem(NOTICE_KEY, '1');
                } catch (err) {
                    window.siteNotice('lang');
                    setTimeout(function () { window.location.href = newPath; }, 2500);
                    return;
                }
            }

            // Navigate to new language version
            window.location.href = newPath;
        });
    }

    /**
     * Initialize language detection on page load
     */
    function init() {
        // Only redirect if this is the first visit (no stored preference)
        const hasStoredPreference = readPreference() !== null;
        
        if (!hasStoredPreference) {
            const redirected = redirectToPreferredLanguage();
            if (redirected) {
                return; // Don't continue if redirecting
            }
        }
        
        // Initialize language selector if it exists in the DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initLanguageSelector);
            document.addEventListener('DOMContentLoaded', showPendingNotice);
        } else {
            initLanguageSelector();
            showPendingNotice();
        }
    }

    // Auto-initialize
    init();

    // Export functions for use in templates
    window.LanguageDetector = {
        detectPreferredLanguage,
        isEnglishPath,
        toEnglishPath,
        toFrenchPath,
        initLanguageSelector
    };
})();
