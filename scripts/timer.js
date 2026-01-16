/**
 * Visual Timer - Teacher Tools
 * Fun countdown timer with pizza slice animation
 */

// ===== State =====
let totalSeconds = 0;
let remainingSeconds = 0;
let timerInterval = null;
let isPaused = false;
let soundEnabled = true;
let segments = [];
const NUM_SEGMENTS = 12; // Pizza slices

// ===== Audio Context for Sounds =====
let audioContext = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

// Generate a beep sound
function playBeep(frequency = 800, duration = 0.1, volume = 0.3) {
    if (!soundEnabled) return;

    try {
        const ctx = initAudio();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
        console.log('Audio not available');
    }
}

// Play tick sound
function playTick() {
    playBeep(600, 0.05, 0.1);
}

// Play warning beep
function playWarning() {
    playBeep(400, 0.2, 0.3);
}

// Play celebration sound
function playCelebration() {
    if (!soundEnabled) return;

    // Play a fun ascending arpeggio
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
        setTimeout(() => playBeep(freq, 0.3, 0.4), i * 150);
    });
}

// ===== DOM Elements =====
const setupScreen = document.getElementById('timer-setup');
const displayScreen = document.getElementById('timer-display');
const celebrationScreen = document.getElementById('celebration');
const pieTimer = document.getElementById('pie-timer');
const timeDisplay = document.getElementById('time-remaining');
const timerLabel = document.getElementById('timer-label');
const minutesInput = document.getElementById('minutes-input');
const secondsInput = document.getElementById('seconds-input');
const soundToggle = document.getElementById('sound-enabled');

