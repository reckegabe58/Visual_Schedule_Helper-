/**
 * Wheel of Names - Random Student Picker
 * Teacher Tools
 */

// ===== Configuration =====
const WHEEL_COLORS = [
    '#267340', '#5691a3', '#c88d32', '#9A7D6F',
    '#e85d75', '#6366f1', '#14b8a6', '#f59e0b',
    '#8b5cf6', '#06b6d4', '#84cc16', '#f43f5e'
];

const STORAGE_KEY = 'wheel_of_names_data';
const SETTINGS_KEY = 'wheel_of_names_settings';

// ===== State =====
let students = [];
let selectedStudents = [];
let isSpinning = false;
let currentRotation = 0;
let settings = {
    spinDuration: 5,
    soundEnabled: true,
    removeWinner: false
};

// ===== DOM Elements =====
let wheelCanvas = null;
let wheelEl = null;
let studentListEl = null;
let studentCountEl = null;
let winnerDisplayEl = null;
let winnerNameEl = null;

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', initWheel);

function initWheel() {
    // Cache DOM elements
    wheelCanvas = document.getElementById('wheel-canvas');
    wheelEl = document.getElementById('wheel');
    studentListEl = document.getElementById('student-list');
    studentCountEl = document.getElementById('student-count');
    winnerDisplayEl = document.getElementById('winner-display');
    winnerNameEl = document.getElementById('winner-name');

    // Load saved data
    loadData();
    loadSettings();

    // Render initial state
    renderStudentList();
    updateSelectedStudents();
    drawWheel();

    // Set up event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Wheel click
    wheelEl?.addEventListener('click', spinWheel);

    // Student list buttons
    document.getElementById('select-all-btn')?.addEventListener('click', selectAllStudents);
    document.getElementById('deselect-all-btn')?.addEventListener('click', deselectAllStudents);

    // Add student
    document.getElementById('add-student-btn')?.addEventListener('click', addNewStudent);
    document.getElementById('new-student-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addNewStudent();
    });

    // Reset button
    document.getElementById('reset-wheel-btn')?.addEventListener('click', resetWheel);

    // Settings modal
    document.getElementById('settings-btn')?.addEventListener('click', openSettingsModal);
    document.getElementById('close-settings')?.addEventListener('click', closeSettingsModal);
    document.getElementById('save-settings-btn')?.addEventListener('click', saveSettings);

    // Settings actions
    document.getElementById('import-students-btn')?.addEventListener('click', openImportModal);
    document.getElementById('export-students-btn')?.addEventListener('click', exportStudents);
    document.getElementById('clear-students-btn')?.addEventListener('click', clearAllStudents);

    // Import modal
    document.getElementById('close-import')?.addEventListener('click', closeImportModal);
    document.getElementById('cancel-import-btn')?.addEventListener('click', closeImportModal);
    document.getElementById('confirm-import-btn')?.addEventListener('click', importStudents);

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('open');
            }
        });
    });
}

// ===== Data Persistence =====
function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            students = data.students || [];
            // Ensure all students have required properties
            students = students.map((s, i) => ({
                id: s.id || `student_${Date.now()}_${i}`,
                name: s.name,
                selected: s.selected !== false,
                color: s.color || WHEEL_COLORS[i % WHEEL_COLORS.length]
            }));
        } else {
            // Default sample students
            students = [];
        }
    } catch (e) {
        console.error('Error loading wheel data:', e);
        students = [];
    }
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ students }));
    } catch (e) {
        console.error('Error saving wheel data:', e);
    }
}

function loadSettings() {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) {
            settings = { ...settings, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('Error loading settings:', e);
    }
}

function saveSettingsToStorage() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error('Error saving settings:', e);
    }
}

// ===== Student Management =====
function renderStudentList() {
    if (!studentListEl) return;

    if (students.length === 0) {
        studentListEl.innerHTML = `
            <div class="empty-students">
                <span class="material-symbols-outlined">person_add</span>
                <p>No students yet.<br>Add students below to get started.</p>
            </div>
        `;
        return;
    }

    studentListEl.innerHTML = students.map(student => `
        <div class="student-item ${student.selected ? 'selected' : ''}" data-id="${student.id}">
            <div class="student-checkbox">
                <span class="material-symbols-outlined">check</span>
            </div>
            <div class="student-color" style="background-color: ${student.color}"></div>
            <span class="student-name">${escapeHtml(student.name)}</span>
            <button class="student-delete" data-id="${student.id}" title="Remove student">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
    `).join('');

    // Add click handlers
    studentListEl.querySelectorAll('.student-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.student-delete')) {
                toggleStudent(item.dataset.id);
            }
        });
    });

    studentListEl.querySelectorAll('.student-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeStudent(btn.dataset.id);
        });
    });
}

