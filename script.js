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

// Perlin Noise implementation
class PerlinNoise {
    constructor() {
        this.permutation = [
            151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
            140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
            247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
            57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
            74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
            60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
            65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
            200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
            52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
            207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
            119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
            129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
            218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
            81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
            184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
            222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
        ];
        
        // Duplicate the permutation array
        this.p = new Array(512);
        for (let i = 0; i < 256; i++) {
            this.p[256 + i] = this.p[i] = this.permutation[i];
        }
    }
    
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    lerp(a, b, t) {
        return a + t * (b - a);
    }
    
    grad(hash, x, y, z = 0) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    
    noise(x, y, z = 0) {
        // For 3D noise, we'll use a simplified approach by combining 2D noise layers
        // This creates smooth animated noise
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;
        
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);
        
        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);
        
        const A = this.p[X] + Y;
        const AA = this.p[A] + Z;
        const AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y;
        const BA = this.p[B] + Z;
        const BB = this.p[B + 1] + Z;
        
        return this.lerp(
            this.lerp(
                this.lerp(
                    this.grad(this.p[AA], x, y, z),
                    this.grad(this.p[BA], x - 1, y, z),
                    u
                ),
                this.lerp(
                    this.grad(this.p[AB], x, y - 1, z),
                    this.grad(this.p[BB], x - 1, y - 1, z),
                    u
                ),
                v
            ),
            this.lerp(
                this.lerp(
                    this.grad(this.p[AA + 1], x, y, z - 1),
                    this.grad(this.p[BA + 1], x - 1, y, z - 1),
                    u
                ),
                this.lerp(
                    this.grad(this.p[AB + 1], x, y - 1, z - 1),
                    this.grad(this.p[BB + 1], x - 1, y - 1, z - 1),
                    u
                ),
                v
            ),
            w
        );
    }
}

const perlin = new PerlinNoise();

// Animation time for noise
let noiseTime = 0;
const noiseSpeed = 0.01;
const noiseScale = 0.01; // Scale for spatial noise
const baseSize = 25;
const sizeVariation = 20; // How much the size can vary (±8 pixels)

// Mouse influence parameters
const mouseInfluenceRadius = 300; // Radius of influence sphere
const mouseInfluenceBoost = 15; // Maximum additional size when at mouse position

// Draw cursor using SVG image with variable size based on Perlin noise
function drawCursor(ctx, x, y, angle = 0, size = baseSize) {
    if (!imageLoaded) return;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    // Draw the cursor image with variable size
    const halfSize = size / 2;
    ctx.drawImage(cursorImage, -halfSize, -halfSize, size, size);
    
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
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let isMobile = window.innerWidth <= 768;
let randomTargetX = 0;
let randomTargetY = 0;

// Update mouse position
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    // Don't need to manually draw here - animation loop handles it
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
        // Switched to mobile - start random target animation
        setRandomTarget();
        currentTargetX = randomTargetX;
        currentTargetY = randomTargetY;
        if (randomTargetInterval) {
            clearInterval(randomTargetInterval);
        }
        randomTargetInterval = setInterval(setRandomTarget, 3000);
    } else if (!isMobile && wasMobile) {
        // Switched to desktop - stop random target animation
        if (randomTargetInterval) {
            clearInterval(randomTargetInterval);
            randomTargetInterval = null;
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
    
    // Get current target position (mouse or random target for mobile)
    const targetX = isMobile ? currentTargetX : mouseX;
    const targetY = isMobile ? currentTargetY : mouseY;
    
    cursors.forEach(cursor => {
        // Only draw if cursor is visible on screen
        if (cursor.x >= -spacing && cursor.x <= canvas.width + spacing &&
            cursor.y >= -spacing && cursor.y <= canvas.height + spacing) {
            
            // Calculate size based on Perlin noise
            // Use x, y position and time for 3D noise effect
            const noiseValue = perlin.noise(
                cursor.x * noiseScale,
                cursor.y * noiseScale,
                noiseTime
            );
            
            // Map noise from [-1, 1] to size variation
            // Normalize noise to [0, 1] first
            const normalizedNoise = (noiseValue + 1) / 2;
            let size = baseSize + (normalizedNoise - 0.5) * 2 * sizeVariation;
            
            // Add mouse influence - calculate distance to target
            const dx = cursor.x - targetX;
            const dy = cursor.y - targetY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Apply smooth falloff based on distance
            if (distance < mouseInfluenceRadius) {
                // Smooth falloff using smoothstep function (easing)
                const normalizedDistance = distance / mouseInfluenceRadius;
                // Smoothstep: 3t^2 - 2t^3 for smooth easing
                const influence = 1 - (normalizedDistance * normalizedDistance * (3 - 2 * normalizedDistance));
                const sizeBoost = influence * mouseInfluenceBoost;
                size += sizeBoost;
            }
            
            drawCursor(ctx, cursor.x, cursor.y, cursor.angle, size);
        }
    });
}

// Animation loop
function animate() {
    // Update noise time for animated effect
    noiseTime += noiseSpeed;
    
    if (isMobile) {
        // Smooth interpolation towards random target
        currentTargetX += (randomTargetX - currentTargetX) * 0.05;
        currentTargetY += (randomTargetY - currentTargetY) * 0.05;
    }
    
    updateCursorAngles();
    draw();
    
    // Always animate for noise effect
    animationFrameId = requestAnimationFrame(animate);
}

// Initialize everything after image loads
function initialize() {
    if (isMobile) {
        // Start with random position
        setRandomTarget();
        currentTargetX = randomTargetX;
        currentTargetY = randomTargetY;
        randomTargetInterval = setInterval(setRandomTarget, 3000);
    }
    // Start animation loop (runs continuously for noise effect)
    if (!animationFrameId) {
        animate();
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
