/**
 * Schedule Builder UI - Learning Circle Classroom
 * Handles drag-drop, editing, and schedule management
 */

// ===== State =====
let currentDate = new Date();
let scheduleBlocks = [];
let draggedItem = null;
let draggedFromLibrary = false;
let isResizing = false;
let resizeBlock = null;
let resizeStartY = 0;
let resizeStartDuration = 0;

// ===== DOM Elements =====
let scheduleListEl = null;
let dropZoneEl = null;
let blockCountEl = null;
let dateInputEl = null;
let dateLabelEl = null;

// ===== Initialization =====
async function initScheduleBuilder() {
    // Load visuals config
    await ScheduleData.loadVisualsConfig();

    // Cache DOM elements
    scheduleListEl = document.getElementById('schedule-blocks');
    dropZoneEl = document.getElementById('drop-zone');
    blockCountEl = document.getElementById('block-count');
    dateInputEl = document.getElementById('date-picker');
    dateLabelEl = document.getElementById('date-label');

    // Set up date picker
    initDatePicker();

    // Load schedule for today
    loadScheduleForCurrentDate();

    // Render visual library
    renderVisualLibrary();

    // Set up event listeners
    setupDragAndDrop();
    setupToolbarActions();
    setupModalHandlers();

    // Start current block highlight timer
    startCurrentBlockTimer();

    // Prevent default drag behavior on the page for smoother UX
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => e.preventDefault());
}

// ===== Date Picker =====
function initDatePicker() {
    // Set initial date
    dateInputEl.value = ScheduleData.getDateKey(currentDate);
    updateDateLabel();

    // Date input change
    dateInputEl.addEventListener('change', (e) => {
        currentDate = new Date(e.target.value + 'T12:00:00');
        updateDateLabel();
        loadScheduleForCurrentDate();
    });

    // Navigation buttons
    document.getElementById('prev-day')?.addEventListener('click', () => navigateDate(-1));
    document.getElementById('next-day')?.addEventListener('click', () => navigateDate(1));
    document.getElementById('today-btn')?.addEventListener('click', () => {
        currentDate = new Date();
        dateInputEl.value = ScheduleData.getDateKey(currentDate);
        updateDateLabel();
        loadScheduleForCurrentDate();
    });
}

function navigateDate(delta) {
    currentDate.setDate(currentDate.getDate() + delta);
    dateInputEl.value = ScheduleData.getDateKey(currentDate);
    updateDateLabel();
    loadScheduleForCurrentDate();
}

function updateDateLabel() {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    dateLabelEl.textContent = currentDate.toLocaleDateString('en-US', options);
}

// ===== Visual Library =====
function renderVisualLibrary() {
    const libraryContent = document.getElementById('library-content');
    if (!libraryContent) return;

    const cardsByCategory = ScheduleData.getCardsByCategory();
    let html = '';

    // Render each category
    Object.values(cardsByCategory)
        .sort((a, b) => a.order - b.order)
        .forEach(category => {
            if (category.cards.length === 0) return;

            html += `
                <div class="card-category">
                    <div class="category-label">${category.label}</div>
                    <div class="card-grid">
                        ${category.cards.map(card => renderLibraryCard(card)).join('')}
                    </div>
                </div>
            `;
        });

    // Add custom cards section
    const customCards = ScheduleData.loadCustomCards();
    if (customCards.length > 0) {
        html += `
            <div class="card-category">
                <div class="category-label">My Custom Cards</div>
                <div class="card-grid">
                    ${customCards.map(card => renderCustomLibraryCard(card)).join('')}
                </div>
            </div>
        `;
    }

    // Add custom card button
    html += `
        <div class="card-category">
            <button class="add-custom-btn" id="add-custom-btn">
                <span class="material-symbols-outlined">add_circle</span>
                <span>Create Custom Card</span>
            </button>
        </div>
    `;

    libraryContent.innerHTML = html;

    // Set up library card drag events
    setupLibraryDragEvents();

    // Custom card button
    document.getElementById('add-custom-btn')?.addEventListener('click', openCustomCardModal);
}

function renderLibraryCard(card) {
    return `
        <div class="visual-card"
             data-card-id="${card.id}"
             draggable="true"
             style="--card-color: ${card.color}">
            <div class="visual-card-icon" style="background-color: ${card.color}20; color: ${card.color}">
                <img src="${card.image}" alt="${card.label}" style="color: ${card.color}">
            </div>
            <div class="visual-card-label">${card.label}</div>
        </div>
    `;
}

