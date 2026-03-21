const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Game State & Config ---
const keys = {};
const mouse = { x: canvas.width / 2, y: canvas.height / 2, down: false };

let gameActive = false;
let score = 0;
let lastTime = 0;
let spawnTimer = 0;
let itemSpawnTimer = 0;

let player;
let bullets = [];
let enemies = [];
let items = [];
let particles = [];
let floatingTexts = [];

// --- Input Handling ---
window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (gameActive && ['1', '2', '3', '4'].includes(e.key)) {
        player.switchWeapon(parseInt(e.key) - 1);
    }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener('mousedown', () => mouse.down = true);
window.addEventListener('mouseup', () => mouse.down = false);

// --- Weapons Data ---
const WEAPONS = [
    { name: '手枪', type: 'pistol', fireRate: 300, damage: 25, speed: 10, spread: 0.05, auto: false, color: '#f1c40f', maxAmmo: Infinity, size: 4 },
    { name: '冲锋枪', type: 'smg', fireRate: 80, damage: 10, speed: 12, spread: 0.15, auto: true, color: '#e67e22', maxAmmo: 120, size: 3 },
    { name: '突击步枪', type: 'ar', fireRate: 150, damage: 20, speed: 15, spread: 0.03, auto: true, color: '#3498db', maxAmmo: 90, size: 4 },
    { name: '狙击枪', type: 'sniper', fireRate: 1000, damage: 150, speed: 25, spread: 0, auto: false, color: '#9b59b6', maxAmmo: 20, size: 6, penetrate: true }
];

// --- Classes ---
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.color = '#2ecc71';
        this.speed = 4;
        this.maxHealth = 100;
        this.health = 100;
        this.shield = 0;
        this.maxShield = 100;
        this.armorLevel = 0; // 0 = normal, 1 = heavy armor
        
        this.weapons = WEAPONS.map(w => ({ ...w, currentAmmo: w.maxAmmo }));
        this.currentWeaponIndex = 0;
        this.lastFired = 0;
        this.canFireSemi = true; // For non-auto weapons
        
        this.infiniteAmmoTimer = 0;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Draw Shield
        if (this.shield > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 5 + Math.sin(Date.now() / 100) * 2, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(52, 152, 219, ${this.shield / this.maxShield})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Draw Armor Indicator
        if (this.armorLevel > 0) {
            ctx.beginPath();
            ctx.rect(-this.radius - 2, -this.radius - 2, this.radius * 2 + 4, this.radius * 2 + 4);
            ctx.strokeStyle = '#7f8c8d';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Rotate towards mouse
        const angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
        ctx.rotate(angle);

        // Draw Player Body
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw Gun Barrel
        ctx.beginPath();
        const gunLength = this.currentWeaponIndex === 3 ? 25 : (this.currentWeaponIndex === 2 ? 20 : 15);
        ctx.rect(0, -4, gunLength, 8);
        ctx.fillStyle = '#95a5a6';
        ctx.fill();
        ctx.stroke();

        // Laser Sight for Sniper
        if (this.currentWeaponIndex === 3) {
            ctx.beginPath();
            ctx.moveTo(gunLength, 0);
            ctx.lineTo(2000, 0);
            ctx.strokeStyle = 'rgba(231, 76, 60, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.restore();
    }

    update(dt) {
        // Movement
        let dx = 0;
        let dy = 0;
        if (keys['w'] || keys['arrowup']) dy -= 1;
        if (keys['s'] || keys['arrowdown']) dy += 1;
        if (keys['a'] || keys['arrowleft']) dx -= 1;
        if (keys['d'] || keys['arrowright']) dx += 1;

        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }

        this.x += dx * this.speed * (dt / 16.66);
        this.y += dy * this.speed * (dt / 16.66);

        // Constrain to bounds
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

        // Buffs update
        if (this.infiniteAmmoTimer > 0) {
            this.infiniteAmmoTimer -= dt;
            if (this.infiniteAmmoTimer <= 0) {
                this.infiniteAmmoTimer = 0;
                updateBuffUI();
            }
        }

        // Shooting
        if (!mouse.down) {
            this.canFireSemi = true;
        }

        if (mouse.down) {
            const weapon = this.weapons[this.currentWeaponIndex];
            if (Date.now() - this.lastFired > weapon.fireRate) {
                if (weapon.auto || this.canFireSemi) {
                    this.fire(weapon);
                    this.lastFired = Date.now();
                    this.canFireSemi = false;
                }
            }
        }
    }

    fire(weapon) {
        if (weapon.currentAmmo <= 0 && weapon.currentAmmo !== Infinity && this.infiniteAmmoTimer <= 0) {
            // Out of ammo effect (dry fire sound/text)
            return;
        }

        if (weapon.currentAmmo !== Infinity && this.infiniteAmmoTimer <= 0) {
            weapon.currentAmmo--;
        }

        const angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
        const spread = (Math.random() - 0.5) * weapon.spread;
        const finalAngle = angle + spread;

        const velocity = {
            x: Math.cos(finalAngle) * weapon.speed,
            y: Math.sin(finalAngle) * weapon.speed
        };

        const gunLength = weapon.type === 'sniper' ? 25 : (weapon.type === 'ar' ? 20 : 15);
        const spawnX = this.x + Math.cos(angle) * gunLength;
        const spawnY = this.y + Math.sin(angle) * gunLength;

        bullets.push(new Bullet(spawnX, spawnY, velocity, weapon.color, weapon.size, weapon.damage, weapon.penetrate));
        
        // Recoil effect particle
        for (let i=0; i<3; i++) {
            particles.push(new Particle(spawnX, spawnY, {x: (Math.random()-0.5)*2, y: (Math.random()-0.5)*2}, '#f1c40f', 2, 0.5));
        }

        updateWeaponUI();
    }

    switchWeapon(index) {
        if (index >= 0 && index < this.weapons.length) {
            this.currentWeaponIndex = index;
            updateWeaponUI();
        }
    }

    takeDamage(amount) {
        // Apply Heavy Armor reduction
        if (this.armorLevel > 0) {
            amount *= 0.5; // 50% damage reduction
        }

        if (this.shield > 0) {
            this.shield -= amount;
            if (this.shield < 0) {
                this.health += this.shield; // remaining damage to health
                this.shield = 0;
            }
        } else {
            this.health -= amount;
        }

        updateHealthUI();
        
        // Blood particles
        for (let i=0; i<5; i++) {
            particles.push(new Particle(this.x, this.y, {x: (Math.random()-0.5)*5, y: (Math.random()-0.5)*5}, '#e74c3c', 3, 0.8));
        }

        if (this.health <= 0) {
            gameOver();
        }
    }
}

