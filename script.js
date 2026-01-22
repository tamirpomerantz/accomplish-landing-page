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
let orientationTargetX = 0;
let orientationTargetY = 0;

// Update mouse position
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!isMobile && imageLoaded) {
        updateCursorAngles();
        draw();
    }
});

// Device orientation tracking for mobile
let deviceBeta = 0;  // Front-back tilt (-180 to 180)
let deviceGamma = 0; // Left-right tilt (-90 to 90)

function handleDeviceOrientation(e) {
    if (!isMobile) return;
    
    // Beta: front-back tilt (0 = flat, positive = tilted forward)
    // Gamma: left-right tilt (0 = flat, positive = tilted right)
    deviceBeta = e.beta !== null ? e.beta : 0;
    deviceGamma = e.gamma !== null ? e.gamma : 0;
    
    // Map orientation to canvas coordinates
    // Normalize beta to -90 to 90 range for better control
    const normalizedBeta = Math.max(-90, Math.min(90, deviceBeta));
    const normalizedGamma = Math.max(-90, Math.min(90, deviceGamma));
    
    // Map to canvas coordinates (center is 0,0, so we offset from center)
    // Beta controls Y (forward/backward tilt)
    // Gamma controls X (left/right tilt)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const sensitivity = 3; // Adjust this to control how much tilt affects position
    
    orientationTargetX = centerX + (normalizedGamma / 90) * (canvas.width / 2) * sensitivity;
    orientationTargetY = centerY + (normalizedBeta / 90) * (canvas.height / 2) * sensitivity;
    
    // Clamp to canvas bounds
    orientationTargetX = Math.max(0, Math.min(canvas.width, orientationTargetX));
    orientationTargetY = Math.max(0, Math.min(canvas.height, orientationTargetY));
}

// Request permission for device orientation (iOS 13+)
if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    // iOS 13+ requires permission
    document.addEventListener('touchstart', function() {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    window.addEventListener('deviceorientation', handleDeviceOrientation);
                }
            })
            .catch(console.error);
    }, { once: true });
} else {
    // Android and older iOS
    window.addEventListener('deviceorientation', handleDeviceOrientation);
}

// Check if mobile
window.addEventListener('resize', () => {
    const wasMobile = isMobile;
    isMobile = window.innerWidth <= 768;
    
    if (isMobile && !wasMobile) {
        // Switched to mobile - start animation
        orientationTargetX = canvas.width / 2;
        orientationTargetY = canvas.height / 2;
        currentTargetX = orientationTargetX;
        currentTargetY = orientationTargetY;
        if (!animationFrameId) {
            animate();
        }
    } else if (!isMobile && wasMobile) {
        // Switched to desktop - stop animation
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
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
        // Smooth interpolation towards orientation-based target
        currentTargetX += (orientationTargetX - currentTargetX) * 0.1;
        currentTargetY += (orientationTargetY - currentTargetY) * 0.1;
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
        // Start with center position
        orientationTargetX = canvas.width / 2;
        orientationTargetY = canvas.height / 2;
        currentTargetX = orientationTargetX;
        currentTargetY = orientationTargetY;
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
