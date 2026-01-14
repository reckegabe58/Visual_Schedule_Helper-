/**
 * Schedule Data Model - Learning Circle Classroom
 * Handles data storage, retrieval, and schedule manipulation
 */

// ===== Constants =====
const STORAGE_KEYS = {
    SCHEDULES: 'classroom_schedules',
    SETTINGS: 'classroom_schedule_settings',
    CUSTOM_CARDS: 'classroom_custom_cards'
};

const TIME_CONFIG = {
    SCHOOL_START: { hours: 9, minutes: 0 },
    SCHOOL_END: { hours: 15, minutes: 30 },
    DEFAULT_DURATION: 30,
    TIME_INCREMENT: 15,
    DRAG_INCREMENT: 15
};

// ===== Visual Cards Data =====
let visualsConfig = null;
let visualsMap = new Map();
let customIconsMap = new Map();

/**
 * Load visuals configuration from JSON file
 */
async function loadVisualsConfig() {
    if (visualsConfig) return visualsConfig;

    try {
        const response = await fetch('data/visuals.json');
        if (!response.ok) throw new Error('Failed to load visuals config');

        visualsConfig = await response.json();

        // Build lookup maps
        visualsConfig.cards.forEach(card => {
            visualsMap.set(card.id, card);
        });

        visualsConfig.customIcons.forEach(icon => {
            customIconsMap.set(icon.id, icon);
        });

        return visualsConfig;
    } catch (error) {
        console.error('Error loading visuals config:', error);
        return null;
    }
}

/**
 * Get a visual card by ID
 */
function getVisualCard(id) {
    return visualsMap.get(id) || null;
}

/**
 * Get all visual cards grouped by category
 */
function getCardsByCategory() {
    if (!visualsConfig) return {};

    const grouped = {};
    visualsConfig.categories.forEach(cat => {
        grouped[cat.id] = {
            ...cat,
            cards: visualsConfig.cards.filter(card => card.category === cat.id)
        };
    });
    return grouped;
}

/**
 * Get custom icons for custom card creation
 */
function getCustomIcons() {
    return visualsConfig?.customIcons || [];
}

// ===== Schedule Block Model =====

/**
 * Create a new schedule block
 */
function createBlock(cardId, options = {}) {
    const card = getVisualCard(cardId);
    const customCard = options.customCard || null;

    return {
        id: generateBlockId(),
        cardId: cardId,
        label: options.label || card?.label || customCard?.label || 'Custom',
        startTime: options.startTime || null,  // { hours, minutes }
        endTime: options.endTime || null,      // { hours, minutes }
        duration: options.duration || card?.defaultDuration || TIME_CONFIG.DEFAULT_DURATION,
        notes: options.notes || '',
        isCustom: !!customCard,
        customCard: customCard,  // { label, iconId, color }
        createdAt: Date.now()
    };
}

/**
 * Generate unique block ID
 */
function generateBlockId() {
    return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate end time from start time and duration
 */
function calculateEndTime(startTime, durationMinutes) {
    if (!startTime) return null;

    const totalMinutes = startTime.hours * 60 + startTime.minutes + durationMinutes;
    return {
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60
    };
}

/**
 * Calculate duration from start and end times
 */
function calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return null;

    const startMinutes = startTime.hours * 60 + startTime.minutes;
    const endMinutes = endTime.hours * 60 + endTime.minutes;
    return endMinutes - startMinutes;
}

/**
 * Snap time to increment (15 min by default)
 */
function snapToIncrement(minutes, increment = TIME_CONFIG.TIME_INCREMENT) {
    return Math.round(minutes / increment) * increment;
}

/**
 * Format time object to string
 */
function formatTime(time) {
    if (!time) return '';

    const h = time.hours % 12 || 12;
    const m = time.minutes.toString().padStart(2, '0');
    const ampm = time.hours < 12 ? 'AM' : 'PM';
    return `${h}:${m} ${ampm}`;
}

/**
 * Parse time string to object
 */
function parseTimeString(timeStr) {
    if (!timeStr) return null;

    // Handle 24h format (HH:MM)
    const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
        return {
            hours: parseInt(match24[1], 10),
            minutes: parseInt(match24[2], 10)
        };
    }

    // Handle 12h format (H:MM AM/PM)
    const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
        let hours = parseInt(match12[1], 10);
        const minutes = parseInt(match12[2], 10);
        const period = match12[3].toUpperCase();

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        return { hours, minutes };
    }

    return null;
}