function updateSelectedStudents() {
    selectedStudents = students.filter(s => s.selected);

    if (studentCountEl) {
        studentCountEl.textContent = `${selectedStudents.length} selected`;
    }

    // Update wheel state
    if (wheelEl) {
        if (selectedStudents.length === 0) {
            wheelEl.classList.add('empty');
        } else {
            wheelEl.classList.remove('empty');
        }
    }
}

function toggleStudent(id) {
    const student = students.find(s => s.id === id);
    if (student) {
        student.selected = !student.selected;
        saveData();
        renderStudentList();
        updateSelectedStudents();
        drawWheel();
    }
}

function selectAllStudents() {
    students.forEach(s => s.selected = true);
    saveData();
    renderStudentList();
    updateSelectedStudents();
    drawWheel();
}

function deselectAllStudents() {
    students.forEach(s => s.selected = false);
    saveData();
    renderStudentList();
    updateSelectedStudents();
    drawWheel();
}

function addNewStudent() {
    const input = document.getElementById('new-student-input');
    const name = input?.value.trim();

    if (!name) return;

    const newStudent = {
        id: `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name,
        selected: true,
        color: WHEEL_COLORS[students.length % WHEEL_COLORS.length]
    };

    students.push(newStudent);
    input.value = '';

    saveData();
    renderStudentList();
    updateSelectedStudents();
    drawWheel();
}

function removeStudent(id) {
    students = students.filter(s => s.id !== id);
    saveData();
    renderStudentList();
    updateSelectedStudents();
    drawWheel();
}

function clearAllStudents() {
    if (confirm('Are you sure you want to remove all students?')) {
        students = [];
        saveData();
        renderStudentList();
        updateSelectedStudents();
        drawWheel();
        closeSettingsModal();
    }
}

// ===== Wheel Drawing =====
function drawWheel() {
    if (!wheelCanvas) return;

    const ctx = wheelCanvas.getContext('2d');
    const size = wheelCanvas.parentElement.offsetWidth;
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size with device pixel ratio for crisp rendering
    wheelCanvas.width = size * dpr;
    wheelCanvas.height = size * dpr;
    wheelCanvas.style.width = size + 'px';
    wheelCanvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 4;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    if (selectedStudents.length === 0) {
        // Draw empty state
        ctx.fillStyle = '#e5e5e5';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
        return;
    }

    const segmentAngle = (2 * Math.PI) / selectedStudents.length;

    selectedStudents.forEach((student, index) => {
        const startAngle = index * segmentAngle - Math.PI / 2;
        const endAngle = startAngle + segmentAngle;

        // Draw segment
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = student.color;
        ctx.fill();

        // Draw segment border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + segmentAngle / 2);

        // Calculate text position
        const textRadius = radius * 0.65;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.min(16, radius / selectedStudents.length * 0.8)}px Lexend, sans-serif`;

        // Add text shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        // Truncate long names
        let displayName = student.name;
        const maxWidth = textRadius - 20;
        while (ctx.measureText(displayName).width > maxWidth && displayName.length > 3) {
            displayName = displayName.slice(0, -1);
        }
        if (displayName !== student.name) {
            displayName += '...';
        }

        ctx.fillText(displayName, textRadius, 0);
        ctx.restore();
    });
}

// ===== Wheel Spinning =====
function spinWheel() {
    if (isSpinning || selectedStudents.length === 0) return;

    isSpinning = true;
    wheelEl.classList.add('spinning');
    winnerDisplayEl?.classList.remove('show');

    // Calculate spin
    const spinDuration = settings.spinDuration * 1000;
    const minRotations = 5;
    const maxRotations = 10;
    const rotations = minRotations + Math.random() * (maxRotations - minRotations);
    const randomOffset = Math.random() * 360;
    const totalRotation = currentRotation + (rotations * 360) + randomOffset;

    // Animate spin
    const startTime = performance.now();
    const startRotation = currentRotation;

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / spinDuration, 1);

        // Easing function - ease out cubic for natural slowdown
        const easeOut = 1 - Math.pow(1 - progress, 3);

        const rotation = startRotation + (totalRotation - startRotation) * easeOut;
        wheelCanvas.style.transform = `rotate(${rotation}deg)`;

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Spin complete
            currentRotation = totalRotation % 360;
            isSpinning = false;
            wheelEl.classList.remove('spinning');
            selectWinner(totalRotation);
        }
    }

    requestAnimationFrame(animate);
}