class Bullet {
    constructor(x, y, velocity, color, radius, damage, penetrate = false) {
        this.x = x;
        this.y = y;
        this.velocity = velocity;
        this.color = color;
        this.radius = radius;
        this.damage = damage;
        this.penetrate = penetrate;
        this.hitEnemies = new Set();
        this.markedForDeletion = false;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Trail
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.velocity.x * 2, this.y - this.velocity.y * 2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.radius;
        ctx.stroke();
    }

    update(dt) {
        this.x += this.velocity.x * (dt / 16.66);
        this.y += this.velocity.y * (dt / 16.66);

        // Remove if off screen
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.markedForDeletion = true;
        }
    }
}

class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'basic', 'fast', 'tank'
        
        if (type === 'basic') {
            this.radius = 15;
            this.color = '#e74c3c';
            this.speed = 1.5;
            this.health = 40;
            this.damage = 10;
        } else if (type === 'fast') {
            this.radius = 10;
            this.color = '#f39c12';
            this.speed = 3;
            this.health = 20;
            this.damage = 5;
        } else if (type === 'tank') {
            this.radius = 25;
            this.color = '#8e44ad';
            this.speed = 0.8;
            this.health = 150;
            this.damage = 25;
        }
        
        this.maxHealth = this.health;
        this.markedForDeletion = false;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.radius/2, -this.radius/3, 3, 0, Math.PI*2);
        ctx.arc(this.radius/2, this.radius/3, 3, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();

        // Health bar
        if (this.health < this.maxHealth) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 15, this.y - this.radius - 10, 30, 4);
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(this.x - 15, this.y - this.radius - 10, 30 * (this.health / this.maxHealth), 4);
        }
    }

    update(dt) {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed * (dt / 16.66);
        this.y += Math.sin(angle) * this.speed * (dt / 16.66);
    }
}