function renderCustomLibraryCard(card) {
    const icon = ScheduleData.getCustomIcons().find(i => i.id === card.iconId);
    return `
        <div class="visual-card"
             data-custom-card-id="${card.id}"
             draggable="true"
             style="--card-color: ${card.color}">
            <div class="visual-card-icon" style="background-color: ${card.color}20; color: ${card.color}">
                ${icon ? `<img src="${icon.image}" alt="${card.label}" style="color: ${card.color}">` : ''}
            </div>
            <div class="visual-card-label">${card.label}</div>
        </div>
    `;
}

// ===== Schedule Rendering =====
function renderSchedule() {
    if (!scheduleListEl) return;

    if (scheduleBlocks.length === 0) {
        scheduleListEl.innerHTML = `
            <div class="drop-zone active-drop-zone" id="drop-zone">
                <div class="empty-schedule">
                    <span class="material-symbols-outlined">calendar_add_on</span>
                    <h4>No blocks yet</h4>
                    <p>Drag cards from the library to build today's schedule</p>
                </div>
            </div>
        `;
        setupDropZone();
    } else {
        // Render blocks PLUS a drop zone at the bottom for easy adding
        let html = scheduleBlocks.map((block, index) => renderScheduleBlock(block, index)).join('');
        html += `
            <div class="drop-zone bottom-drop-zone" id="bottom-drop-zone">
                <span class="material-symbols-outlined">add_circle</span>
                <span>Drop here to add block</span>
            </div>
        `;
        scheduleListEl.innerHTML = html;
        setupBlockEvents();
        setupBottomDropZone();
    }

    // Update block count
    if (blockCountEl) {
        blockCountEl.textContent = `${scheduleBlocks.length} block${scheduleBlocks.length !== 1 ? 's' : ''}`;
    }

    // Check for overlaps
    checkAndDisplayOverlaps();
}

function renderScheduleBlock(block, index) {
    const card = ScheduleData.getVisualCard(block.cardId);
    const customCard = block.customCard;
    const color = customCard?.color || card?.color || '#6a8171';
    const icon = customCard ? ScheduleData.getCustomIcons().find(i => i.id === customCard.iconId) : null;
    const imageSrc = icon?.image || card?.image || '';
    const isBreak = card?.isBreak || false;
    const isCurrent = isCurrentBlock(block);

    // Format time for display
    const startTimeStr = block.startTime ? ScheduleData.formatTime(block.startTime) : '--:--';
    const endTimeStr = block.endTime ? ScheduleData.formatTime(block.endTime) : '--:--';

    return `
        <div class="schedule-block ${isBreak ? 'is-break' : ''} ${isCurrent ? 'is-current' : ''}"
             data-block-id="${block.id}"
             data-index="${index}"
             style="--block-color: ${color}"
             draggable="true">

            <div class="block-drag-handle">
                <span class="material-symbols-outlined">drag_indicator</span>
            </div>

            <div class="block-icon" style="background-color: ${color}20; color: ${color}">
                ${imageSrc ? `<img src="${imageSrc}" alt="${block.label}" style="color: ${color}">` : ''}
            </div>

            <div class="block-content">
                <input type="text"
                       class="block-label-input"
                       value="${escapeHtml(block.label)}"
                       data-field="label"
                       placeholder="Enter activity name..."
                       aria-label="Block label (click to edit)">

                <div class="block-time-row">
                    <input type="time"
                           class="block-time-input"
                           value="${ScheduleData.timeTo24hString(block.startTime)}"
                           data-field="startTime"
                           aria-label="Start time">
                    <span class="time-separator">to</span>
                    <input type="time"
                           class="block-time-input"
                           value="${ScheduleData.timeTo24hString(block.endTime)}"
                           data-field="endTime"
                           aria-label="End time">
                    <div class="block-duration">
                        <span>${block.duration} min</span>
                    </div>
                </div>

                <textarea class="block-notes-input"
                          placeholder="Add notes for students..."
                          data-field="notes"
                          rows="1"
                          aria-label="Notes">${escapeHtml(block.notes || '')}</textarea>
            </div>

            <div class="block-actions">
                <button class="block-action-btn duplicate" title="Duplicate block">
                    <span class="material-symbols-outlined">content_copy</span>
                </button>
                <button class="block-action-btn delete" title="Remove block">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        </div>
    `;
}

