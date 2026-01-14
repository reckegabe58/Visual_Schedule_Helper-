/**
 * Schedule Display Mode - Learning Circle Classroom
 * Student-facing view with auto-highlighting and large visuals
 */

// ===== State =====
let displayDate = null;
let displayBlocks = [];
let clockInterval = null;
let highlightInterval = null;

// ===== Initialization =====
async function initDisplayMode() {
    // Load visuals config
    await ScheduleData.loadVisualsConfig();

    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');

    // Set display date
    displayDate = dateParam ? new Date(dateParam + 'T12:00:00') : new Date();

    // Load schedule
    displayBlocks = ScheduleData.loadScheduleForDate(displayDate);

    // Render UI
    renderDisplayHeader();
    renderDisplaySchedule();

    // Start clock and highlight updates
    startClock();
    startHighlightTimer();

    // Setup event handlers
    setupDisplayHandlers();
}

// ===== Header Rendering =====
function renderDisplayHeader() {
    const dateLabel = document.getElementById('display-date-label');
    const clockEl = document.getElementById('display-clock-time');

    if (dateLabel) {
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        dateLabel.textContent = displayDate.toLocaleDateString('en-US', options);
    }

    updateClock();
}

function updateClock() {
    const clockEl = document.getElementById('display-clock-time');
    if (!clockEl) return;

    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = now.getHours() < 12 ? 'AM' : 'PM';

    clockEl.textContent = `${hours}:${minutes} ${ampm}`;
}

function startClock() {
    updateClock();
    clockInterval = setInterval(updateClock, 1000);
}

