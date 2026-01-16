/**
 * Smart Language Detection and Switching
 * Detects user's preferred language based on browser settings and location
 */

(function() {
    'use strict';

    // Configuration
    const DEFAULT_LANGUAGE = 'en';
    const SUPPORTED_LANGUAGES = ['en', 'fr'];
    const STORAGE_KEY = 'lang-preference';

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
        const storedPref = localStorage.getItem(STORAGE_KEY);
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

        // Store detected preference
        localStorage.setItem(STORAGE_KEY, preferredLang);

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
            
            // Store preference
            localStorage.setItem(STORAGE_KEY, selectedLang);
            
            // Navigate to new language version
            window.location.href = newPath;
        });
    }

    /**
     * Initialize language detection on page load
     */
    function init() {
        // Only redirect if this is the first visit (no stored preference)
        const hasStoredPreference = localStorage.getItem(STORAGE_KEY) !== null;
        
        if (!hasStoredPreference) {
            const redirected = redirectToPreferredLanguage();
            if (redirected) {
                return; // Don't continue if redirecting
            }
        }
        
        // Initialize language selector if it exists in the DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initLanguageSelector);
        } else {
            initLanguageSelector();
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