/**
 * Convert time object to 24h string (for input fields)
 */
function timeTo24hString(time) {
    if (!time) return '';
    const h = time.hours.toString().padStart(2, '0');
    const m = time.minutes.toString().padStart(2, '0');
    return `${h}:${m}`;
}

// ===== Schedule Operations =====

/**
 * Check if two blocks can be merged (same subject, consecutive)
 */
function canMergeBlocks(block1, block2) {
    // Must be same card type
    if (block1.cardId !== block2.cardId) return false;

    // Custom cards must have same label
    if (block1.isCustom || block2.isCustom) {
        if (block1.label !== block2.label) return false;
    }

    // If both have times, check if consecutive
    if (block1.endTime && block2.startTime) {
        const end1 = block1.endTime.hours * 60 + block1.endTime.minutes;
        const start2 = block2.startTime.hours * 60 + block2.startTime.minutes;
        return Math.abs(end1 - start2) <= TIME_CONFIG.TIME_INCREMENT;
    }

    return true;  // No times = can merge if same type
}

/**
 * Merge two blocks into one
 */
function mergeBlocks(block1, block2) {
    return {
        ...block1,
        id: generateBlockId(),
        duration: block1.duration + block2.duration,
        endTime: block2.endTime || calculateEndTime(block1.startTime, block1.duration + block2.duration),
        notes: [block1.notes, block2.notes].filter(Boolean).join(' | ')
    };
}

/**
 * Auto-merge consecutive same-subject blocks in schedule
 */
function autoMergeSchedule(blocks) {
    if (blocks.length < 2) return blocks;

    const merged = [];
    let current = { ...blocks[0] };

    for (let i = 1; i < blocks.length; i++) {
        const next = blocks[i];

        if (canMergeBlocks(current, next)) {
            current = mergeBlocks(current, next);
        } else {
            merged.push(current);
            current = { ...next };
        }
    }

    merged.push(current);
    return merged;
}

/**
 * Normalize times - auto-chain blocks sequentially
 */
function normalizeScheduleTimes(blocks, startTime = TIME_CONFIG.SCHOOL_START) {
    let currentTime = { ...startTime };

    return blocks.map(block => {
        const newBlock = {
            ...block,
            startTime: { ...currentTime },
            endTime: calculateEndTime(currentTime, block.duration)
        };

        // Move to next block's start time
        currentTime = { ...newBlock.endTime };

        return newBlock;
    });
}

/**
 * Check for time overlaps in schedule
 */
function findTimeOverlaps(blocks) {
    const overlaps = [];

    for (let i = 0; i < blocks.length; i++) {
        for (let j = i + 1; j < blocks.length; j++) {
            const a = blocks[i];
            const b = blocks[j];

            if (!a.startTime || !a.endTime || !b.startTime || !b.endTime) continue;

            const aStart = a.startTime.hours * 60 + a.startTime.minutes;
            const aEnd = a.endTime.hours * 60 + a.endTime.minutes;
            const bStart = b.startTime.hours * 60 + b.startTime.minutes;
            const bEnd = b.endTime.hours * 60 + b.endTime.minutes;

            if (aStart < bEnd && bStart < aEnd) {
                overlaps.push({ block1: a.id, block2: b.id });
            }
        }
    }

    return overlaps;
}

/**
 * Get current active block based on time
 */
function getCurrentBlock(blocks) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const block of blocks) {
        if (!block.startTime || !block.endTime) continue;

        const startMinutes = block.startTime.hours * 60 + block.startTime.minutes;
        const endMinutes = block.endTime.hours * 60 + block.endTime.minutes;

        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
            return block;
        }
    }

    return null;
}

// ===== Storage Operations =====

/**
 * Get date key for storage (YYYY-MM-DD)
 */
function getDateKey(date = new Date()) {
    if (typeof date === 'string') return date;
    return date.toISOString().split('T')[0];
}

/**
 * Load all schedules from storage
 */
function loadAllSchedules() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error('Error loading schedules:', error);
        return {};
    }
}

/**
 * Save all schedules to storage
 */
function saveAllSchedules(schedules) {
    try {
        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
        return true;
    } catch (error) {
        console.error('Error saving schedules:', error);
        return false;
    }
}

/**
 * Load schedule for a specific date
 */
