// --- Globals ---
let scene, camera, renderer, controls;
let prevTime = performance.now();

// Game State
let hp = 100;
let score = 0;
let isGameOver = false;

// Movement
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

// Entities
const arenaRadius = 150;
let enemies = [];
let projectiles = [];
let particles = [];
let ammoBox;

// Raycasting (Hitscan & collision)
let raycaster = new THREE.Raycaster();
let shootableObjects = []; // walls, enemies, etc.

// --- Weapon System ---
const weapons = [
    {
        id: 1, name: '突击步枪 (Assault Rifle)', type: 'hitscan', 
        fireRate: 120, damage: 30, spread: 0.02,
        mag: 30, maxMag: 30, reserve: 120, maxReserve: 120, reloadTime: 1500,
        color: 0x555555, width: 0.2, height: 0.3, depth: 1.2
    },
    {
        id: 2, name: '冲锋枪 (SMG)', type: 'hitscan', 
        fireRate: 60, damage: 15, spread: 0.06,
        mag: 40, maxMag: 40, reserve: 200, maxReserve: 200, reloadTime: 1200,
        color: 0x888888, width: 0.15, height: 0.25, depth: 0.8
    },
    {
        id: 3, name: '狙击枪 (Sniper Rifle)', type: 'hitscan', 
        fireRate: 1200, damage: 120, spread: 0.0,
        mag: 5, maxMag: 5, reserve: 25, maxReserve: 25, reloadTime: 2500,
        color: 0x222222, width: 0.15, height: 0.2, depth: 2.0
    },
    {
        id: 4, name: '火箭发射器 (Rocket Launcher)', type: 'projectile', 
        fireRate: 1500, damage: 150, spread: 0.0,
        mag: 1, maxMag: 1, reserve: 10, maxReserve: 10, reloadTime: 2000,
        color: 0x005500, width: 0.4, height: 0.4, depth: 1.5
    }
];

let currentWeaponIndex = 0;
let lastFireTime = 0;
let isReloading = false;
let isMouseDown = false;
let isZoomed = false;
let gunMesh;

// --- DOM Elements ---
const uiHp = document.getElementById('ui-hp');
const uiWeapon = document.getElementById('ui-weapon');
const uiAmmo = document.getElementById('ui-ammo');
const uiScore = document.getElementById('ui-score');
const menu = document.getElementById('menu');
const hud = document.getElementById('hud');
const hitMarker = document.getElementById('hit-marker');
const dmgOverlay = document.getElementById('damage-overlay');
const sniperOverlay = document.getElementById('sniper-overlay');
const crosshair = document.getElementById('crosshair');

// --- Initialization ---
init();
animate();

function init() {
    // 1. Scene & Camera
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.005);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 10;

    // 2. Lighting
    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    ambientLight.position.set(0, 200, 0);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(100, 200, 50);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // 4. Controls
    controls = new THREE.PointerLockControls(camera, document.body);

    document.getElementById('play-btn').addEventListener('click', () => {
        if(isGameOver) resetGame();
        controls.lock();
    });

    controls.addEventListener('lock', () => {
        menu.style.display = 'none';
        hud.style.display = 'block';
    });

    controls.addEventListener('unlock', () => {
        menu.style.display = 'flex';
        hud.style.display = 'none';
        isMouseDown = false;
        if(isZoomed) toggleZoom();
    });

    scene.add(controls.getObject());

    // 5. Environment
    buildCircularArena();
    createAmmoBox();
    createGunModel();
    updateUI();

    // 6. Enemies
    for(let i=0; i<8; i++) spawnEnemy();

    // 7. Event Listeners
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', onWindowResize);
}

// --- Environment Construction ---
function buildCircularArena() {
    // Floor
    const floorGeo = new THREE.CylinderGeometry(arenaRadius, arenaRadius, 1, 64);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x3a5a3a });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    scene.add(floor);
    shootableObjects.push(floor);

    // Wall
    const wallGeo = new THREE.CylinderGeometry(arenaRadius, arenaRadius, 100, 64, 1, true);
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x555555, side: THREE.BackSide });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.y = 50;
    scene.add(wall);
    shootableObjects.push(wall);
    
    // Dome (Sky)
    const domeGeo = new THREE.SphereGeometry(arenaRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshBasicMaterial({ color: 0x66aaff, side: THREE.BackSide, transparent: true, opacity: 0.3 });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 100;
    scene.add(dome);
}

