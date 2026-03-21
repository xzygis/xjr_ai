const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('final-score');
const gameOverScreen = document.getElementById('game-over');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// 游戏常量配置
const GROUND_Y = 320;
const GRAVITY = 0.6;
const GAME_SPEED_START = 5;
const MAX_GAME_SPEED = 15;

// 游戏状态
let isPlaying = false;
let score = 0;
let gameSpeed = GAME_SPEED_START;
let animationId;
let frames = 0;

// 游戏实体数组
let obstacles = [];
let particles = [];
let clouds = [];

// 音效 (暂用空壳或可选，为后续扩展留白)
function playJumpSound() {}
function playHitSound() {}
function playScoreSound() {}

// --- 实体类定义 ---

class Player {
    constructor() {
        this.width = 40;
        this.height = 60;
        this.x = 100;
        this.y = GROUND_Y - this.height;
        this.dy = 0;
        this.jumpForce = -12;
        this.originalHeight = this.height;
        this.grounded = true; // 初始状态设为在地面
        this.jumpTimer = 0;
        this.color = '#ff5722';
    }

    animate() {
        // 应用重力和移动
        this.dy += GRAVITY;
        this.y += this.dy;

        // 地面碰撞检测
        if (this.y >= GROUND_Y - this.height) { 
            this.y = GROUND_Y - this.height;
            this.dy = 0;
            this.grounded = true;
        } else {
            this.grounded = false;
        }

        this.draw();
    }

    draw() {
        ctx.fillStyle = this.color;
        // 画出主体矩形
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 眼睛
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 20, this.y + 10, 8, 8);
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 24, this.y + 12, 4, 4);
        
        // 当在空中时的不同姿势
        if (!this.grounded) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x + 10, this.y + this.height, 10, 10); // 抬起的腿
        } else {
            // 简单的跑步动画效果（根据frames）
            if (frames % 20 < 10) {
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x + 5, this.y + this.height, 10, 10);
                ctx.fillRect(this.x + 25, this.y + this.height, 10, 10);
            } else {
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x + 15, this.y + this.height, 10, 10);
            }
        }
    }

    jump() {
        console.log("Jump method called. Grounded:", this.grounded, "Y pos:", this.y, "Target Y:", GROUND_Y - this.height);
        // 只要在地面或者非常接近地面，就可以跳跃
        if (this.grounded || Math.abs(this.y - (GROUND_Y - this.height)) <= 5) {
            this.dy = this.jumpForce;
            this.grounded = false;
            this.y -= 1; // 强制稍微离开地面一点，确保脱离地面检测
            console.log("Jump SUCCESS! new dy:", this.dy);
            playJumpSound();
            createParticles(this.x + this.width/2, this.y + this.height, 10);
        } else {
            console.log("Jump FAILED: not grounded.");
        }
    }
}

class Obstacle {
    constructor() {
        // 随机生成不同类型的障碍物
        const type = Math.random();
        
        if (type < 0.3) {
            // 飞行障碍 (高低错落)
            this.width = 30;
            this.height = 30;
            this.y = GROUND_Y - this.height - 30 - Math.random() * 50;
            this.color = '#e91e63';
        } else {
            // 地面障碍
            this.width = 20 + Math.random() * 30;
            this.height = 30 + Math.random() * 40;
            this.y = GROUND_Y - this.height;
            this.color = '#4caf50';
        }
        
        this.x = canvas.width;
    }

    update() {
        this.x -= gameSpeed;
        this.draw();
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 装饰纹理
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}

class Cloud {
    constructor() {
        this.x = canvas.width;
        this.y = Math.random() * (GROUND_Y - 150);
        this.size = 20 + Math.random() * 30;
        this.speed = Math.random() * 1 + 0.5;
        this.color = 'rgba(255, 255, 255, 0.7)';
    }

