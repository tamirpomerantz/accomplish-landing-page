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

// Three.js setup for hidden scene
let threeScene, threeCamera, threeRenderer, torus;
let renderTarget;
let pixelData = null;
const renderSize = 256; // Resolution for the render target (lower = better performance)

// Initialize Three.js scene
function initThreeScene() {
    // Create scene
    threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color(0x000000);
    
    // Create camera
    threeCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    
    // Create renderer with render target (offscreen)
    threeRenderer = new THREE.WebGLRenderer({ antialias: true });
    threeRenderer.setSize(renderSize, renderSize);
    
    // Create render target
    renderTarget = new THREE.WebGLRenderTarget(renderSize, renderSize);
    
    // Create bigger torus geometry (radius: 3.5, tube: 1.2)
    const geometry = new THREE.TorusGeometry(3.5, 1.2, 32, 100);
    
    // Create material with emissive lighting for better brightness variation
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.5,
        metalness: 0.3,
        roughness: 0.4
    });
    
    // Create torus mesh (centered at origin)
    torus = new THREE.Mesh(geometry, material);
    threeScene.add(torus);
    
    // Add lights for better brightness variation
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    threeScene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 5, 5);
    threeScene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-5, -5, -5);
    threeScene.add(directionalLight2);
    
    // Initialize pixel data array
    pixelData = new Uint8Array(renderSize * renderSize * 4);
    
    // Center the torus on first init
    updateThreeSceneCentering();
}

// Update camera position to keep torus centered
function updateThreeSceneCentering() {
    if (!threeCamera) return;
    
    // Position camera to keep torus centered
    // Use a distance that ensures the torus fits well in view
    // The torus has a radius of ~4.7 (3.5 + 1.2), so we need enough distance
    const distance = 8;
    threeCamera.position.set(0, 0, distance);
    threeCamera.lookAt(0, 0, 0);
    
    // Camera aspect is always 1:1 since render target is square
    threeCamera.aspect = 1;
    threeCamera.updateProjectionMatrix();
}

// Render Three.js scene and update pixel data
function renderThreeScene() {
    // Rotate torus
    torus.rotation.x += 0.01;
    torus.rotation.y += 0.015;
    
    // Render to render target
    threeRenderer.setRenderTarget(renderTarget);
    threeRenderer.render(threeScene, threeCamera);
    threeRenderer.setRenderTarget(null);
    
    // Read pixel data from render target
    threeRenderer.readRenderTargetPixels(
        renderTarget,
        0,
        0,
        renderSize,
        renderSize,
        pixelData
    );
}

// Get brightness value at a specific position (normalized 0-1)
function getBrightnessAt(x, y) {
    if (!pixelData) return 0.5;
    
    // Map canvas coordinates to render target coordinates
    const renderX = Math.floor((x / canvas.width) * renderSize);
    const renderY = Math.floor((y / canvas.height) * renderSize);
    
    // Clamp to valid range
    const clampedX = Math.max(0, Math.min(renderSize - 1, renderX));
    const clampedY = Math.max(0, Math.min(renderSize - 1, renderY));
    
    // Calculate index in pixel data array (RGBA format)
    const index = (clampedY * renderSize + clampedX) * 4;
    
    // Get RGB values
    const r = pixelData[index];
    const g = pixelData[index + 1];
    const b = pixelData[index + 2];
    
    // Calculate brightness (luminance formula)
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return brightness;
}

const baseSize = 20;
const sizeVariation = 20; // How much the size can vary based on brightness

// Mouse influence parameters
const mouseInfluenceRadius = 300; // Radius of influence sphere
const mouseInfluenceBoost = 5; // Maximum additional size when at mouse position

// Size transition smoothing factor (0-1, lower = smoother/slower transition)
const sizeTransitionSpeed = 0.15;

// Draw cursor using SVG image with variable size
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
                angle: 0,
                currentSize: baseSize // Track current size for smooth transitions
            });
        }
    }
}

initializeCursors();
window.addEventListener('resize', () => {
    resizeCanvas();
    initializeCursors();
    // Update Three.js scene centering on resize
    if (threeScene) {
        updateThreeSceneCentering();
    }
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
    
    // Render Three.js scene first to update pixel data
    if (threeScene) {
        renderThreeScene();
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get current target position (mouse or random target for mobile)
    const targetX = isMobile ? currentTargetX : mouseX;
    const targetY = isMobile ? currentTargetY : mouseY;
    
    cursors.forEach(cursor => {
        // Only draw if cursor is visible on screen
        if (cursor.x >= -spacing && cursor.x <= canvas.width + spacing &&
            cursor.y >= -spacing && cursor.y <= canvas.height + spacing) {
            
            // Calculate target size based on Three.js scene brightness
            // The brighter the pixel, the bigger the cursor
            const brightness = getBrightnessAt(cursor.x, cursor.y);
            
            // Map brightness [0, 1] to size variation
            // Brightness of 0 = smallest, brightness of 1 = largest
            let targetSize = baseSize + brightness * sizeVariation;
            
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
                targetSize += sizeBoost;
            }
            
            // Smoothly transition from current size to target size
            cursor.currentSize += (targetSize - cursor.currentSize) * sizeTransitionSpeed;
            
            drawCursor(ctx, cursor.x, cursor.y, cursor.angle, cursor.currentSize);
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
    
    // Always animate for Three.js scene rotation
    animationFrameId = requestAnimationFrame(animate);
}

// Initialize everything after image loads
function initialize() {
    // Initialize Three.js scene
    if (typeof THREE !== 'undefined') {
        initThreeScene();
    }
    
    if (isMobile) {
        // Start with random position
        setRandomTarget();
        currentTargetX = randomTargetX;
        currentTargetY = randomTargetY;
        randomTargetInterval = setInterval(setRandomTarget, 3000);
    }
    // Start animation loop (runs continuously for Three.js scene animation)
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
