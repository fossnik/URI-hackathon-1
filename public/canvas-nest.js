// Dynamic Canvas Nest Effect - Particle Animation with Mouse Interaction
// Configuration
const CONFIG = {
    particleCount: 100,
    lineDistance: 150,
    mouseDistance: 200,
    particleColor: '80, 255, 100', // Green (RGB)
    particleSpeed: 0.5,
    particleRadius: 1.5,
};

// Mouse tracking
let mouse = {
    x: null,
    y: null
};

// Track mouse position
window.addEventListener('mousemove', (event) => {
    mouse.x = event.x;
    mouse.y = event.y;
});

// Clear mouse when it leaves
window.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
});

// Particle class
class Particle {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() * CONFIG.particleSpeed * 2) - CONFIG.particleSpeed;
        this.vy = (Math.random() * CONFIG.particleSpeed * 2) - CONFIG.particleSpeed;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, CONFIG.particleRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${CONFIG.particleColor}, 1)`;
        ctx.fill();
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if (this.x < 0 || this.x > this.canvas.width) {
            this.vx = -this.vx;
        }
        if (this.y < 0 || this.y > this.canvas.height) {
            this.vy = -this.vy;
        }
    }
}

// Main Canvas Nest Class
class CanvasNest {
    constructor() {
        this.canvas = document.getElementById('canvas-nest');
        if (!this.canvas) {
            console.error('Canvas element not found');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        
        this.init();
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', () => this.init());
    }

    init() {
        // Set canvas size to fill window
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Create particles
        this.particles = [];
        for (let i = 0; i < CONFIG.particleCount; i++) {
            this.particles.push(new Particle(this.canvas));
        }
    }

    drawLine(x1, y1, x2, y2, opacity, lineWidth = 0.5) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = `rgba(${CONFIG.particleColor}, ${opacity})`;
        this.ctx.lineWidth = lineWidth;
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }

    animate() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update and draw all particles
        for (let i = 0; i < this.particles.length; i++) {
            const p1 = this.particles[i];
            p1.update();
            p1.draw(this.ctx);

            // Particle-to-Particle connections
            for (let j = i + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < CONFIG.lineDistance) {
                    const opacity = 1 - (distance / CONFIG.lineDistance);
                    this.drawLine(p1.x, p1.y, p2.x, p2.y, opacity);
                }
            }

            // Particle-to-Mouse connections
            if (mouse.x !== null && mouse.y !== null) {
                const dx = p1.x - mouse.x;
                const dy = p1.y - mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < CONFIG.mouseDistance) {
                    const opacity = 1 - (distance / CONFIG.mouseDistance);
                    this.drawLine(p1.x, p1.y, mouse.x, mouse.y, opacity, 0.7);
                }
            }
        }

        // Continue animation
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new CanvasNest());
} else {
    new CanvasNest();
}