function selectWinner(finalRotation) {
    if (selectedStudents.length === 0) return;

    // Calculate which segment is at the top (pointer position)
    const segmentAngle = 360 / selectedStudents.length;
    // Normalize rotation and account for pointer at top
    const normalizedRotation = (360 - (finalRotation % 360) + 270) % 360;
    const winnerIndex = Math.floor(normalizedRotation / segmentAngle) % selectedStudents.length;

    const winner = selectedStudents[winnerIndex];

    if (winner) {
        // Show winner
        if (winnerNameEl) {
            winnerNameEl.textContent = winner.name;
            winnerNameEl.style.color = 'white';
        }
        winnerDisplayEl?.classList.add('show');

        // Trigger confetti
        createConfetti();

        // Remove winner if setting enabled
        if (settings.removeWinner) {
            setTimeout(() => {
                winner.selected = false;
                saveData();
                renderStudentList();
                updateSelectedStudents();
                drawWheel();
            }, 2000);
        }
    }
}

// ===== Confetti Effect =====
function createConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti';
    document.body.appendChild(container);

    const colors = WHEEL_COLORS;

    for (let i = 0; i < 50; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = Math.random() * 0.5 + 's';
        piece.style.transform = `rotate(${Math.random() * 360}deg)`;
        container.appendChild(piece);
    }

    // Remove confetti after animation
    setTimeout(() => {
        container.remove();
    }, 3500);
}

// ===== Reset =====
function resetWheel() {
    winnerDisplayEl?.classList.remove('show');
    currentRotation = 0;
    wheelCanvas.style.transform = 'rotate(0deg)';
}

// ===== Settings Modal =====
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    modal?.classList.add('open');

    // Populate current settings
    const durationInput = document.getElementById('spin-duration');
    const soundCheckbox = document.getElementById('sound-enabled');
    const removeCheckbox = document.getElementById('remove-winner');

    if (durationInput) durationInput.value = settings.spinDuration;
    if (soundCheckbox) soundCheckbox.checked = settings.soundEnabled;
    if (removeCheckbox) removeCheckbox.checked = settings.removeWinner;
}

function closeSettingsModal() {
    document.getElementById('settings-modal')?.classList.remove('open');
}

function saveSettings() {
    const durationInput = document.getElementById('spin-duration');
    const soundCheckbox = document.getElementById('sound-enabled');
    const removeCheckbox = document.getElementById('remove-winner');

    settings.spinDuration = parseInt(durationInput?.value) || 5;
    settings.soundEnabled = soundCheckbox?.checked ?? true;
    settings.removeWinner = removeCheckbox?.checked ?? false;

    saveSettingsToStorage();
    closeSettingsModal();
}

// ===== Import/Export =====
function openImportModal() {
    closeSettingsModal();
    const modal = document.getElementById('import-modal');
    modal?.classList.add('open');
    document.getElementById('import-text').value = '';
}

function closeImportModal() {
    document.getElementById('import-modal')?.classList.remove('open');
}

function importStudents() {
    const textarea = document.getElementById('import-text');
    const text = textarea?.value || '';

    const names = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (names.length === 0) {
        alert('No valid names found. Enter one name per line.');
        return;
    }

    // Add new students
    names.forEach((name, i) => {
        const newStudent = {
            id: `student_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
            name: name,
            selected: true,
            color: WHEEL_COLORS[(students.length + i) % WHEEL_COLORS.length]
        };
        students.push(newStudent);
    });

    saveData();
    renderStudentList();
    updateSelectedStudents();
    drawWheel();
    closeImportModal();
}

function exportStudents() {
    const names = students.map(s => s.name).join('\n');
    const blob = new Blob([names], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_list.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ===== Utilities =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Window Resize Handler =====
window.addEventListener('resize', debounce(() => {
    drawWheel();
}, 250));

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
