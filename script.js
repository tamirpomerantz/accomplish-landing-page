// Canvas setup
const canvas = document.getElementById('cursorCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Load cursor SVG image
const cursorImage = new Image();
cursorImage.src = 'cursor.svg';
let imageLoaded = false;

cursorImage.onload = function() {
    imageLoaded = true;
    initialize();
};

// Draw cursor using SVG image
function drawCursor(ctx, x, y, angle = 0) {
    if (!imageLoaded) return;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    // Draw the cursor image (centered at origin, SVG is 25x25)
    ctx.drawImage(cursorImage, -12.5, -12.5, 25, 25);
    
    ctx.restore();
}

// Create cursor pattern
const spacing = 12 + 25;
let cursors = [];

function initializeCursors() {
    cursors = [];
    const cols = Math.ceil(canvas.width / spacing) + 2;
    const rows = Math.ceil(canvas.height / spacing) + 2;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            cursors.push({
                x: col * spacing,
                y: row * spacing,
                angle: 0
            });
        }
    }
}

initializeCursors();
window.addEventListener('resize', () => {
    resizeCanvas();
    initializeCursors();
    if (imageLoaded) {
        draw();
    }
});

// Mouse tracking
let mouseX = 0;
let mouseY = 0;
let isMobile = window.innerWidth <= 768;
let randomTargetX = 0;
let randomTargetY = 0;

// Update mouse position
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!isMobile && imageLoaded) {
        updateCursorAngles();
        draw();
    }
});

// Mobile: random target every 3 seconds
function setRandomTarget() {
    randomTargetX = Math.random() * canvas.width;
    randomTargetY = Math.random() * canvas.height;
}

// Check if mobile
window.addEventListener('resize', () => {
    const wasMobile = isMobile;
    isMobile = window.innerWidth <= 768;
    
    if (isMobile && !wasMobile) {
        // Switched to mobile - start animation
        setRandomTarget();
        currentTargetX = randomTargetX;
        currentTargetY = randomTargetY;
        if (!animationFrameId) {
            animate();
        }
        if (randomTargetInterval) {
            clearInterval(randomTargetInterval);
        }
        randomTargetInterval = setInterval(setRandomTarget, 3000);
    } else if (!isMobile && wasMobile) {
        // Switched to desktop - stop animation
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        if (randomTargetInterval) {
            clearInterval(randomTargetInterval);
            randomTargetInterval = null;
        }
        if (imageLoaded) {
            draw();
        }
    }
});

// Smooth animation for mobile (gradual transition)
let currentTargetX = 0;
let currentTargetY = 0;
let animationFrameId = null;
let randomTargetInterval = null;

// Calculate angle for each cursor to point at target, rotated 180 degrees
function updateCursorAngles() {
    const targetX = isMobile ? currentTargetX : mouseX;
    const targetY = isMobile ? currentTargetY : mouseY;

    cursors.forEach(cursor => {
        const dx = targetX - cursor.x;
        const dy = targetY - cursor.y;
        // Rotate 180 degrees: add PI to the angle
        cursor.angle = Math.atan2(dy, dx) - Math.PI / 2 + Math.PI;
    });
}

// Draw all cursors
function draw() {
    if (!imageLoaded) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    cursors.forEach(cursor => {
        // Only draw if cursor is visible on screen
        if (cursor.x >= -spacing && cursor.x <= canvas.width + spacing &&
            cursor.y >= -spacing && cursor.y <= canvas.height + spacing) {
            drawCursor(ctx, cursor.x, cursor.y, cursor.angle);
        }
    });
}

// Animation loop
function animate() {
    if (isMobile) {
        // Smooth interpolation towards random target
        currentTargetX += (randomTargetX - currentTargetX) * 0.05;
        currentTargetY += (randomTargetY - currentTargetY) * 0.05;
    }
    
    updateCursorAngles();
    draw();
    
    if (isMobile) {
        animationFrameId = requestAnimationFrame(animate);
    }
}

// Initialize everything after image loads
function initialize() {
    if (isMobile) {
        // Start with random position
        setRandomTarget();
        currentTargetX = randomTargetX;
        currentTargetY = randomTargetY;
        randomTargetInterval = setInterval(setRandomTarget, 3000);
        animate();
    } else {
        // Initial draw for desktop
        draw();
    }
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateEmail() {
    const emailInput = document.getElementById('emailInput');
    const email = emailInput.value.trim();
    
    if (email === '') {
        // Remove error state if field is empty
        emailInput.classList.remove('error');
        return false;
    }
    
    if (isValidEmail(email)) {
        emailInput.classList.remove('error');
        return true;
    } else {
        emailInput.classList.add('error');
        return false;
    }
}

// Real-time email validation
const emailInput = document.getElementById('emailInput');
emailInput.addEventListener('input', validateEmail);
emailInput.addEventListener('blur', validateEmail);

// Form submission
document.getElementById('signupForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('emailInput').value.trim();
    
    if (!validateEmail()) {
        // Email is invalid, error state already applied
        return;
    }
    
    console.log('Email submitted:', email);
    // Add your form submission logic here
    alert('Thank you for signing up! We\'ll be in touch soon.');
    document.getElementById('emailInput').value = '';
    document.getElementById('emailInput').classList.remove('error');
});