function loadScheduleForDate(date) {
    const dateKey = getDateKey(date);
    const schedules = loadAllSchedules();
    return schedules[dateKey] || [];
}

/**
 * Save schedule for a specific date
 */
function saveScheduleForDate(date, blocks) {
    const dateKey = getDateKey(date);
    const schedules = loadAllSchedules();
    schedules[dateKey] = blocks;
    return saveAllSchedules(schedules);
}

/**
 * Delete schedule for a specific date
 */
function deleteScheduleForDate(date) {
    const dateKey = getDateKey(date);
    const schedules = loadAllSchedules();
    delete schedules[dateKey];
    return saveAllSchedules(schedules);
}

/**
 * Copy schedule from one date to another
 */
function copySchedule(fromDate, toDate) {
    const blocks = loadScheduleForDate(fromDate);
    if (blocks.length === 0) return false;

    // Generate new IDs for copied blocks
    const copiedBlocks = blocks.map(block => ({
        ...block,
        id: generateBlockId(),
        createdAt: Date.now()
    }));

    return saveScheduleForDate(toDate, copiedBlocks);
}

// ===== Custom Cards Storage =====

/**
 * Load user's custom cards
 */
function loadCustomCards() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_CARDS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error loading custom cards:', error);
        return [];
    }
}

/**
 * Save user's custom cards
 */
function saveCustomCards(cards) {
    try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_CARDS, JSON.stringify(cards));
        return true;
    } catch (error) {
        console.error('Error saving custom cards:', error);
        return false;
    }
}

/**
 * Add a new custom card
 */
function addCustomCard(label, iconId, color) {
    const cards = loadCustomCards();
    const newCard = {
        id: `custom_${Date.now()}`,
        label,
        iconId,
        color: color || '#6a8171',
        createdAt: Date.now()
    };
    cards.push(newCard);
    saveCustomCards(cards);
    return newCard;
}

/**
 * Delete a custom card
 */
function deleteCustomCard(cardId) {
    const cards = loadCustomCards();
    const filtered = cards.filter(c => c.id !== cardId);
    return saveCustomCards(filtered);
}

// ===== Settings =====

/**
 * Load user settings
 */
function loadSettings() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return data ? JSON.parse(data) : getDefaultSettings();
    } catch (error) {
        return getDefaultSettings();
    }
}

/**
 * Save user settings
 */
function saveSettings(settings) {
    try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Get default settings
 */
function getDefaultSettings() {
    return {
        defaultMode: 'timed',  // 'timed' or 'ordered'
        autoMerge: true,
        schoolDayStart: TIME_CONFIG.SCHOOL_START,
        schoolDayEnd: TIME_CONFIG.SCHOOL_END,
        defaultDuration: TIME_CONFIG.DEFAULT_DURATION
    };
}

// ===== Export/Import =====

/**
 * Export all data as JSON
 */
function exportAllData() {
    return {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        schedules: loadAllSchedules(),
        customCards: loadCustomCards(),
        settings: loadSettings()
    };
}

/**
 * Import data from JSON
 */
function importData(data) {
    try {
        if (data.schedules) {
            saveAllSchedules(data.schedules);
        }
        if (data.customCards) {
            saveCustomCards(data.customCards);
        }
        if (data.settings) {
            saveSettings(data.settings);
        }
        return true;
    } catch (error) {
        console.error('Error importing data:', error);
        return false;
    }
}

// ===== Export Module =====
window.ScheduleData = {
    // Config
    loadVisualsConfig,
    getVisualCard,
    getCardsByCategory,
    getCustomIcons,

    // Blocks
    createBlock,
    calculateEndTime,
    calculateDuration,
    snapToIncrement,
    formatTime,
    parseTimeString,
    timeTo24hString,

    // Schedule operations
    canMergeBlocks,
    mergeBlocks,
    autoMergeSchedule,
    normalizeScheduleTimes,
    findTimeOverlaps,
    getCurrentBlock,

    // Storage
    getDateKey,
    loadScheduleForDate,
    saveScheduleForDate,
    deleteScheduleForDate,
    copySchedule,

    // Custom cards
    loadCustomCards,
    saveCustomCards,
    addCustomCard,
    deleteCustomCard,

    // Settings
    loadSettings,
    saveSettings,

    // Export/Import
    exportAllData,
    importData,

    // Constants
    TIME_CONFIG
};