function createAmmoBox() {
    // Infinite Ammo Box in the center
    const boxGeo = new THREE.BoxGeometry(4, 4, 4);
    const boxMat = new THREE.MeshLambertMaterial({ color: 0x00ff00, emissive: 0x004400 });
    ammoBox = new THREE.Mesh(boxGeo, boxMat);
    ammoBox.position.set(0, 2, 0);
    scene.add(ammoBox);

    const boxLight = new THREE.PointLight(0x00ff00, 1.5, 30);
    boxLight.position.set(0, 6, 0);
    scene.add(boxLight);
}

function createGunModel() {
    if (gunMesh) camera.remove(gunMesh);
    const w = weapons[currentWeaponIndex];
    
    const geo = new THREE.BoxGeometry(w.width, w.height, w.depth);
    const mat = new THREE.MeshLambertMaterial({ color: w.color });
    gunMesh = new THREE.Mesh(geo, mat);
    gunMesh.position.set(0.4, -0.3, -0.8);
    
    // hide gun if zoomed
    if(isZoomed) gunMesh.visible = false;
    
    camera.add(gunMesh);
}

// --- Input Handling ---
function onKeyDown(e) {
    if(!controls.isLocked) return;
    switch(e.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': if(canJump) velocity.y += 120; canJump = false; break;
        case 'Digit1': switchWeapon(0); break;
        case 'Digit2': switchWeapon(1); break;
        case 'Digit3': switchWeapon(2); break;
        case 'Digit4': switchWeapon(3); break;
        case 'KeyR': reload(); break;
    }
}

function onKeyUp(e) {
    switch(e.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyD': moveRight = false; break;
    }
}

function onMouseDown(e) {
    if(!controls.isLocked) return;
    if(e.button === 0) isMouseDown = true;
    if(e.button === 2 && weapons[currentWeaponIndex].id === 3) toggleZoom(); // Sniper right click
}