function isCurrentBlock(block) {
    if (!block.startTime || !block.endTime) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = block.startTime.hours * 60 + block.startTime.minutes;
    const endMinutes = block.endTime.hours * 60 + block.endTime.minutes;

    // Also check if it's today
    const today = ScheduleData.getDateKey(new Date());
    const scheduleDate = ScheduleData.getDateKey(currentDate);

    return today === scheduleDate && currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

function checkAndDisplayOverlaps() {
    const overlaps = ScheduleData.findTimeOverlaps(scheduleBlocks);

    // Remove existing warnings
    document.querySelectorAll('.overlap-warning').forEach(el => el.remove());

    // Add warnings for overlapping blocks
    overlaps.forEach(({ block1, block2 }) => {
        const blockEl = document.querySelector(`[data-block-id="${block2}"]`);
        if (blockEl) {
            const warning = document.createElement('div');
            warning.className = 'overlap-warning';
            warning.innerHTML = `
                <span class="material-symbols-outlined">warning</span>
                <span>This block overlaps with another</span>
            `;
            blockEl.querySelector('.block-content').appendChild(warning);
        }
    });
}

// ===== Drag and Drop =====
function setupLibraryDragEvents() {
    document.querySelectorAll('.visual-card[draggable="true"]').forEach(card => {
        // Remove existing listeners first to prevent duplicates
        card.removeEventListener('dragstart', handleLibraryDragStart);
        card.removeEventListener('dragend', handleDragEnd);

        card.addEventListener('dragstart', handleLibraryDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });
}

function setupBlockEvents() {
    document.querySelectorAll('.schedule-block').forEach(block => {
        // Drag events
        block.addEventListener('dragstart', handleBlockDragStart);
        block.addEventListener('dragend', handleDragEnd);

        // Input events
        block.querySelectorAll('.block-label-input, .block-time-input, .block-notes-input').forEach(input => {
            input.addEventListener('change', handleBlockInputChange);
            input.addEventListener('blur', handleBlockInputChange);
        });

        // Action buttons
        block.querySelector('.block-action-btn.duplicate')?.addEventListener('click', handleDuplicateBlock);
        block.querySelector('.block-action-btn.delete')?.addEventListener('click', handleDeleteBlock);
    });
}

function setupBottomDropZone() {
    const bottomZone = document.getElementById('bottom-drop-zone');
    if (!bottomZone) return;

    bottomZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedItem) {
            bottomZone.classList.add('drag-over');
        }
    });

    bottomZone.addEventListener('dragleave', (e) => {
        bottomZone.classList.remove('drag-over');
    });

    bottomZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        bottomZone.classList.remove('drag-over');

        if (!draggedItem) return;

        if (draggedFromLibrary) {
            addBlockFromLibrary(draggedItem, scheduleBlocks.length);
        } else if (draggedItem.blockId) {
            reorderBlock(draggedItem.blockId, scheduleBlocks.length);
        }
    });
}

function setupDropZone() {
    const zone = document.getElementById('drop-zone');
    if (!zone) return;

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', handleDropZoneDrop);
}

function setupDragAndDrop() {
    // Make the entire schedule list container a drop target
    if (scheduleListEl) {
        // Remove existing listeners
        scheduleListEl.removeEventListener('dragover', handleScheduleListDragOver);
        scheduleListEl.removeEventListener('drop', handleScheduleListDrop);
        scheduleListEl.removeEventListener('dragleave', handleScheduleListDragLeave);

        // Add listeners
        scheduleListEl.addEventListener('dragover', handleScheduleListDragOver);
        scheduleListEl.addEventListener('drop', handleScheduleListDrop);
        scheduleListEl.addEventListener('dragleave', handleScheduleListDragLeave);
    }
}

