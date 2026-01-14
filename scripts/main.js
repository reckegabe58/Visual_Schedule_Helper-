/**
 * Main JavaScript - Learning Circle Classroom
 * Navigation, theme management, and shared utilities
 */

// ===== DOM Ready Helper =====
function ready(fn) {
    if (document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

// ===== Navigation Module =====
const Navigation = {
    init() {
        this.mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        this.mobileNav = document.querySelector('.mobile-nav');
        this.navLinks = document.querySelectorAll('.nav-link');

        if (this.mobileMenuBtn && this.mobileNav) {
            this.bindEvents();
        }

        this.setActiveLink();
    },

    bindEvents() {
        // Toggle mobile menu
        this.mobileMenuBtn.addEventListener('click', () => this.toggleMobileMenu());

        // Close mobile menu when clicking a link
        this.mobileNav.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => this.closeMobileMenu());
        });

        // Close mobile menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.mobileNav.classList.contains('open')) {
                this.closeMobileMenu();
                this.mobileMenuBtn.focus();
            }
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.mobileNav.classList.contains('open') &&
                !this.mobileNav.contains(e.target) &&
                !this.mobileMenuBtn.contains(e.target)) {
                this.closeMobileMenu();
            }
        });
    },

    toggleMobileMenu() {
        const isOpen = this.mobileNav.classList.toggle('open');
        this.mobileMenuBtn.setAttribute('aria-expanded', isOpen);

        // Update icon
        const icon = this.mobileMenuBtn.querySelector('.material-symbols-outlined');
        if (icon) {
            icon.textContent = isOpen ? 'close' : 'menu';
        }

        // Trap focus in mobile menu
        if (isOpen) {
            const firstLink = this.mobileNav.querySelector('.nav-link');
            if (firstLink) firstLink.focus();
        }
    },

    closeMobileMenu() {
        this.mobileNav.classList.remove('open');
        this.mobileMenuBtn.setAttribute('aria-expanded', 'false');

        const icon = this.mobileMenuBtn.querySelector('.material-symbols-outlined');
        if (icon) {
            icon.textContent = 'menu';
        }
    },

    setActiveLink() {
        const currentPath = window.location.pathname;
        const pageName = currentPath.split('/').pop() || 'index.html';

        this.navLinks.forEach(link => {
            const href = link.getAttribute('href');
            const isActive = href === pageName ||
                (pageName === '' && href === 'index.html') ||
                (pageName === 'index.html' && href === 'index.html');

            link.classList.toggle('active', isActive);
        });
    }
};

// ===== Theme Module =====
const Theme = {
    STORAGE_KEY: 'classroom-theme',

    init() {
        this.loadSavedTheme();
        this.bindThemeToggle();
    },

    loadSavedTheme() {
        const savedTheme = localStorage.getItem(this.STORAGE_KEY);
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (savedTheme === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            // Check system preference
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            }
        }
    },

    bindThemeToggle() {
        const toggle = document.querySelector('.theme-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => this.toggle());
        }
    },

    toggle() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem(this.STORAGE_KEY, isDark ? 'dark' : 'light');
    },

    isDark() {
        return document.documentElement.classList.contains('dark');
    }
};

// ===== Utility Functions =====
const Utils = {
    /**
     * Format a Date object to a readable string
     */
    formatDate(date, format = 'full') {
        const options = {
            full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
            short: { month: 'short', day: 'numeric' },
            iso: null // Will use toISOString
        };

        if (format === 'iso') {
            return date.toISOString().split('T')[0];
        }

        return date.toLocaleDateString('en-US', options[format] || options.full);
    },

    /**
     * Format time from 24h to 12h format
     */
    formatTime(hours, minutes) {
        const h = hours % 12 || 12;
        const m = minutes.toString().padStart(2, '0');
        const ampm = hours < 12 ? 'AM' : 'PM';
        return `${h}:${m} ${ampm}`;
    },

    /**
     * Parse time string (e.g., "9:30 AM" or "14:30") to { hours, minutes }
     */
    parseTime(timeStr) {
        // Handle 24h format
        if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return { hours, minutes };
        }

        // Handle 12h format
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (!match) return null;

        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const period = match[3]?.toUpperCase();

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        return { hours, minutes };
    },

    /**
     * Convert hours and minutes to total minutes since midnight
     */
    timeToMinutes(hours, minutes) {
        return hours * 60 + minutes;
    },

    /**
     * Convert total minutes to hours and minutes
     */
    minutesToTime(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return { hours, minutes };
    },

    /**
     * Generate a unique ID
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Debounce function calls
     */
    debounce(fn, delay = 300) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    /**
     * Deep clone an object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Check if two time ranges overlap
     */
    timesOverlap(start1, end1, start2, end2) {
        return start1 < end2 && start2 < end1;
    },

    /**
     * Get today's date as ISO string (YYYY-MM-DD)
     */
    getTodayISO() {
        return new Date().toISOString().split('T')[0];
    },

    /**
     * Get day of week (0 = Sunday, 1 = Monday, etc.)
     */
    getDayOfWeek(dateStr) {
        return new Date(dateStr).getDay();
    },

    /**
     * Check if a date is a weekday
     */
    isWeekday(dateStr) {
        const day = this.getDayOfWeek(dateStr);
        return day !== 0 && day !== 6;
    }
};

// ===== Toast Notifications =====
const Toast = {
    container: null,

    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            this.container.setAttribute('role', 'status');
            this.container.setAttribute('aria-live', 'polite');
            document.body.appendChild(this.container);
        }
    },

    show(message, type = 'info', duration = 3000) {
        this.init();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        this.container.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('toast-visible');
        });

        // Auto dismiss
        setTimeout(() => {
            toast.classList.remove('toast-visible');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    success(message) {
        this.show(message, 'success');
    },

    error(message) {
        this.show(message, 'error');
    },

    warning(message) {
        this.show(message, 'warning');
    },

    info(message) {
        this.show(message, 'info');
    }
};

// Add toast styles dynamically
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    .toast-container {
        position: fixed;
        bottom: var(--space-6, 1.5rem);
        right: var(--space-6, 1.5rem);
        z-index: var(--z-toast, 500);
        display: flex;
        flex-direction: column;
        gap: var(--space-2, 0.5rem);
        pointer-events: none;
    }

    .toast {
        padding: var(--space-3, 0.75rem) var(--space-6, 1.5rem);
        border-radius: var(--radius-lg, 1rem);
        font-family: var(--font-display, sans-serif);
        font-weight: 600;
        font-size: var(--text-sm, 0.875rem);
        box-shadow: var(--shadow-lg);
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        pointer-events: auto;
    }

    .toast-visible {
        opacity: 1;
        transform: translateX(0);
    }

    .toast-success {
        background-color: var(--color-primary, #267340);
        color: white;
    }

    .toast-error {
        background-color: var(--color-error, #c44536);
        color: white;
    }

    .toast-warning {
        background-color: var(--color-ochre, #c88d32);
        color: white;
    }

    .toast-info {
        background-color: var(--color-sky-blue, #87B9C9);
        color: var(--color-text-primary, #121614);
    }
`;
document.head.appendChild(toastStyles);

// ===== Initialize on DOM Ready =====
ready(() => {
    Navigation.init();
    Theme.init();
});

// ===== Export for use in other modules =====
window.ClassroomApp = {
    Navigation,
    Theme,
    Utils,
    Toast
};
