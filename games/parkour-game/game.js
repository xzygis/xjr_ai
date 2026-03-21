const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const finalScoreElement = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const flyMeterFill = document.getElementById('fly-meter-fill');

// Sound synthesis using Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'jump') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'score') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }
}

// Game constants
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const FAST_DROP_FORCE = 15;
const GROUND_Y = 320;
const INITIAL_SPEED = 5;
const FLY_SPEED = -4; // Reduced upward speed
const MAX_FLY_TIME = 30 * 60; // 30 seconds in frames (assuming 60fps)
const FLY_START_DELAY = 15; // Frames to hold before flying starts

// Game state
let isGameRunning = false;
let gameSpeed = INITIAL_SPEED;
let score = 0;
let highScore = localStorage.getItem('parkourHighScore') || 0;
let frameCount = 0;
let animationId;

// Input state
let isUpPressed = false;
let upPressFrames = 0;

// Initialize high score display
highScoreElement.innerText = highScore;

// Player object
const player = {
    x: 50,
    y: GROUND_Y - 40,
    width: 40,
    height: 40,
    dy: 0,
    isJumping: false,
    isFlying: false,
    flyFrames: 0,
    color: '#3498db',
    
    draw() {
        ctx.fillStyle = this.color;
        // Trail effect when jumping or flying
        if (this.isJumping || this.isFlying) {
            ctx.fillStyle = this.isFlying ? 'rgba(46, 204, 113, 0.5)' : 'rgba(52, 152, 219, 0.5)';
            ctx.fillRect(this.x - 5, this.y + 5, this.width, this.height);
        }
        
        // Flying visual indicator (aura)
        if (this.isFlying) {
            ctx.fillStyle = 'rgba(46, 204, 113, 0.3)';
            ctx.fillRect(this.x - 10, this.y - 10, this.width + 20, this.height + 20);
        }
        
        ctx.fillStyle = this.isFlying ? '#2ecc71' : this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 25, this.y + 10, 8, 8);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(this.x + 29, this.y + 12, 4, 4);
    },
    
    update() {
        // Handle flying mechanics
        if (isUpPressed) {
            upPressFrames++;
            if (upPressFrames > FLY_START_DELAY && this.flyFrames < MAX_FLY_TIME) {
                this.isFlying = true;
            }
        }
        
        if (this.isFlying) {
            this.flyFrames++;
            
            // Apply hovering physics
            if (isUpPressed) {
                // Move up
                this.dy = FLY_SPEED;
            } else {
                // If not pressing up but still in flying state, apply gravity but less intense
                // Actually, as per requirement, if released it should fall to ground, 
                // so we handle that in the keyup/touchend event which stops flying.
                // This block is when isFlying is true, which implies key is held down.
                this.dy = FLY_SPEED;
            }
            
            this.y += this.dy;
            
            // Ceiling collision (block at top)
            if (this.y < 0) {
                this.y = 0;
            }
            
            // Stop flying if max time reached
            if (this.flyFrames >= MAX_FLY_TIME) {
                this.stopFlying();
            }
        } else {
            // Apply gravity
            this.dy += GRAVITY;
            this.y += this.dy;
        }
        
        // Floor collision
        if (this.y + this.height >= GROUND_Y) {
            this.y = GROUND_Y - this.height;
            this.dy = 0;
            this.isJumping = false;
            // Reset flying ability on ground
            if (!isUpPressed) {
                this.flyFrames = 0;
            }
        } else {
            this.isJumping = true;
        }
    },
    
    jump() {
        if (!this.isJumping) {
            playSound('jump');
            this.dy = JUMP_FORCE;
            this.isJumping = true;
        }
    },
    
    fastDrop() {
        if (this.isJumping || this.isFlying) {
            this.stopFlying();
            this.dy += FAST_DROP_FORCE;
        }
    },
    
    stopFlying() {
        this.isFlying = false;
    }
};

// Obstacles
let obstacles = [];
const OBSTACLE_TYPES = [
    { width: 30, height: 40, yOffset: 0, color: '#e74c3c' },   // Ground normal
    { width: 40, height: 60, yOffset: 0, color: '#c0392b' },   // Ground tall
    { width: 20, height: 25, yOffset: 0, color: '#d35400' },   // Ground small
    { width: 50, height: 180, yOffset: 140, color: '#8e44ad' }, // Top block hanging down, leaves gap below
    { width: 50, height: 200, yOffset: -50, color: '#8e44ad' }, // Bottom block sticking up, leaves gap above
];

class Obstacle {
    constructor() {
        const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
        this.width = type.width;
        this.height = type.height;
        this.x = canvas.width;
        this.y = GROUND_Y - this.height - type.yOffset;
        this.color = type.color;
        this.passed = false;
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Detail
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(this.x, this.y, this.width, this.height / 2);
    }
    
    update() {
        this.x -= gameSpeed;
    }
}

// Background elements (clouds, etc)
let clouds = [];
class Cloud {
    constructor() {
        this.x = canvas.width;
        this.y = Math.random() * 150 + 20; // Restored original y position
        this.size = Math.random() * 30 + 20;
        this.speed = Math.random() * 1 + 0.5;
    }
    