// Handle dragover on the entire schedule list
function handleScheduleListDragOver(e) {
    e.preventDefault();

    if (!draggedItem) return;

    // Find which block we're hovering over
    const blockEl = e.target.closest('.schedule-block');
    const bottomZone = e.target.closest('.bottom-drop-zone');
    const dropZone = e.target.closest('.drop-zone:not(.bottom-drop-zone)');

    // Clear all previous indicators
    document.querySelectorAll('.schedule-block').forEach(b => {
        b.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    if (blockEl) {
        // Skip if dropping on self
        if (!draggedFromLibrary && blockEl.dataset.blockId === draggedItem.blockId) return;

        const rect = blockEl.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const threshold = rect.height * 0.5;

        if (offsetY < threshold) {
            blockEl.classList.add('drag-over-top');
        } else {
            blockEl.classList.add('drag-over-bottom');
        }
    } else if (bottomZone) {
        bottomZone.classList.add('drag-over');
    } else if (dropZone) {
        dropZone.classList.add('drag-over');
    }
}

// Handle drop on the schedule list
function handleScheduleListDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem) return;

    // Clear all visual states
    document.querySelectorAll('.drag-over, .drag-over-top, .drag-over-bottom').forEach(el => {
        el.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
    });

    // Check where we dropped
    const blockEl = e.target.closest('.schedule-block');
    const bottomZone = e.target.closest('.bottom-drop-zone');
    const dropZone = e.target.closest('.drop-zone:not(.bottom-drop-zone)');

    let insertIndex = scheduleBlocks.length; // Default to end

    if (blockEl) {
        // Skip if dropping on self
        if (!draggedFromLibrary && blockEl.dataset.blockId === draggedItem.blockId) return;

        const targetIndex = parseInt(blockEl.dataset.index, 10);
        const rect = blockEl.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const threshold = rect.height * 0.5;

        insertIndex = offsetY < threshold ? targetIndex : targetIndex + 1;
    } else if (bottomZone || dropZone) {
        // Dropped on a drop zone - add to end
        insertIndex = scheduleBlocks.length;
    } else {
        // Dropped somewhere else in the list - add to end
        insertIndex = scheduleBlocks.length;
    }

    // Perform the action
    if (draggedFromLibrary) {
        addBlockFromLibrary(draggedItem, insertIndex);
    } else if (draggedItem.blockId) {
        reorderBlock(draggedItem.blockId, insertIndex);
    }
}

function handleScheduleListDragLeave(e) {
    // Only clear if actually leaving the schedule list
    if (!scheduleListEl.contains(e.relatedTarget)) {
        document.querySelectorAll('.drag-over, .drag-over-top, .drag-over-bottom').forEach(el => {
            el.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
        });
    }
}

function handleLibraryDragStart(e) {
    e.stopPropagation();
    draggedFromLibrary = true;

    const card = e.target.closest('.visual-card');
    if (!card) return;

    draggedItem = {
        cardId: card.dataset.cardId || null,
        customCardId: card.dataset.customCardId || null
    };

    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', JSON.stringify(draggedItem));

    // Set drag image
    if (e.dataTransfer.setDragImage) {
        e.dataTransfer.setDragImage(card, card.offsetWidth / 2, card.offsetHeight / 2);
    }
}

function handleBlockDragStart(e) {
    // Don't start drag if clicking on inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') {
        e.preventDefault();
        return;
    }

    e.stopPropagation();
    draggedFromLibrary = false;

    const blockEl = e.target.closest('.schedule-block');
    if (!blockEl) return;

    const blockId = blockEl.dataset.blockId;
    draggedItem = { blockId };
    blockEl.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(draggedItem));
}

function handleDragEnd(e) {
    // Clear all dragging states
    document.querySelectorAll('.dragging').forEach(el => {
        el.classList.remove('dragging');
    });
    document.querySelectorAll('.drag-over, .drag-over-top, .drag-over-bottom').forEach(el => {
        el.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
    });
    draggedItem = null;
    draggedFromLibrary = false;
}

function handleDropZoneDrop(e) {
    e.preventDefault();
    if (!draggedItem || !draggedFromLibrary) return;

    addBlockFromLibrary(draggedItem, scheduleBlocks.length);
    document.getElementById('drop-zone')?.classList.remove('drag-over');
}