    update() {
        this.x -= this.speed;
        this.draw();
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, Math.PI * 0.5, Math.PI * 1.5);
        ctx.arc(this.x + this.size, this.y - this.size * 0.5, this.size * 0.8, Math.PI * 1, Math.PI * 2);
        ctx.arc(this.x + this.size * 2, this.y, this.size, Math.PI * 1.5, Math.PI * 0.5);
        ctx.fill();
    }
}

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.speedX = (Math.random() - 0.5) * 4;
        this.speedY = (Math.random() - 0.5) * 4;
        this.color = '#fff';
        this.life = 1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.05;
        this.draw();
    }

    draw() {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

// --- 初始化与控制 ---

let player;

function init() {
    player = new Player();
    obstacles = [];
    particles = [];
    clouds = [];
    score = 0;
    frames = 0;
    gameSpeed = GAME_SPEED_START;
    scoreElement.innerText = score;
    
    // 预生成一些云朵
    for(let i=0; i<3; i++) {
        let cloud = new Cloud();
        cloud.x = Math.random() * canvas.width;
        clouds.push(cloud);
    }
}

function spawnObstacle() {
    // 障碍物生成的间隔随着游戏速度的提升而减少，但也要保持随机性
    let spawnTimer = 100 - Math.min(gameSpeed * 2, 60);
    
    if (frames % Math.floor(spawnTimer + Math.random() * 50) === 0) {
        obstacles.push(new Obstacle());
    }
}

function spawnCloud() {
    if (frames % 150 === 0) {
        clouds.push(new Cloud());
    }
}

function createParticles(x, y, amount) {
    for (let i = 0; i < amount; i++) {
        particles.push(new Particle(x, y));
    }
}

// 矩形碰撞检测 (AABB)
function checkCollision(p, o) {
    return (
        p.x < o.x + o.width &&
        p.x + p.width > o.x &&
        p.y < o.y + o.height &&
        p.y + p.height > o.y
    );
}

// 绘制背景环境
function drawEnvironment() {
    // 天空背景 (由CSS设定，这里可以增加渐变)
    let bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#87CEEB');
    bgGradient.addColorStop(1, '#e0f7fa');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 地面
    ctx.fillStyle = '#795548'; // 泥土色
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    
    // 草地层
    ctx.fillStyle = '#8bc34a'; // 绿色
    ctx.fillRect(0, GROUND_Y, canvas.width, 15);
    
    // 移动的地纹路 (简单视差效果)
    ctx.fillStyle = '#6d4c41';
    for(let i=0; i<10; i++) {
        let x = ((i * 100 - (frames * gameSpeed * 0.8)) % canvas.width + canvas.width) % canvas.width;
        ctx.fillRect(x, GROUND_Y + 20 + (i % 3)*10, 20, 5);
    }
}

// 游戏主循环
function update() {
    if (!isPlaying) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawEnvironment();

    // 更新云朵
    spawnCloud();
    for (let i = 0; i < clouds.length; i++) {
        clouds[i].update();
        if (clouds[i].x + clouds[i].size * 3 < 0) {
            clouds.splice(i, 1);
            i--;
        }
    }

    // 更新粒子
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
            i--;
        }
    }

    // 玩家更新
    player.animate();

    // 障碍物更新与碰撞
    spawnObstacle();
    for (let i = 0; i < obstacles.length; i++) {
        let o = obstacles[i];
        o.update();

        // 碰撞检测
        if (checkCollision(player, o)) {
            gameOver();
            return; // 立即停止渲染这帧
        }

        // 越界移除
        if (o.x + o.width < 0) {
            obstacles.splice(i, 1);
            i--;
        }
    }

    // 游戏逻辑更新
    score++;
    if (score % 10 === 0) {
        scoreElement.innerText = Math.floor(score / 10);
    }
    
    // 逐渐增加游戏速度
    if (frames % 300 === 0 && gameSpeed < MAX_GAME_SPEED) {
        gameSpeed += 0.5;
    }

    frames++;
    animationId = requestAnimationFrame(update);
}

// 游戏状态控制
function startGame() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    init();
    isPlaying = true;
    update();
}

function gameOver() {
    isPlaying = false;
    cancelAnimationFrame(animationId);
    playHitSound();
    
    // 屏幕震动效果
    canvas.style.transform = 'translate(5px, 5px)';
    setTimeout(() => canvas.style.transform = 'translate(-5px, -5px)', 50);
    setTimeout(() => canvas.style.transform = 'translate(5px, -5px)', 100);
    setTimeout(() => canvas.style.transform = 'translate(0, 0)', 150);
    
    finalScoreElement.innerText = Math.floor(score / 10);
    gameOverScreen.classList.remove('hidden');
}

// 事件监听
let keys = {};

window.addEventListener('keydown', function(e) {
    if (!keys[e.code]) { // 防止长按重复触发
        keys[e.code] = true;
        // 使用 e.key 作为备用判断，以防 e.code 在某些环境下不兼容
        const isJumpKey = e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyQ' || e.code === 'KeyO' || e.code === 'Digit1' || e.code === 'Numpad1' ||
                          e.key === ' ' || e.key === 'ArrowUp' || e.key === 'q' || e.key === 'Q' || e.key === 'o' || e.key === 'O' || e.key === '1';
        
        if (isJumpKey && isPlaying) {
            player.jump();
            e.preventDefault();
        }
    }
    // 回车键快捷重新开始或开始游戏
    if (e.code === 'Enter' || e.key === 'Enter') {
        if (!isPlaying) {
            startGame();
        }
    }
});

window.addEventListener('keyup', function(e) {
    keys[e.code] = false;
    const isJumpKey = e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyQ' || e.code === 'KeyO' || e.code === 'Digit1' || e.code === 'Numpad1' ||
                      e.key === ' ' || e.key === 'ArrowUp' || e.key === 'q' || e.key === 'Q' || e.key === 'o' || e.key === 'O' || e.key === '1';
    if (isJumpKey) {
        player.jumpTimer = 0;
    }
});

// 支持鼠标点击/触摸屏幕跳跃
canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (isPlaying) player.jump();
});
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (isPlaying) player.jump();
}, {passive: false});

canvas.addEventListener('mouseup', () => {
    player.jumpTimer = 0;
});
canvas.addEventListener('touchend', () => {
    player.jumpTimer = 0;
});

// UI按钮事件
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// 初始渲染背景
drawEnvironment();