function onMouseUp(e) {
    if(e.button === 0) isMouseDown = false;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Weapon Logic ---
function switchWeapon(idx) {
    if(currentWeaponIndex === idx || isReloading) return;
    currentWeaponIndex = idx;
    if(isZoomed) toggleZoom(); // unzoom when switching
    createGunModel();
    updateUI();
}

function toggleZoom() {
    isZoomed = !isZoomed;
    camera.fov = isZoomed ? 20 : 75;
    camera.updateProjectionMatrix();
    sniperOverlay.style.display = isZoomed ? 'block' : 'none';
    crosshair.style.display = isZoomed ? 'none' : 'block';
    if(gunMesh) gunMesh.visible = !isZoomed;
}

function reload() {
    const w = weapons[currentWeaponIndex];
    if(isReloading || w.mag === w.maxMag || w.reserve <= 0) return;
    
    isReloading = true;
    uiAmmo.innerText = "Reloading...";
    uiAmmo.style.color = "#ffaa00";
    
    // Unzoom if sniper
    if(isZoomed) toggleZoom();
    
    // Gun animation
    if(gunMesh) {
        gunMesh.rotation.x = -Math.PI / 4;
        gunMesh.position.y = -0.5;
    }

    setTimeout(() => {
        const needed = w.maxMag - w.mag;
        const take = Math.min(needed, w.reserve);
        w.mag += take;
        w.reserve -= take;
        isReloading = false;
        uiAmmo.style.color = "white";
        if(gunMesh) {
            gunMesh.rotation.x = 0;
            gunMesh.position.y = -0.3;
        }
        updateUI();
    }, w.reloadTime);
}

function fireWeapon() {
    const w = weapons[currentWeaponIndex];
    const now = performance.now();
    
    if(isReloading) return;
    if(now - lastFireTime < w.fireRate) return;
    
    if(w.mag <= 0) {
        reload();
        return;
    }
    
    w.mag--;
    lastFireTime = now;
    updateUI();
    
    // Recoil
    if(!isZoomed && gunMesh) {
        gunMesh.position.z = -0.6;
        setTimeout(() => { if(gunMesh) gunMesh.position.z = -0.8; }, 50);
    }
    
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    
    // Apply spread
    if(w.spread > 0 && !isZoomed) {
        dir.x += (Math.random() - 0.5) * w.spread;
        dir.y += (Math.random() - 0.5) * w.spread;
        dir.z += (Math.random() - 0.5) * w.spread;
        dir.normalize();
    }

    if(w.type === 'hitscan') {
        raycaster.set(camera.getWorldPosition(new THREE.Vector3()), dir);
        const intersects = raycaster.intersectObjects(shootableObjects);
        
        if(intersects.length > 0) {
            const hit = intersects[0];
            createHitParticle(hit.point, 0xffffbb);
            
            if(hit.object.isEnemy) {
                damageEnemy(hit.object, w.damage);
                showHitMarker();
            }
        }
    } else if(w.type === 'projectile') {
        // Rocket
        const pGeo = new THREE.SphereGeometry(0.5, 8, 8);
        const pMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const rocket = new THREE.Mesh(pGeo, pMat);
        rocket.position.copy(camera.getWorldPosition(new THREE.Vector3()));
        rocket.velocity = dir.multiplyScalar(120); // rocket speed
        rocket.damage = w.damage;
        scene.add(rocket);
        projectiles.push(rocket);
    }
}

function createHitParticle(pos, color) {
    const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const mat = new THREE.MeshBasicMaterial({ color: color });
    const p = new THREE.Mesh(geo, mat);
    p.position.copy(pos);
    p.life = 10;
    scene.add(p);
    particles.push(p);
}

function createExplosion(pos, color, count, radiusMultiplier = 1) {
    for(let i=0; i<count; i++) {
        const geo = new THREE.BoxGeometry(0.5*radiusMultiplier, 0.5*radiusMultiplier, 0.5*radiusMultiplier);
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(pos);
        p.velocity = new THREE.Vector3(
            (Math.random()-0.5)*80,
            (Math.random()-0.5)*80,
            (Math.random()-0.5)*80
        );
        p.life = 20 + Math.random() * 20;
        scene.add(p);
        particles.push(p);
    }
}

function showHitMarker() {
    hitMarker.style.opacity = 1;
    setTimeout(() => { hitMarker.style.opacity = 0; }, 100);
}

// --- Enemy Logic ---
function spawnEnemy() {
    const size = 3 + Math.random() * 2;
    const geo = new THREE.BoxGeometry(size, size*2, size);
    const mat = new THREE.MeshLambertMaterial({ color: 0xff3333 });
    const enemy = new THREE.Mesh(geo, mat);
    
    const angle = Math.random() * Math.PI * 2;
    const r = arenaRadius - 15;
    enemy.position.set(Math.cos(angle)*r, size, Math.sin(angle)*r);
    
    enemy.isEnemy = true;
    enemy.hp = 100;
    enemy.maxHp = 100;
    enemy.speed = 10 + Math.random() * 15;
    
    scene.add(enemy);
    enemies.push(enemy);
    shootableObjects.push(enemy);
}

function damageEnemy(enemy, amount) {
    if(enemy.isDead) return;
    enemy.hp -= amount;
    
    // Flash white
    enemy.material.color.setHex(0xffffff);
    setTimeout(() => {
        if(!enemy.isDead) enemy.material.color.setHex(0xff3333);
    }, 100);
    
    if(enemy.hp <= 0) {
        enemy.isDead = true;
        scene.remove(enemy);
        enemies.splice(enemies.indexOf(enemy), 1);
        shootableObjects.splice(shootableObjects.indexOf(enemy), 1);
        
        score += 1;
        updateUI();
        createExplosion(enemy.position, 0xff0000, 30);
        
        setTimeout(spawnEnemy, 2000); // Respawn after 2s
    }
}

// --- Player Logic ---
function takeDamage(amount) {
    hp -= amount;
    updateUI();
    
    // Screen flash
    dmgOverlay.style.opacity = 1;
    setTimeout(() => { dmgOverlay.style.opacity = 0; }, 200);
    
    if(hp <= 0) {
        isGameOver = true;
        controls.unlock();
        document.getElementById('menu').querySelector('h1').innerText = "Game Over!";
        document.getElementById('menu').querySelector('p').innerText = `最终击杀: ${score}`;
        document.getElementById('play-btn').innerText = "重新开始";
    }
}

function checkAmmoBoxDistance() {
    const playerPos = controls.getObject().position;
    // Ammo box rotation
    ammoBox.rotation.y += 0.02;
    ammoBox.rotation.x += 0.01;
    
    if(playerPos.distanceTo(ammoBox.position) < 12) {
        let refilled = false;
        weapons.forEach(w => {
            if(w.reserve < w.maxReserve) {
                w.reserve = w.maxReserve;
                refilled = true;
            }
        });
        if(refilled) {
            updateUI();
            ammoBox.scale.set(1.5, 1.5, 1.5);
            setTimeout(() => ammoBox.scale.set(1, 1, 1), 150);
        }
    }
}

function updateUI() {
    if(isReloading) return; // handled by reload
    const w = weapons[currentWeaponIndex];
    uiHp.innerText = Math.floor(Math.max(0, hp));
    uiWeapon.innerText = w.name;
    uiAmmo.innerText = `${w.mag} / ${w.reserve}`;
    uiScore.innerText = score;
}

function resetGame() {
    hp = 100;
    score = 0;
    isGameOver = false;
    weapons.forEach(w => { w.mag = w.maxMag; w.reserve = w.maxReserve; });
    controls.getObject().position.set(0, 10, 0);
    
    // Clear enemies
    [...enemies].forEach(e => {
        scene.remove(e);
        shootableObjects.splice(shootableObjects.indexOf(e), 1);
    });
    enemies = [];
    for(let i=0; i<8; i++) spawnEnemy();
    
    document.getElementById('menu').querySelector('h1').innerText = "3D 立体圆形竞技场";
    document.getElementById('menu').querySelector('p').innerText = "W, A, S, D = 移动 | 鼠标 = 视角/射击";
    updateUI();
}

// --- Main Loop ---
function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const delta = (now - prevTime) / 1000;
    prevTime = now;

    if (controls.isLocked && !isGameOver) {
        // 1. Shooting
        if(isMouseDown) fireWeapon();
        
        // 2. Ammo Box
        checkAmmoBoxDistance();

        // 3. Player Physics (WASD + Jump + Circular bounds)
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 60.0 * delta; // Gravity

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        const speed = 250.0;
        if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
        controls.getObject().position.y += (velocity.y * delta);

        if (controls.getObject().position.y < 10) {
            velocity.y = 0;
            controls.getObject().position.y = 10;
            canJump = true;
        }

        // Circular boundary constraint
        const pos = controls.getObject().position;
        const distFromCenter = Math.sqrt(pos.x*pos.x + pos.z*pos.z);
        if(distFromCenter > arenaRadius - 5) {
            const angle = Math.atan2(pos.z, pos.x);
            pos.x = Math.cos(angle) * (arenaRadius - 5);
            pos.z = Math.sin(angle) * (arenaRadius - 5);
        }

        // 4. Enemy AI
        enemies.forEach(enemy => {
            const dir = new THREE.Vector3();
            dir.subVectors(pos, enemy.position);
            dir.y = 0; // Don't fly
            const dist = dir.length();
            dir.normalize();
            
            // Move towards player
            enemy.position.addScaledVector(dir, enemy.speed * delta);
            enemy.lookAt(pos.x, enemy.position.y, pos.z);
            
            // Attack player
            if(dist < 5) {
                takeDamage(20 * delta);
            }
        });

        // 5. Projectiles (Rockets)
        for(let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            p.position.addScaledVector(p.velocity, delta);
            
            let hit = false;
            if(p.position.y <= 0) hit = true; // hit floor
            if(Math.sqrt(p.position.x*p.position.x + p.position.z*p.position.z) > arenaRadius) hit = true; // hit wall
            
            enemies.forEach(e => {
                if(!hit && p.position.distanceTo(e.position) < 5) hit = true;
            });
            
            if(hit) {
                // AoE Explosion
                [...enemies].forEach(e => {
                    if(p.position.distanceTo(e.position) < 25) { // Explosion radius 25
                        damageEnemy(e, p.damage);
                        showHitMarker();
                    }
                });
                createExplosion(p.position, 0xffaa00, 60, 2); // Big explosion
                scene.remove(p);
                projectiles.splice(i, 1);
            }
        }

        // 6. Particles
        for(let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= 1;
            if(p.velocity) p.position.addScaledVector(p.velocity, delta);
            if(p.life <= 0) {
                scene.remove(p);
                particles.splice(i, 1);
            }
        }
    }

    renderer.render(scene, camera);
}