// ===== Block Operations =====
function addBlockFromLibrary(item, insertIndex) {
    let newBlock;

    if (item.cardId) {
        // Standard card
        newBlock = ScheduleData.createBlock(item.cardId);
    } else if (item.customCardId) {
        // Custom card
        const customCards = ScheduleData.loadCustomCards();
        const customCard = customCards.find(c => c.id === item.customCardId);
        if (customCard) {
            newBlock = ScheduleData.createBlock('custom', {
                label: customCard.label,
                customCard: customCard
            });
        }
    }

    if (!newBlock) return;

    // ALWAYS calculate times based on position for seamless experience
    if (scheduleBlocks.length === 0) {
        // First block starts at school start (9:00 AM)
        newBlock.startTime = { ...ScheduleData.TIME_CONFIG.SCHOOL_START };
        newBlock.endTime = ScheduleData.calculateEndTime(newBlock.startTime, newBlock.duration);
    } else if (insertIndex === 0) {
        // Inserting at the beginning - start at school start
        newBlock.startTime = { ...ScheduleData.TIME_CONFIG.SCHOOL_START };
        newBlock.endTime = ScheduleData.calculateEndTime(newBlock.startTime, newBlock.duration);
    } else {
        // Get the block before the insert position
        const prevBlock = scheduleBlocks[insertIndex - 1];
        if (prevBlock && prevBlock.endTime) {
            // Start where the previous block ends
            newBlock.startTime = { ...prevBlock.endTime };
            newBlock.endTime = ScheduleData.calculateEndTime(newBlock.startTime, newBlock.duration);
        } else if (prevBlock && prevBlock.startTime) {
            // If no end time, calculate from start + duration
            newBlock.startTime = ScheduleData.calculateEndTime(prevBlock.startTime, prevBlock.duration);
            newBlock.endTime = ScheduleData.calculateEndTime(newBlock.startTime, newBlock.duration);
        } else {
            // Fallback: calculate from school start + all previous durations
            let totalMinutes = ScheduleData.TIME_CONFIG.SCHOOL_START.hours * 60 + ScheduleData.TIME_CONFIG.SCHOOL_START.minutes;
            for (let i = 0; i < insertIndex; i++) {
                totalMinutes += scheduleBlocks[i].duration || 30;
            }
            newBlock.startTime = {
                hours: Math.floor(totalMinutes / 60),
                minutes: totalMinutes % 60
            };
            newBlock.endTime = ScheduleData.calculateEndTime(newBlock.startTime, newBlock.duration);
        }
    }

    // Insert block at the specified position
    scheduleBlocks.splice(insertIndex, 0, newBlock);

    // Auto-adjust times for blocks AFTER the inserted one (optional - keep times sequential)
    // We only auto-merge if same subject, otherwise keep times as is
    const settings = ScheduleData.loadSettings();
    if (settings.autoMerge) {
        scheduleBlocks = ScheduleData.autoMergeSchedule(scheduleBlocks);
    }

    saveAndRender();
    showToast(`Added ${newBlock.label}`);
}

function reorderBlock(blockId, newIndex) {
    const currentIndex = scheduleBlocks.findIndex(b => b.id === blockId);
    if (currentIndex === -1) return;

    // Adjust index if moving down
    if (newIndex > currentIndex) newIndex--;

    const [block] = scheduleBlocks.splice(currentIndex, 1);
    scheduleBlocks.splice(newIndex, 0, block);

    // Check for auto-merge after reorder
    const settings = ScheduleData.loadSettings();
    if (settings.autoMerge) {
        scheduleBlocks = ScheduleData.autoMergeSchedule(scheduleBlocks);
    }

    saveAndRender();
}

function handleBlockInputChange(e) {
    const blockEl = e.target.closest('.schedule-block');
    const blockId = blockEl.dataset.blockId;
    const field = e.target.dataset.field;
    const value = e.target.value;

    const block = scheduleBlocks.find(b => b.id === blockId);
    if (!block) return;

    if (field === 'label') {
        block.label = value;
    } else if (field === 'notes') {
        block.notes = value;
    } else if (field === 'startTime') {
        block.startTime = ScheduleData.parseTimeString(value);
        if (block.startTime && block.duration) {
            block.endTime = ScheduleData.calculateEndTime(block.startTime, block.duration);
        }
    } else if (field === 'endTime') {
        block.endTime = ScheduleData.parseTimeString(value);
        if (block.startTime && block.endTime) {
            block.duration = ScheduleData.calculateDuration(block.startTime, block.endTime);
        }
    }

    saveAndRender();
}

function handleDurationAdjust(e) {
    const blockEl = e.target.closest('.schedule-block');
    const blockId = blockEl.dataset.blockId;
    const adjust = parseInt(e.target.dataset.adjust, 10);

    const block = scheduleBlocks.find(b => b.id === blockId);
    if (!block) return;

    const newDuration = Math.max(15, block.duration + adjust);
    block.duration = newDuration;

    if (block.startTime) {
        block.endTime = ScheduleData.calculateEndTime(block.startTime, newDuration);
    }

    saveAndRender();
}