// ===== Initialize =====
function init() {
    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const minutes = parseInt(btn.dataset.minutes);
            minutesInput.value = minutes;
            secondsInput.value = 0;
        });
    });

    // Start button
    document.getElementById('start-timer').addEventListener('click', startTimer);

    // Control buttons
    document.getElementById('pause-btn').addEventListener('click', togglePause);
    document.getElementById('stop-btn').addEventListener('click', stopTimer);
    document.getElementById('add-time-btn').addEventListener('click', addTime);
    document.getElementById('done-btn').addEventListener('click', resetTimer);

    // Sound toggle
    soundToggle.addEventListener('change', (e) => {
        soundEnabled = e.target.checked;
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

// ===== Timer Functions =====
function startTimer() {
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;

    totalSeconds = minutes * 60 + seconds;
    remainingSeconds = totalSeconds;

    if (totalSeconds <= 0) {
        alert('Please set a time greater than 0');
        return;
    }

    // Initialize audio on user interaction
    initAudio();

    // Create pizza segments
    createPieSegments();

    // Show timer display
    setupScreen.classList.add('hidden');
    displayScreen.classList.remove('hidden');
    displayScreen.classList.remove('warning', 'danger', 'paused');

    // Update display
    updateDisplay();

    // Start interval
    isPaused = false;
    timerInterval = setInterval(tick, 1000);

    // Play start sound
    playBeep(800, 0.15, 0.3);
}

function tick() {
    if (isPaused) return;

    remainingSeconds--;

    if (remainingSeconds <= 0) {
        // Timer complete!
        clearInterval(timerInterval);
        timerInterval = null;
        showCelebration();
        return;
    }

    updateDisplay();
    updatePieSegments();
    updateTimerState();

    // Sound effects
    if (remainingSeconds <= 5) {
        playWarning();
    } else if (remainingSeconds <= 10) {
        playTick();
    }
}

function updateDisplay() {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function updateTimerState() {
    const percentRemaining = remainingSeconds / totalSeconds;

    displayScreen.classList.remove('warning', 'danger');

    if (percentRemaining <= 0.1 || remainingSeconds <= 10) {
        displayScreen.classList.add('danger');
        timerLabel.textContent = 'almost done!';
    } else if (percentRemaining <= 0.25 || remainingSeconds <= 30) {
        displayScreen.classList.add('warning');
        timerLabel.textContent = 'hurry up!';
    } else {
        timerLabel.textContent = 'remaining';
    }
}

function togglePause() {
    isPaused = !isPaused;

    const pauseBtn = document.getElementById('pause-btn');
    const icon = pauseBtn.querySelector('.material-symbols-outlined');

    if (isPaused) {
        icon.textContent = 'play_arrow';
        displayScreen.classList.add('paused');
        timerLabel.textContent = 'paused';
    } else {
        icon.textContent = 'pause';
        displayScreen.classList.remove('paused');
        updateTimerState();
    }
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    resetTimer();
}

function addTime() {
    remainingSeconds += 60;
    totalSeconds += 60;
    updateDisplay();
    updatePieSegments();
    updateTimerState();
    playBeep(1000, 0.1, 0.2);
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    isPaused = false;

    celebrationScreen.classList.add('hidden');
    displayScreen.classList.add('hidden');
    setupScreen.classList.remove('hidden');

    // Reset pause button
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
        pauseBtn.querySelector('.material-symbols-outlined').textContent = 'pause';
    }
}

// ===== Pizza Pie Segments =====
function createPieSegments() {
    pieTimer.innerHTML = '';
    segments = [];

    const centerX = 50;
    const centerY = 50;
    const radius = 48;

    for (let i = 0; i < NUM_SEGMENTS; i++) {
        const startAngle = (i * 360 / NUM_SEGMENTS) * (Math.PI / 180);
        const endAngle = ((i + 1) * 360 / NUM_SEGMENTS) * (Math.PI / 180);

        const x1 = centerX + radius * Math.cos(startAngle);
        const y1 = centerY + radius * Math.sin(startAngle);
        const x2 = centerX + radius * Math.cos(endAngle);
        const y2 = centerY + radius * Math.sin(endAngle);

        const largeArcFlag = 0;

        const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
        ].join(' ');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('class', 'pie-segment');
        path.dataset.index = i;

        pieTimer.appendChild(path);
        segments.push(path);
    }
}

function updatePieSegments() {
    const percentElapsed = 1 - (remainingSeconds / totalSeconds);
    const segmentsToHide = Math.floor(percentElapsed * NUM_SEGMENTS);

    segments.forEach((segment, i) => {
        // Remove old state classes
        segment.classList.remove('eaten', 'warning', 'danger');

        if (i < segmentsToHide) {
            // This segment should be hidden (eaten)
            segment.classList.add('eaten');
        } else {
            // Still visible - update color based on remaining time
            const percentRemaining = remainingSeconds / totalSeconds;

            if (percentRemaining <= 0.1 || remainingSeconds <= 10) {
                segment.classList.add('danger');
            } else if (percentRemaining <= 0.25 || remainingSeconds <= 30) {
                segment.classList.add('warning');
            }
        }
    });
}

// ===== Celebration =====
function showCelebration() {
    displayScreen.classList.add('hidden');
    celebrationScreen.classList.remove('hidden');

    // Play celebration sound
    playCelebration();

    // Start confetti
    startConfetti();
}

// ===== Confetti Animation =====
function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const confetti = [];
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe', '#fd79a8', '#00b894'];

    // Create confetti particles
    for (let i = 0; i < 150; i++) {
        confetti.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 10 + 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            speedY: Math.random() * 3 + 2,
            speedX: (Math.random() - 0.5) * 4,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10
        });
    }

    let animationFrame;

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let allDone = true;

        confetti.forEach(particle => {
            if (particle.y < canvas.height + 50) {
                allDone = false;

                particle.y += particle.speedY;
                particle.x += particle.speedX;
                particle.rotation += particle.rotationSpeed;

                ctx.save();
                ctx.translate(particle.x, particle.y);
                ctx.rotate(particle.rotation * Math.PI / 180);
                ctx.fillStyle = particle.color;
                ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.6);
                ctx.restore();
            }
        });

        if (!allDone) {
            animationFrame = requestAnimationFrame(animate);
        }
    }

    animate();

    // Stop animation when leaving celebration
    document.getElementById('done-btn').addEventListener('click', () => {
        cancelAnimationFrame(animationFrame);
    }, { once: true });
}

// ===== Keyboard Shortcuts =====
function handleKeyboard(e) {
    // Only handle when timer is running
    if (displayScreen.classList.contains('hidden')) return;

    switch (e.key) {
        case ' ':
        case 'p':
        case 'P':
            e.preventDefault();
            togglePause();
            break;
        case 'Escape':
            stopTimer();
            break;
        case '+':
        case '=':
            addTime();
            break;
    }
}

// ===== Initialize on Load =====
document.addEventListener('DOMContentLoaded', init);

// Handle window resize for confetti canvas
window.addEventListener('resize', () => {
    const canvas = document.getElementById('confetti-canvas');
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
});