    draw() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.arc(this.x + this.size * 0.8, this.y - this.size * 0.2, this.size * 0.8, 0, Math.PI * 2);
        ctx.arc(this.x + this.size * 1.5, this.y, this.size * 0.9, 0, Math.PI * 2);
        ctx.fill();
    }
    
    update() {
        this.x -= this.speed;
    }
}

function updateFlyMeter() {
    const remainingTime = Math.max(0, MAX_FLY_TIME - player.flyFrames);
    const percentage = (remainingTime / MAX_FLY_TIME) * 100;
    flyMeterFill.style.width = `${percentage}%`;
    
    // Change color based on remaining time
    if (percentage > 50) {
        flyMeterFill.style.backgroundColor = '#2ecc71'; // Green
    } else if (percentage > 20) {
        flyMeterFill.style.backgroundColor = '#f1c40f'; // Yellow
    } else {
        flyMeterFill.style.backgroundColor = '#e74c3c'; // Red
    }
}

// Input handling
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        isUpPressed = true;
        if (!isGameRunning) {
            // Can't start with space if on game over screen
            if (gameOverScreen.classList.contains('active')) return;
            startGame();
        } else if (!player.isFlying) {
            player.jump();
        }
    }
    
    if (e.code === 'ArrowDown' && isGameRunning) {
        player.fastDrop();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        isUpPressed = false;
        upPressFrames = 0;
        player.stopFlying();
    }
});

// Touch controls for mobile
canvas.addEventListener('touchstart', (e) => {
    if (!isGameRunning) return;
    e.preventDefault();
    isUpPressed = true;
    if (!player.isFlying) {
        player.jump();
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    if (!isGameRunning) return;
    e.preventDefault();
    isUpPressed = false;
    upPressFrames = 0;
    player.stopFlying();
}, { passive: false });

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

function spawnObstacle() {
    // Determine spawn rate based on game speed
    const minFrames = Math.max(40, 100 - gameSpeed * 5);
    const maxFrames = Math.max(80, 180 - gameSpeed * 5);
    
    if (frameCount % Math.floor(Math.random() * (maxFrames - minFrames) + minFrames) === 0) {
        // Don't spawn if the last obstacle is too close
        const lastObstacle = obstacles[obstacles.length - 1];
        if (!lastObstacle || canvas.width - lastObstacle.x > 250) {
            obstacles.push(new Obstacle());
        }
    }
}

function spawnClouds() {
    if (frameCount % 100 === 0 && Math.random() > 0.5) {
        clouds.push(new Cloud());
    }
}

function checkCollision(rect1, rect2) {
    // Add a small hitbox margin to make the game fairer
    const margin = 5;
    return (
        rect1.x + margin < rect2.x + rect2.width &&
        rect1.x + rect1.width - margin > rect2.x &&
        rect1.y + margin < rect2.y + rect2.height &&
        rect1.y + rect1.height - margin > rect2.y
    );
}

function gameOver() {
    isGameRunning = false;
    cancelAnimationFrame(animationId);
    
    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('parkourHighScore', highScore);
        highScoreElement.innerText = highScore;
    }
    
    finalScoreElement.innerText = score;
    gameOverScreen.classList.add('active');
}

function drawBackground() {
    // Sky
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, GROUND_Y);
    
    // Ground
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    
    // Ground line
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(0, GROUND_Y, canvas.width, 5);
}

function startGame() {
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    
    // Reset state
    player.y = GROUND_Y - player.height;
    player.dy = 0;
    player.isJumping = false;
    player.isFlying = false;
    player.flyFrames = 0;
    isUpPressed = false;
    upPressFrames = 0;
    
    obstacles = [];
    clouds = [];
    score = 0;
    gameSpeed = INITIAL_SPEED;
    frameCount = 0;
    isGameRunning = true;
    
    scoreElement.innerText = score;
    
    // Initial clouds
    clouds.push(new Cloud());
    clouds[0].x = 400;
    
    gameLoop();
}

function gameLoop() {
    if (!isGameRunning) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawBackground();
    
    // Update fly meter UI
    updateFlyMeter();
    
    // Update and draw clouds
    spawnClouds();
    for (let i = clouds.length - 1; i >= 0; i--) {
        clouds[i].update();
        clouds[i].draw();
        
        if (clouds[i].x + clouds[i].size * 2 < 0) {
            clouds.splice(i, 1);
        }
    }
    
    // Update and draw obstacles
    spawnObstacle();
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.update();
        obs.draw();
        
        // Collision detection
        if (checkCollision(player, obs)) {
            playSound('gameover');
            gameOver();
            return; // Stop the loop
        }
        
        // Score updating
        if (!obs.passed && player.x > obs.x + obs.width) {
            playSound('score');
            score += 10;
            scoreElement.innerText = score;
            obs.passed = true;
            
            // Increase speed slightly every time score increases
            if (score % 50 === 0) {
                gameSpeed += 0.5;
            }
        }
        
        // Remove off-screen obstacles
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }
    }
    
    // Score based on survival time
    if (frameCount % 60 === 0) { // Approx 1 second
        score += 1;
        scoreElement.innerText = score;
    }
    
    // Update and draw player
    player.update();
    player.draw();
    
    frameCount++;
    animationId = requestAnimationFrame(gameLoop);
}

// Initial draw (before starting)
drawBackground();
player.draw();