function handleDuplicateBlock(e) {
    e.stopPropagation();
    const blockEl = e.target.closest('.schedule-block');
    const blockId = blockEl.dataset.blockId;
    const index = parseInt(blockEl.dataset.index, 10);

    const block = scheduleBlocks.find(b => b.id === blockId);
    if (!block) return;

    const duplicate = {
        ...block,
        id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now()
    };

    // Set times to continue from the original block
    if (block.endTime) {
        duplicate.startTime = { ...block.endTime };
        duplicate.endTime = ScheduleData.calculateEndTime(duplicate.startTime, duplicate.duration);
    }

    scheduleBlocks.splice(index + 1, 0, duplicate);
    saveAndRender();
    showToast('Block duplicated');
}

function handleDeleteBlock(e) {
    e.stopPropagation();
    const blockEl = e.target.closest('.schedule-block');
    const blockId = blockEl.dataset.blockId;

    scheduleBlocks = scheduleBlocks.filter(b => b.id !== blockId);
    saveAndRender();
    showToast('Block removed');
}

// ===== Resize Handling =====
function handleResizeStart(e) {
    e.preventDefault();
    const blockEl = e.target.closest('.schedule-block');
    const blockId = blockEl.dataset.blockId;

    resizeBlock = scheduleBlocks.find(b => b.id === blockId);
    if (!resizeBlock) return;

    isResizing = true;
    resizeStartY = e.clientY;
    resizeStartDuration = resizeBlock.duration;

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    e.target.classList.add('resizing');
}

function handleResizeMove(e) {
    if (!isResizing || !resizeBlock) return;

    const deltaY = e.clientY - resizeStartY;
    const deltaMinutes = Math.round(deltaY / 4) * 15; // 4px = 15 min
    const newDuration = Math.max(15, resizeStartDuration + deltaMinutes);

    resizeBlock.duration = newDuration;
    if (resizeBlock.startTime) {
        resizeBlock.endTime = ScheduleData.calculateEndTime(resizeBlock.startTime, newDuration);
    }

    // Update display without full re-render
    const blockEl = document.querySelector(`[data-block-id="${resizeBlock.id}"]`);
    if (blockEl) {
        const durationDisplay = blockEl.querySelector('.block-duration span:last-child');
        if (durationDisplay) {
            durationDisplay.textContent = `${newDuration} min`;
        }

        const endTimeInput = blockEl.querySelector('[data-field="endTime"]');
        if (endTimeInput && resizeBlock.endTime) {
            endTimeInput.value = ScheduleData.timeTo24hString(resizeBlock.endTime);
        }
    }
}

function handleResizeEnd(e) {
    if (!isResizing) return;

    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.querySelector('.block-resize-handle.resizing')?.classList.remove('resizing');

    isResizing = false;
    resizeBlock = null;

    saveAndRender();
}

// ===== Toolbar Actions =====
function setupToolbarActions() {
    document.getElementById('clear-schedule')?.addEventListener('click', () => {
        if (scheduleBlocks.length === 0) return;
        if (confirm('Clear all blocks for today?')) {
            scheduleBlocks = [];
            saveAndRender();
            showToast('Schedule cleared');
        }
    });

    document.getElementById('normalize-times')?.addEventListener('click', () => {
        if (scheduleBlocks.length === 0) return;
        scheduleBlocks = ScheduleData.normalizeScheduleTimes(scheduleBlocks);
        saveAndRender();
        showToast('Times normalized');
    });

    document.getElementById('copy-template')?.addEventListener('click', openTemplateModal);

    document.getElementById('display-mode')?.addEventListener('click', () => {
        window.location.href = `display.html?date=${ScheduleData.getDateKey(currentDate)}`;
    });
}

// ===== Modal Handlers =====
function setupModalHandlers() {
    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeAllModals();
            }
        });
    });

    // Close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    // Custom card form
    document.getElementById('custom-card-form')?.addEventListener('submit', handleCustomCardSubmit);
}