class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'infinite_ammo', 'shield', 'armor', 'ammo_refill'
        this.radius = 12;
        this.markedForDeletion = false;
        this.floatY = 0;
        this.time = 0;
    }

    draw() {
        this.time += 0.05;
        this.floatY = Math.sin(this.time) * 5;

        ctx.save();
        ctx.translate(this.x, this.y + this.floatY);

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        
        if (this.type === 'infinite_ammo') {
            ctx.fillStyle = '#f1c40f'; // Yellow
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('∞', 0, 0);
        } else if (this.type === 'shield') {
            ctx.fillStyle = '#3498db'; // Blue
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -6);
            ctx.lineTo(5, -2);
            ctx.lineTo(5, 4);
            ctx.lineTo(0, 8);
            ctx.lineTo(-5, 4);
            ctx.lineTo(-5, -2);
            ctx.closePath();
            ctx.stroke();
        } else if (this.type === 'armor') {
            ctx.fillStyle = '#7f8c8d'; // Gray
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(-5, -4, 10, 8);
        } else if (this.type === 'ammo_refill') {
            ctx.fillStyle = '#2ecc71'; // Green
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(-2, -6, 4, 12);
            ctx.fillRect(-6, -2, 12, 4);
        }

        ctx.restore();
    }
}

class Particle {
    constructor(x, y, velocity, color, radius, life) {
        this.x = x;
        this.y = y;
        this.velocity = velocity;
        this.color = color;
        this.radius = radius;
        this.life = life; // seconds
        this.maxLife = life;
        this.markedForDeletion = false;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }

    update(dt) {
        this.x += this.velocity.x * (dt / 16.66);
        this.y += this.velocity.y * (dt / 16.66);
        this.life -= dt / 1000;
        if (this.life <= 0) {
            this.markedForDeletion = true;
        }
    }
}

class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1.0;
        this.velocity = { x: (Math.random()-0.5)*1, y: -2 };
        this.markedForDeletion = false;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }

    update(dt) {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.life -= dt / 1000;
        if (this.life <= 0) {
            this.markedForDeletion = true;
        }
    }
}

// --- Spawning Logic ---
function spawnEnemy() {
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? 0 - 30 : canvas.width + 30;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? 0 - 30 : canvas.height + 30;
    }

    const rand = Math.random();
    let type = 'basic';
    if (score > 10 && rand < 0.3) type = 'fast';
    if (score > 30 && rand < 0.1) type = 'tank';

    enemies.push(new Enemy(x, y, type));
}