// ===== Schedule Rendering =====
function renderDisplaySchedule() {
    const container = document.getElementById('display-schedule');
    if (!container) return;

    if (displayBlocks.length === 0) {
        container.innerHTML = `
            <div class="display-empty">
                <span class="material-symbols-outlined">event_busy</span>
                <h2>No Schedule Set</h2>
                <p>The schedule for today hasn't been created yet. Check back soon!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = displayBlocks.map((block, index) => renderDisplayBlock(block, index)).join('');
    updateBlockStates();
}

function renderDisplayBlock(block, index) {
    const card = ScheduleData.getVisualCard(block.cardId);
    const customCard = block.customCard;
    const color = customCard?.color || card?.color || '#6a8171';
    const icon = customCard ? ScheduleData.getCustomIcons().find(i => i.id === customCard.iconId) : null;
    const imageSrc = icon?.image || card?.image || '';
    const isBreak = card?.isBreak || false;

    // Format time display - this is now the primary identifier (not index number)
    const startTimeStr = block.startTime ? ScheduleData.formatTime(block.startTime) : '';
    const endTimeStr = block.endTime ? ScheduleData.formatTime(block.endTime) : '';
    const timeRangeDisplay = startTimeStr && endTimeStr ? `${startTimeStr} - ${endTimeStr}` : '';

    // Calculate size class based on duration
    const duration = block.duration || 30;
    let sizeClass = 'duration-short';  // < 30 min
    if (duration >= 60) sizeClass = 'duration-long';
    else if (duration >= 45) sizeClass = 'duration-medium';

    return `
        <div class="display-block ${isBreak ? 'is-break' : ''} ${sizeClass}"
             data-block-id="${block.id}"
             data-index="${index}"
             data-duration="${duration}"
             style="--block-color: ${color}; --block-duration: ${duration}">

            <div class="display-block-time-badge">
                ${timeRangeDisplay || `Block ${index + 1}`}
            </div>

            <div class="display-block-icon" style="background-color: ${color}20; color: ${color}">
                ${imageSrc ? `<img src="${imageSrc}" alt="${block.label}" style="color: ${color}">` : ''}
            </div>

            <div class="display-block-content">
                <div class="display-block-label">${escapeHtml(block.label)}</div>
                ${block.notes ? `<div class="display-block-notes">${escapeHtml(block.notes)}</div>` : ''}
                <div class="display-block-duration">
                    <span class="material-symbols-outlined">schedule</span>
                    <span>${block.duration} min</span>
                </div>
            </div>

            <div class="current-indicator">
                <span class="material-symbols-outlined">play_circle</span>
                Now
            </div>

            <div class="display-block-progress" style="width: 0%"></div>
        </div>
    `;
}

// ===== Block State Management =====
function updateBlockStates() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Check if viewing today
    const today = ScheduleData.getDateKey(new Date());
    const scheduleDate = ScheduleData.getDateKey(displayDate);
    const isToday = today === scheduleDate;

    displayBlocks.forEach((block, index) => {
        const blockEl = document.querySelector(`[data-block-id="${block.id}"]`);
        if (!blockEl) return;

        // Remove all state classes
        blockEl.classList.remove('is-current', 'is-completed', 'is-upcoming');

        if (!isToday || !block.startTime || !block.endTime) {
            // If not today or no times, just show normally
            blockEl.classList.add('is-upcoming');
            updateProgressBar(blockEl, 0);
            return;
        }

        const startMinutes = block.startTime.hours * 60 + block.startTime.minutes;
        const endMinutes = block.endTime.hours * 60 + block.endTime.minutes;

        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
            // Current block
            blockEl.classList.add('is-current');

            // Calculate progress
            const elapsed = currentMinutes - startMinutes;
            const total = endMinutes - startMinutes;
            const progress = Math.min(100, (elapsed / total) * 100);
            updateProgressBar(blockEl, progress);

            // Scroll into view if needed
            scrollToCurrentBlock(blockEl);

        } else if (currentMinutes >= endMinutes) {
            // Completed block
            blockEl.classList.add('is-completed');
            updateProgressBar(blockEl, 100);

        } else {
            // Upcoming block
            blockEl.classList.add('is-upcoming');
            updateProgressBar(blockEl, 0);
        }
    });
}

function updateProgressBar(blockEl, progress) {
    const progressBar = blockEl.querySelector('.display-block-progress');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
}

function scrollToCurrentBlock(blockEl) {
    // Only scroll if block is not already mostly visible
    const rect = blockEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    if (rect.top < 100 || rect.bottom > viewportHeight - 100) {
        blockEl.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

function startHighlightTimer() {
    // Update every 10 seconds for responsive current block tracking
    highlightInterval = setInterval(updateBlockStates, 10000);
}

// ===== Event Handlers =====
function setupDisplayHandlers() {
    // Back to builder button
    document.getElementById('back-to-builder')?.addEventListener('click', () => {
        window.location.href = `visualschedule.html?date=${ScheduleData.getDateKey(displayDate)}`;
    });

    // Fullscreen toggle
    document.getElementById('toggle-fullscreen')?.addEventListener('click', toggleFullscreen);

    // Print button
    document.getElementById('print-schedule')?.addEventListener('click', () => {
        window.print();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Date navigation
    document.getElementById('display-prev-day')?.addEventListener('click', () => navigateDay(-1));
    document.getElementById('display-next-day')?.addEventListener('click', () => navigateDay(1));
}

function toggleFullscreen() {
    const container = document.querySelector('.display-mode');
    const btn = document.getElementById('toggle-fullscreen');

    if (!document.fullscreenElement) {
        // Enter fullscreen
        if (container.requestFullscreen) {
            container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
        }
        container.classList.add('fullscreen');
        if (btn) {
            btn.querySelector('.material-symbols-outlined').textContent = 'fullscreen_exit';
            btn.querySelector('span:last-child').textContent = 'Exit';
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
        container.classList.remove('fullscreen');
        if (btn) {
            btn.querySelector('.material-symbols-outlined').textContent = 'fullscreen';
            btn.querySelector('span:last-child').textContent = 'Fullscreen';
        }
    }
}

function handleKeyboard(e) {
    switch (e.key) {
        case 'f':
        case 'F':
            if (!e.ctrlKey && !e.metaKey) {
                toggleFullscreen();
            }
            break;
        case 'Escape':
            if (document.fullscreenElement) {
                toggleFullscreen();
            } else {
                window.location.href = `visualschedule.html?date=${ScheduleData.getDateKey(displayDate)}`;
            }
            break;
        case 'ArrowLeft':
            navigateDay(-1);
            break;
        case 'ArrowRight':
            navigateDay(1);
            break;
        case 'p':
        case 'P':
            if (!e.ctrlKey && !e.metaKey) {
                window.print();
            }
            break;
    }
}

function navigateDay(delta) {
    displayDate.setDate(displayDate.getDate() + delta);
    displayBlocks = ScheduleData.loadScheduleForDate(displayDate);
    renderDisplayHeader();
    renderDisplaySchedule();

    // Update URL without reload
    const newUrl = `display.html?date=${ScheduleData.getDateKey(displayDate)}`;
    window.history.pushState({}, '', newUrl);
}

// ===== Utility Functions =====
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===== Cleanup =====
function cleanup() {
    if (clockInterval) clearInterval(clockInterval);
    if (highlightInterval) clearInterval(highlightInterval);
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', initDisplayMode);
window.addEventListener('beforeunload', cleanup);

// Handle fullscreen change events
document.addEventListener('fullscreenchange', () => {
    const container = document.querySelector('.display-mode');
    const btn = document.getElementById('toggle-fullscreen');

    if (!document.fullscreenElement) {
        container?.classList.remove('fullscreen');
        if (btn) {
            btn.querySelector('.material-symbols-outlined').textContent = 'fullscreen';
            const spanText = btn.querySelector('span:last-child');
            if (spanText) spanText.textContent = 'Fullscreen';
        }
    }
});