function openCustomCardModal() {
    const modal = document.getElementById('custom-card-modal');
    if (!modal) return;

    // Populate icon picker
    const iconPicker = modal.querySelector('.icon-picker');
    if (iconPicker) {
        const icons = ScheduleData.getCustomIcons();
        iconPicker.innerHTML = icons.map(icon => `
            <button type="button" class="icon-option" data-icon-id="${icon.id}">
                <img src="${icon.image}" alt="${icon.label}">
            </button>
        `).join('');

        iconPicker.querySelectorAll('.icon-option').forEach(btn => {
            btn.addEventListener('click', () => {
                iconPicker.querySelectorAll('.icon-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    }

    // Populate color picker
    const colorPicker = modal.querySelector('.color-picker');
    if (colorPicker) {
        const colors = ['#267340', '#87B9C9', '#9A7D6F', '#c88d32', '#6a8171', '#5691a3', '#b39789', '#daa54d'];
        colorPicker.innerHTML = colors.map((color, i) => `
            <button type="button"
                    class="color-option ${i === 0 ? 'selected' : ''}"
                    data-color="${color}"
                    style="background-color: ${color}">
            </button>
        `).join('');

        colorPicker.querySelectorAll('.color-option').forEach(btn => {
            btn.addEventListener('click', () => {
                colorPicker.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    }

    modal.classList.add('open');
    modal.querySelector('input')?.focus();
}

function handleCustomCardSubmit(e) {
    e.preventDefault();
    const form = e.target;

    const label = form.querySelector('[name="label"]')?.value?.trim();
    const selectedIcon = form.querySelector('.icon-option.selected');
    const selectedColor = form.querySelector('.color-option.selected');

    if (!label) {
        showToast('Please enter a label', 'error');
        return;
    }

    const iconId = selectedIcon?.dataset.iconId || 'custom-star';
    const color = selectedColor?.dataset.color || '#6a8171';

    ScheduleData.addCustomCard(label, iconId, color);
    closeAllModals();
    renderVisualLibrary();
    showToast(`Created "${label}" card`);

    form.reset();
}

function openTemplateModal() {
    const modal = document.getElementById('template-modal');
    if (!modal) return;

    // Get recent dates with schedules
    const schedules = JSON.parse(localStorage.getItem('classroom_schedules') || '{}');
    const dates = Object.keys(schedules).filter(d => schedules[d].length > 0).sort().reverse().slice(0, 5);

    const templateList = modal.querySelector('.template-list');
    if (templateList) {
        if (dates.length === 0) {
            templateList.innerHTML = '<p class="text-muted">No previous schedules found</p>';
        } else {
            templateList.innerHTML = dates.map(dateStr => {
                const date = new Date(dateStr + 'T12:00:00');
                const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                const fullDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const blockCount = schedules[dateStr].length;

                return `
                    <button type="button" class="template-option" data-date="${dateStr}">
                        <span class="material-symbols-outlined">content_copy</span>
                        <div class="template-info">
                            <h4>${dayName}, ${fullDate}</h4>
                            <p>${blockCount} block${blockCount !== 1 ? 's' : ''}</p>
                        </div>
                    </button>
                `;
            }).join('');

            templateList.querySelectorAll('.template-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    const fromDate = btn.dataset.date;
                    ScheduleData.copySchedule(fromDate, currentDate);
                    loadScheduleForCurrentDate();
                    closeAllModals();
                    showToast('Schedule copied');
                });
            });
        }
    }

    modal.classList.add('open');
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('open');
    });
}

// ===== Data Persistence =====
function loadScheduleForCurrentDate() {
    scheduleBlocks = ScheduleData.loadScheduleForDate(currentDate);
    renderSchedule();
}

function saveAndRender() {
    ScheduleData.saveScheduleForDate(currentDate, scheduleBlocks);
    renderSchedule();
}

// ===== Current Block Timer =====
function startCurrentBlockTimer() {
    // Update every minute
    setInterval(() => {
        const currentBlock = document.querySelector('.schedule-block.is-current');
        const actualCurrent = scheduleBlocks.find(b => isCurrentBlock(b));

        if (currentBlock?.dataset.blockId !== actualCurrent?.id) {
            renderSchedule();
        }
    }, 60000);
}

// ===== Utility Functions =====
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    if (window.ClassroomApp?.Toast) {
        window.ClassroomApp.Toast[type](message);
    }
}

// ===== Initialize on DOM Ready =====
document.addEventListener('DOMContentLoaded', initScheduleBuilder);

// ===== Export =====
window.ScheduleBuilder = {
    refresh: renderSchedule,
    clearSchedule: () => {
        scheduleBlocks = [];
        saveAndRender();
    }
};
