/**
 * ============================================
 * AM EARBUDS - SCROLL-DRIVEN FRAME ANIMATION
 * ============================================
 * 
 * Proper scroll animation architecture:
 * - Single scroll container controls all animation
 * - Canvas stays fixed while scroll container passes through
 * - Progress mapped relative to scroll container height only
 * - All 192 frames play smoothly across entire container
 */

class FrameAnimation {
    constructor() {
        // Configuration
        this.isMobile = window.innerWidth <= 768;
        this.updateConfig();
        this.frameExtension = '.jpg';

        // DOM elements
        this.canvas = document.getElementById('frameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scrollContainer = document.getElementById('scroll-container');
        this.navbar = document.getElementById('navbar');
        this.heroContent = document.querySelector('.hero-content');
        this.heroOverlay = document.querySelector('.hero-overlay');

        // State
        this.images = [];
        this.currentFrame = 1;
        this.targetFrame = 1;
        this.lastRenderedFrame = -1;
        this.animationFrameId = null;
        this.lastLogTime = 0;

        // Initialize
        this.init();
    }

    updateConfig() {
        if (this.isMobile) {
            this.totalFrames = 160;
            this.sequencePath = 'assets/sequence_mobile/ezgif-frame-';
        } else {
            this.totalFrames = 120;
            this.sequencePath = 'assets/sequence/ezgif-frame-';
        }
    }

    handleResize() {
        this.resizeCanvas();
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;

        if (wasMobile !== this.isMobile) {
            console.log('🔄 Breakpoint crossed, reloading animation sequence...');
            this.updateConfig();
            this.images = [];
            this.preloadAllImages();
            this.updateFrameFromScroll();
        }
    }

    /**
     * Initialize the animation system
     */
    init() {
        console.log('🎬 Initializing Frame Animation...');
        console.log(`📏 Scroll container height: ${this.scrollContainer.offsetHeight}px`);
        console.log(`📊 Total frames to load: ${this.totalFrames}`);

        // Setup canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.handleResize());

        // Preload all images
        this.preloadAllImages();

        // Start animation loop
        this.startAnimationLoop();

        // Setup scroll listener - calculate progress relative to scroll container ONLY
        window.addEventListener('scroll', () => {
            this.updateFrameFromScroll();
            this.updateNavbar();
        });

        // Render first frame
        setTimeout(() => {
            this.renderFrame(0);
        }, 100);

        console.log('✅ Animation system initialized');
    }

    /**
     * Resize canvas to match viewport with device pixel ratio for pixel-perfect rendering
     */
    resizeCanvas() {
        // Get device pixel ratio for high-DPI displays (retina, etc.)
        const dpr = window.devicePixelRatio || 1;

        // Set canvas resolution to match physical pixels
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;

        // Set CSS size to logical pixels (normal viewport size)
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';

        // Scale context to account for DPR
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Disable image smoothing for pixel-perfect rendering
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.imageSmoothingQuality = 'high';

        console.log(`📐 Canvas resized to: ${this.canvas.width}x${this.canvas.height} (DPR: ${dpr}x) | CSS: ${window.innerWidth}x${window.innerHeight}`);
    }

    /**
     * Preload all images
     */
    preloadAllImages() {
        console.log(`📦 Preloading ${this.totalFrames} images...`);

        for (let i = 1; i <= this.totalFrames; i++) {
            const frameNum = String(i).padStart(3, '0');
            const src = `${this.sequencePath}${frameNum}${this.frameExtension}`;

            const img = new Image();
            img.onload = () => {
                // Silently load
            };
            img.onerror = () => {
                console.warn(`❌ Failed to load frame ${i}: ${src}`);
            };
            img.src = src;
            this.images.push(img);
        }

        console.log(`✅ All ${this.totalFrames} frames queued for loading`);
    }

    /**
     * UPDATE FRAME BASED ON SCROLL THROUGH THE ANIMATION CONTAINER
     * Canvas is now FIXED, so we map entire page scroll to frame progression
     */
    updateFrameFromScroll() {
        // Get scroll container boundaries
        const containerTop = this.scrollContainer.offsetTop;
        const containerHeight = this.scrollContainer.offsetHeight;  // Height of scroll-spacer (700vh)

        // Current scroll position
        const scrollY = window.scrollY;

        // Calculate how far we've scrolled INTO the container (relative to container start)
        const scrollIntoContainer = Math.max(0, scrollY - containerTop);

        // Calculate progress through the container (0 to 1)
        let progress = 0;
        if (containerHeight > 0) {
            progress = scrollIntoContainer / containerHeight;
        }

        // Clamp progress to valid range
        progress = Math.max(0, Math.min(1, progress));

        // Map progress to frame index, skipping initial blank frame
        // Make the first 5 frames move slowly, then speed up for the rest
        const startFrame = 1;
        const slowFrameTarget = 5;
        const slowPhaseScrollLimit = 0.2; // First 20% of scroll for frames 1-5

        if (progress <= slowPhaseScrollLimit) {
            const p = progress / slowPhaseScrollLimit;
            this.targetFrame = startFrame + Math.floor(p * (slowFrameTarget - startFrame));
        } else {
            const p = (progress - slowPhaseScrollLimit) / (1 - slowPhaseScrollLimit);
            this.targetFrame = slowFrameTarget + Math.floor(p * (this.totalFrames - 1 - slowFrameTarget));
        }
        this.targetFrame = Math.max(startFrame, Math.min(this.totalFrames - 1, this.targetFrame));

        // FADE OUT HERO TEXT based on sequence length
        const fadeStart = Math.floor(this.totalFrames * 0.08); // e.g. 10 frames on desktop, 12 on mobile
        const fadeEnd = Math.floor(this.totalFrames * 0.16);   // e.g. 20 frames on desktop, 25 on mobile

        if (this.targetFrame <= fadeStart) {
            this.heroOverlay.style.opacity = 1;
        } else if (this.targetFrame <= fadeEnd) {
            const fadeProgress = (this.targetFrame - fadeStart) / (fadeEnd - fadeStart);
            this.heroOverlay.style.opacity = 1 - fadeProgress;
        } else {
            this.heroOverlay.style.opacity = 0;
        }

        // HIDE CANVAS after last frame so transition section is visible
        const frameCompleteThreshold = 0.98; // 98% through the container = near end
        if (progress > frameCompleteThreshold) {
            this.canvas.style.opacity = Math.max(0, 1 - (progress - frameCompleteThreshold) / 0.02);
            this.canvas.style.pointerEvents = 'none';
        } else {
            this.canvas.style.opacity = 1;
            this.canvas.style.pointerEvents = 'auto';
        }

        // Log progress regularly (not every scroll event)
        const currentTime = performance.now();
        if (currentTime - this.lastLogTime > 500) {
            const heroOpacity = parseFloat(this.heroOverlay.style.opacity || 1);
            const canvasOpacity = parseFloat(this.canvas.style.opacity || 1);
            console.log(
                `📍 ScrollY: ${scrollY.toFixed(0)}px | Into Container: ${scrollIntoContainer.toFixed(0)}px | Progress: ${(progress * 100).toFixed(1)}% | Frame: ${this.targetFrame}/${this.totalFrames - 1} | TextOpacity: ${heroOpacity.toFixed(2)} | CanvasOpacity: ${canvasOpacity.toFixed(2)}`
            );
            this.lastLogTime = currentTime;
        }
    }

    /**
     * Update navbar appearance on scroll
     */
    updateNavbar() {
        if (this.targetFrame >= this.totalFrames - 1) {
            this.navbar.classList.add('scrolled');
        } else {
            this.navbar.classList.remove('scrolled');
        }
    }

    /**
     * Render a specific frame to canvas with pixel-perfect scaling
     */
    renderFrame(frameIndex) {
        // Clamp index
        frameIndex = Math.max(0, Math.min(this.totalFrames - 1, frameIndex));

        const img = this.images[frameIndex];

        if (!img || !img.complete) {
            return; // Image not ready yet
        }

        // Disable smoothing for crisp pixel-perfect rendering
        this.ctx.imageSmoothingEnabled = false;

        // Get logical canvas dimensions (CSS size, not physical pixel size)
        const canvasWidth = window.innerWidth;
        const canvasHeight = window.innerHeight;

        // Clear canvas with black background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Calculate scaling to fit image to canvas while maintaining aspect ratio
        const canvasAspect = canvasWidth / canvasHeight;
        const imgAspect = img.width / img.height;

        let drawWidth = canvasWidth;
        let drawHeight = canvasHeight;
        let offsetX = 0;
        let offsetY = 0;

        if (this.isMobile) {
            // COVER for mobile to fill screen impactfully
            if (imgAspect > canvasAspect) {
                drawHeight = canvasHeight;
                drawWidth = canvasHeight * imgAspect;
                offsetX = (canvasWidth - drawWidth) / 2;
            } else {
                drawWidth = canvasWidth;
                drawHeight = canvasWidth / imgAspect;
                offsetY = (canvasHeight - drawHeight) / 2;
            }
        } else {
            // CONTAIN for desktop
            if (imgAspect > canvasAspect) {
                drawHeight = canvasWidth / imgAspect;
                offsetY = (canvasHeight - drawHeight) / 2;
            } else {
                drawWidth = canvasHeight * imgAspect;
                offsetX = (canvasWidth - drawWidth) / 2;
            }
        }

        // Draw image centered on canvas with pixel-perfect rendering
        this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        this.lastRenderedFrame = frameIndex;
    }

    /**
     * Start the animation loop using requestAnimationFrame
     * Uses smooth interpolation to prevent frame skipping
     */
    startAnimationLoop() {
        const loop = () => {
            // Smooth interpolation between current and target frame
            const diff = this.targetFrame - this.currentFrame;
            this.currentFrame += diff * 0.1; // 10% per frame

            // Round to nearest frame for rendering
            const roundedFrame = Math.round(this.currentFrame);

            // Only render if frame changed
            if (roundedFrame !== this.lastRenderedFrame) {
                this.renderFrame(roundedFrame);
            }

            this.animationFrameId = requestAnimationFrame(loop);
        };

        loop();
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }
}

/**
 * Initialize the frame animation when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM Content Loaded - Starting initialization...');
    const frameAnimation = new FrameAnimation();

    // CTA button is now a link, so no additional click handler needed
    // The href and target attributes handle the navigation
});

/**
 * Performance monitoring (optional)
 * Uncomment to log performance metrics
 */
/*
let frameCount = 0;
let lastTime = performance.now();

function logPerformance() {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime;
    
    if (deltaTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / deltaTime);
        console.log(`FPS: ${fps}`);
        frameCount = 0;
        lastTime = currentTime;
    }
    
    frameCount++;
    requestAnimationFrame(logPerformance);
}

document.addEventListener('DOMContentLoaded', () => {
    logPerformance();
});
*/