function spawnItem() {
    const x = Math.random() * (canvas.width - 100) + 50;
    const y = Math.random() * (canvas.height - 100) + 50;
    
    const types = ['infinite_ammo', 'shield', 'armor', 'ammo_refill'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    items.push(new Item(x, y, type));
}

// --- UI Updates ---
function updateHealthUI() {
    const healthPercent = Math.max(0, (player.health / player.maxHealth) * 100);
    const shieldPercent = Math.max(0, (player.shield / player.maxShield) * 100);
    
    document.getElementById('health-bar').style.width = `${healthPercent}%`;
    document.getElementById('shield-bar').style.width = `${shieldPercent}%`;
    document.getElementById('health-text').innerText = `HP: ${Math.floor(player.health)} ${player.shield > 0 ? '+ ' + Math.floor(player.shield) : ''}`;
    
    const armorStatus = document.getElementById('armor-status');
    if (player.armorLevel > 0) {
        armorStatus.innerText = '重型防弹衣 (减伤50%)';
        armorStatus.style.color = '#7f8c8d';
    } else {
        armorStatus.innerText = '';
    }
}

function updateWeaponUI() {
    const weapon = player.weapons[player.currentWeaponIndex];
    document.getElementById('current-weapon-name').innerText = weapon.name;
    
    if (weapon.currentAmmo === Infinity) {
        document.getElementById('ammo-count').innerText = '∞ / ∞';
    } else {
        let ammoText = `${weapon.currentAmmo} / ${weapon.maxAmmo}`;
        if (player.infiniteAmmoTimer > 0) ammoText += ' (无限)';
        document.getElementById('ammo-count').innerText = ammoText;
    }

    // Update slots
    for (let i = 1; i <= 4; i++) {
        const slot = document.getElementById(`slot-${i}`);
        if (i - 1 === player.currentWeaponIndex) {
            slot.classList.add('active');
        } else {
            slot.classList.remove('active');
        }
    }
}

function updateBuffUI() {
    const container = document.getElementById('buff-container');
    container.innerHTML = '';
    
    if (player.infiniteAmmoTimer > 0) {
        const buff = document.createElement('div');
        buff.className = 'buff';
        buff.innerText = `无限弹药: ${Math.ceil(player.infiniteAmmoTimer / 1000)}s`;
        container.appendChild(buff);
    }
}

function updateScore() {
    document.getElementById('score').innerText = score;
}

// --- Game Loop ---
function init() {
    player = new Player(canvas.width / 2, canvas.height / 2);
    bullets = [];
    enemies = [];
    items = [];
    particles = [];
    floatingTexts = [];
    score = 0;
    
    updateHealthUI();
    updateWeaponUI();
    updateScore();
    updateBuffUI();
    
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.add('hidden');
    
    gameActive = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameActive = false;
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
}

function gameLoop(timestamp) {
    if (!gameActive) return;

    const dt = timestamp - lastTime;
    lastTime = timestamp;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (optional, for aesthetics)
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for(let i=0; i<canvas.height; i+=50) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // Update & Draw Player
    player.update(dt);
    player.draw();

    // Spawn Logic
    spawnTimer += dt;
    const spawnRate = Math.max(500, 2000 - score * 20); // Get faster as score increases
    if (spawnTimer > spawnRate) {
        spawnEnemy();
        spawnTimer = 0;
    }

    itemSpawnTimer += dt;
    if (itemSpawnTimer > 10000) { // Every 10 seconds
        spawnItem();
        itemSpawnTimer = 0;
    }

    // Update Buff UI if active
    if (player.infiniteAmmoTimer > 0) updateBuffUI();

    // Update & Draw Items
    items.forEach(item => {
        item.draw();
        
        // Collision with player
        const dist = Math.hypot(player.x - item.x, player.y - item.y);
        if (dist < player.radius + item.radius) {
            item.markedForDeletion = true;
            
            if (item.type === 'infinite_ammo') {
                player.infiniteAmmoTimer = 10000; // 10 seconds
                floatingTexts.push(new FloatingText(item.x, item.y, "无限弹药!", "#f1c40f"));
                updateBuffUI();
            } else if (item.type === 'shield') {
                player.shield = player.maxShield;
                floatingTexts.push(new FloatingText(item.x, item.y, "满盾!", "#3498db"));
                updateHealthUI();
            } else if (item.type === 'armor') {
                player.armorLevel = 1;
                floatingTexts.push(new FloatingText(item.x, item.y, "重型防弹衣!", "#7f8c8d"));
                updateHealthUI();
            } else if (item.type === 'ammo_refill') {
                player.weapons.forEach(w => {
                    if (w.currentAmmo !== Infinity) w.currentAmmo = w.maxAmmo;
                });
                floatingTexts.push(new FloatingText(item.x, item.y, "弹药补满!", "#2ecc71"));
                updateWeaponUI();
            }
        }
    });

    // Update & Draw Bullets
    bullets.forEach(bullet => {
        bullet.update(dt);
        bullet.draw();
    });

    // Update & Draw Enemies & Collisions
    enemies.forEach(enemy => {
        enemy.update(dt);
        enemy.draw();

        // Collision with player
        const distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (distToPlayer < player.radius + enemy.radius) {
            enemy.markedForDeletion = true;
            player.takeDamage(enemy.damage);
        }

        // Collision with bullets
        bullets.forEach(bullet => {
            if (bullet.markedForDeletion || bullet.hitEnemies.has(enemy)) return;

            const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
            if (dist < bullet.radius + enemy.radius) {
                enemy.health -= bullet.damage;
                
                // Blood particles
                for (let i=0; i<3; i++) {
                    particles.push(new Particle(enemy.x, enemy.y, {x: (Math.random()-0.5)*5, y: (Math.random()-0.5)*5}, enemy.color, 2, 0.3));
                }

                if (!bullet.penetrate) {
                    bullet.markedForDeletion = true;
                } else {
                    bullet.hitEnemies.add(enemy);
                }

                if (enemy.health <= 0 && !enemy.markedForDeletion) {
                    enemy.markedForDeletion = true;
                    score++;
                    updateScore();
                    floatingTexts.push(new FloatingText(enemy.x, enemy.y, `+${bullet.damage}`, "#e74c3c"));
                }
            }
        });
    });

    // Update & Draw Particles
    particles.forEach(p => {
        p.update(dt);
        p.draw();
    });

    // Update & Draw Floating Texts
    floatingTexts.forEach(ft => {
        ft.update(dt);
        ft.draw();
    });

    // Cleanup marked objects
    bullets = bullets.filter(b => !b.markedForDeletion);
    enemies = enemies.filter(e => !e.markedForDeletion);
    items = items.filter(i => !i.markedForDeletion);
    particles = particles.filter(p => !p.markedForDeletion);
    floatingTexts = floatingTexts.filter(ft => !ft.markedForDeletion);

    requestAnimationFrame(gameLoop);
}

document.getElementById('start-btn').addEventListener('click', init);
document.getElementById('restart-btn').addEventListener('click', init);

// Initial draw of the canvas background
ctx.fillStyle = '#1a1a1a';
ctx.fillRect(0, 0, canvas.width, canvas.height);
