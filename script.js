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
     * Maps scroll progress to the specific frame sequence.
     * Handles the initial fast transition and hero text fading.
     */
    updateFrameFromScroll() {
        const containerTop = this.scrollContainer.offsetTop;
        const containerHeight = this.scrollContainer.offsetHeight;
        const scrollY = window.scrollY;

        // Calculate progress within the scroll container (0 to 1)
        const scrollIntoContainer = Math.max(0, scrollY - containerTop);
        let progress = containerHeight > 0 ? scrollIntoContainer / containerHeight : 0;
        progress = Math.max(0, Math.min(1, progress));

        // Mapping Logic: First 5% of scroll handles initial 5 frames for a quick reveal
        const startFrame = 1;
        const quickFrameTarget = 5;
        const quickPhaseScrollLimit = 0.05;

        if (progress <= quickPhaseScrollLimit) {
            const p = progress / quickPhaseScrollLimit;
            this.targetFrame = startFrame + (p * (quickFrameTarget - startFrame));
        } else {
            const p = (progress - quickPhaseScrollLimit) / (1 - quickPhaseScrollLimit);
            this.targetFrame = quickFrameTarget + (p * (this.totalFrames - 1 - quickFrameTarget));
        }

        // Clamp final target frame
        this.targetFrame = Math.max(startFrame, Math.min(this.totalFrames - 1, this.targetFrame));

        // Handle Hero Text Fade (8% - 16% progress)
        const fadeStart = Math.floor(this.totalFrames * 0.08);
        const fadeEnd = Math.floor(this.totalFrames * 0.16);

        if (this.targetFrame <= fadeStart) {
            this.heroOverlay.style.opacity = 1;
        } else if (this.targetFrame <= fadeEnd) {
            const fadeProgress = (this.targetFrame - fadeStart) / (fadeEnd - fadeStart);
            this.heroOverlay.style.opacity = 1 - fadeProgress;
        } else {
            this.heroOverlay.style.opacity = 0;
        }

        // Smoothly fade out canvas at the very end of the scroll container
        const frameCompleteThreshold = 0.98;
        if (progress > frameCompleteThreshold) {
            this.canvas.style.opacity = Math.max(0, 1 - (progress - frameCompleteThreshold) / 0.02);
            this.canvas.style.pointerEvents = 'none';
        } else {
            this.canvas.style.opacity = 1;
            this.canvas.style.pointerEvents = 'auto';
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
     * Renders a frame to the canvas.
     * Handles fitting/covering based on device type and aspect ratio.
     */
    renderFrame(frameIndex) {
        frameIndex = Math.max(0, Math.min(this.totalFrames - 1, frameIndex));
        const img = this.images[frameIndex];

        if (!img || !img.complete) return;

        const canvasWidth = window.innerWidth;
        const canvasHeight = window.innerHeight;

        // Clear canvas with background color
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const canvasAspect = canvasWidth / canvasHeight;
        const imgAspect = img.width / img.height;

        let drawWidth = canvasWidth;
        let drawHeight = canvasHeight;
        let offsetX = 0;
        let offsetY = 0;

        if (this.isMobile) {
            // COVER for mobile to fill screen
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
            // CONTAIN for desktop to show full image
            if (imgAspect > canvasAspect) {
                drawHeight = canvasWidth / imgAspect;
                offsetY = (canvasHeight - drawHeight) / 2;
            } else {
                drawWidth = canvasHeight * imgAspect;
                offsetX = (canvasWidth - drawWidth) / 2;
            }
        }

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
            this.currentFrame += diff * 0.3; // Increased to 0.3 for maximum responsiveness and consistency in both directions

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
 * Reveal animation on scroll
 */
const initScrollReveal = () => {
    const reveals = document.querySelectorAll('.reveal');
    
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);
    
    reveals.forEach(reveal => {
        observer.observe(reveal);
    });
};

document.addEventListener('DOMContentLoaded', () => {
    new FrameAnimation();
    initScrollReveal();
});
