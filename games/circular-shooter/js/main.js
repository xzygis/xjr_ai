// globals
let scene, camera, renderer, controls;
let objects = [];
let raycaster;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let prevTime = performance.now();

let score = 0;
let hp = 100;
let enemies = [];
let projectiles = [];
let particles = [];
let ammoBox;
let arenaRadius = 150;

// Weapons Configuration
const weapons = [
    { id: 1, name: 'Assault Rifle (突击步枪)', type: 'hitscan', fireRate: 120, damage: 25, mag: 30, maxMag: 30, reserve: 120, maxReserve: 120, reloadTime: 1500, spread: 0.015, modelColor: 0x555555 },
    { id: 2, name: 'SMG (冲锋枪)', type: 'hitscan', fireRate: 60, damage: 12, mag: 40, maxMag: 40, reserve: 200, maxReserve: 200, reloadTime: 1200, spread: 0.06, modelColor: 0x888888 },
    { id: 3, name: 'Sniper Rifle (狙击枪)', type: 'hitscan', fireRate: 1000, damage: 100, mag: 5, maxMag: 5, reserve: 25, maxReserve: 25, reloadTime: 2500, spread: 0.0, modelColor: 0x222222 },
    { id: 4, name: 'Rocket Launcher (火箭发射器)', type: 'projectile', fireRate: 1500, damage: 150, mag: 1, maxMag: 1, reserve: 10, maxReserve: 10, reloadTime: 2000, spread: 0.0, modelColor: 0x005500 }
];

let currentWeaponIndex = 0;
let isReloading = false;
let lastFireTime = 0;
let isZoomed = false;
let isMouseDown = false;

// DOM Elements
const uiAmmo = document.getElementById('ammo');
const uiWeapon = document.getElementById('weapon-name');
const uiHp = document.getElementById('hp');
const uiScore = document.getElementById('score');
const instructions = document.getElementById('instructions');
const ui = document.getElementById('ui');
const crosshair = document.getElementById('crosshair');
const scoreBoard = document.getElementById('score-board');
const hitMarker = document.getElementById('hit-marker');

// Gun model in hand
let gunMesh;

init();
animate();

function init() {
    // Setup Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.005);

    // Setup Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 10;

    // Setup Lighting
    const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
    light.position.set(0.5, 1, 0.75);
    scene.add(light);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(0, 50, 0);
    scene.add(dirLight);

    // Setup Controls
    controls = new THREE.PointerLockControls(camera, document.body);

    instructions.addEventListener('click', () => {
        controls.lock();
    });

    controls.addEventListener('lock', () => {
        instructions.style.display = 'none';
        ui.style.display = 'block';
        crosshair.style.display = 'block';
        scoreBoard.style.display = 'block';
    });

    controls.addEventListener('unlock', () => {
        instructions.style.display = 'block';
        ui.style.display = 'none';
        crosshair.style.display = 'none';
        scoreBoard.style.display = 'none';
        isMouseDown = false;
    });

    scene.add(controls.getObject());

    // Setup Event Listeners
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);

    raycaster = new THREE.Raycaster();

    // Setup Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    window.addEventListener('resize', onWindowResize);

    // Build Circular 3D Arena
    buildArena();
    
    // Create Gun Model
    createGunModel();

    // Create Infinite Ammo Box
    createAmmoBox();
    
    // Spawn initial enemies
    for(let i=0; i<5; i++) spawnEnemy();
    
    updateUI();
}

function buildArena() {
    // Ground - Circular
    const floorGeometry = new THREE.CylinderGeometry(arenaRadius, arenaRadius, 1, 64);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x335533 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = -0.5;
    scene.add(floor);
    objects.push(floor);

    // Grid helper on floor
    const grid = new THREE.GridHelper(arenaRadius * 2, 40, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    // Wall - Circular Cylinder
    const wallGeometry = new THREE.CylinderGeometry(arenaRadius, arenaRadius, 100, 64, 1, true);
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x888888, side: THREE.BackSide });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.y = 50;
    scene.add(wall);
    objects.push(wall);
    
    // Dome - Spherical top
    const domeGeometry = new THREE.SphereGeometry(arenaRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMaterial = new THREE.MeshBasicMaterial({ color: 0x6699ff, side: THREE.BackSide, transparent: true, opacity: 0.5 });
    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
    dome.position.y = 100;
    scene.add(dome);
}

function createGunModel() {
    if(gunMesh) camera.remove(gunMesh);
    const weapon = weapons[currentWeaponIndex];
    
    let w, h, d;
    if(weapon.id === 1) { w = 0.2; h = 0.3; d = 1.2; } // Assault
    else if(weapon.id === 2) { w = 0.15; h = 0.25; d = 0.8; } // SMG
    else if(weapon.id === 3) { w = 0.15; h = 0.2; d = 2.0; } // Sniper
    else { w = 0.4; h = 0.4; d = 1.5; } // Rocket

    const geometry = new THREE.BoxGeometry(w, h, d);
    const material = new THREE.MeshLambertMaterial({ color: weapon.modelColor });
    gunMesh = new THREE.Mesh(geometry, material);
    
    // Position gun in bottom right of view
    gunMesh.position.set(0.5, -0.4, -0.8);
    camera.add(gunMesh);
}

function createAmmoBox() {
    const geom = new THREE.BoxGeometry(4, 4, 4);
    const mat = new THREE.MeshLambertMaterial({ color: 0x00ff00, emissive: 0x005500 });
    ammoBox = new THREE.Mesh(geom, mat);
    ammoBox.position.set(0, 2, 0); // Center of arena
    scene.add(ammoBox);
    
    // Add point light
    const light = new THREE.PointLight(0x00ff00, 1, 20);
    light.position.set(0, 5, 0);
    scene.add(light);
}

function spawnEnemy() {
    const size = 3 + Math.random() * 3;
    const geom = new THREE.SphereGeometry(size, 16, 16);
    const mat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const enemy = new THREE.Mesh(geom, mat);
    
    // Spawn at edge
    const angle = Math.random() * Math.PI * 2;
    const radius = arenaRadius - 10;
    enemy.position.set(Math.cos(angle) * radius, size, Math.sin(angle) * radius);
    
    enemy.hp = 100;
    enemy.maxHp = 100;
    
    scene.add(enemy);
    enemies.push(enemy);
    objects.push(enemy);
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space':
            if (canJump) velocity.y += 150;
            canJump = false;
            break;
        case 'Digit1': switchWeapon(0); break;
        case 'Digit2': switchWeapon(1); break;
        case 'Digit3': switchWeapon(2); break;
        case 'Digit4': switchWeapon(3); break;
        case 'KeyR': reload(); break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyD': moveRight = false; break;
    }
}

function onMouseDown(event) {
    if (!controls.isLocked) return;
    if (event.button === 0) {
        isMouseDown = true;
    } else if (event.button === 2 && weapons[currentWeaponIndex].id === 3) {
        // Zoom for sniper
        isZoomed = !isZoomed;
        camera.fov = isZoomed ? 20 : 75;
        camera.updateProjectionMatrix();
    }
}

function onMouseUp(event) {
    if (event.button === 0) isMouseDown = false;
}

function switchWeapon(index) {
    if (index === currentWeaponIndex || isReloading) return;
    currentWeaponIndex = index;
    isZoomed = false;
    camera.fov = 75;
    camera.updateProjectionMatrix();
    createGunModel();
    updateUI();
}

function reload() {
    const weapon = weapons[currentWeaponIndex];
    if (isReloading || weapon.mag === weapon.maxMag || weapon.reserve <= 0) return;
    
    isReloading = true;
    uiAmmo.innerText = "Reloading...";
    
    setTimeout(() => {
        const needed = weapon.maxMag - weapon.mag;
        const available = Math.min(needed, weapon.reserve);
        weapon.mag += available;
        weapon.reserve -= available;
        isReloading = false;
        updateUI();
    }, weapon.reloadTime);
}

function fireWeapon() {
    const weapon = weapons[currentWeaponIndex];
    const now = performance.now();
    
    if (isReloading) return;
    if (now - lastFireTime < weapon.fireRate) return;
    
    if (weapon.mag <= 0) {
        reload();
        return;
    }
    
    weapon.mag--;
    lastFireTime = now;
    updateUI();
    
    // Gun recoil animation
    gunMesh.position.z = -0.6;
    setTimeout(() => { if(gunMesh) gunMesh.position.z = -0.8; }, 50);
    
    // Calculate spread direction
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    
    if(weapon.spread > 0) {
        dir.x += (Math.random() - 0.5) * weapon.spread;
        dir.y += (Math.random() - 0.5) * weapon.spread;
        dir.z += (Math.random() - 0.5) * weapon.spread;
        dir.normalize();
    }

    if (weapon.type === 'hitscan') {
        raycaster.set(camera.getWorldPosition(new THREE.Vector3()), dir);
        const intersects = raycaster.intersectObjects(objects);
        
        if (intersects.length > 0) {
            const hit = intersects[0];
            createHitParticle(hit.point, 0xffff00);
            
            if (enemies.includes(hit.object)) {
                damageEnemy(hit.object, weapon.damage);
                showHitMarker();
            }
        }
    } else if (weapon.type === 'projectile') {
        // Rocket Launcher
        const geom = new THREE.SphereGeometry(0.5, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const rocket = new THREE.Mesh(geom, mat);
        rocket.position.copy(camera.getWorldPosition(new THREE.Vector3()));
        rocket.velocity = dir.multiplyScalar(100); // speed
        rocket.damage = weapon.damage;
        scene.add(rocket);
        projectiles.push(rocket);
    }
}

function damageEnemy(enemy, amount) {
    if (enemy.isDead) return;
    enemy.hp -= amount;
    // Flash white
    enemy.material.color.setHex(0xffffff);
    setTimeout(() => {
        if(enemy && enemy.material && !enemy.isDead) enemy.material.color.setHex(0xff0000);
    }, 100);
    
    if (enemy.hp <= 0) {
        enemy.isDead = true;
        scene.remove(enemy);
        const objIdx = objects.indexOf(enemy);
        if (objIdx > -1) objects.splice(objIdx, 1);
        const enIdx = enemies.indexOf(enemy);
        if (enIdx > -1) enemies.splice(enIdx, 1);
        score += 10;
        updateUI();
        createExplosion(enemy.position, 0xff0000, 20);
        setTimeout(spawnEnemy, 2000); // Respawn
    }
}

function showHitMarker() {
    hitMarker.style.opacity = 1;
    setTimeout(() => hitMarker.style.opacity = 0, 100);
}

function createHitParticle(pos, color) {
    const geom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const mat = new THREE.MeshBasicMaterial({ color: color });
    const p = new THREE.Mesh(geom, mat);
    p.position.copy(pos);
    p.life = 10;
    scene.add(p);
    particles.push(p);
}

function createExplosion(pos, color, count) {
    for(let i=0; i<count; i++) {
        const geom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const p = new THREE.Mesh(geom, mat);
        p.position.copy(pos);
        p.velocity = new THREE.Vector3(
            (Math.random()-0.5)*50,
            (Math.random()-0.5)*50,
            (Math.random()-0.5)*50
        );
        p.life = 30 + Math.random() * 20;
        scene.add(p);
        particles.push(p);
    }
}

function updateUI() {
    const w = weapons[currentWeaponIndex];
    uiWeapon.innerText = w.name;
    uiAmmo.innerText = `${w.mag} / ${w.reserve}`;
    uiHp.innerText = Math.floor(hp);
    uiScore.innerText = score;
}

function checkAmmoBox() {
    const playerPos = controls.getObject().position;
    const dist = playerPos.distanceTo(ammoBox.position);
    
    // Rotate box
    ammoBox.rotation.y += 0.01;
    ammoBox.rotation.x += 0.01;
    
    if (dist < 10) {
        // Refill all ammo
        let refilled = false;
        weapons.forEach(w => {
            if (w.reserve < w.maxReserve) {
                w.reserve = w.maxReserve;
                refilled = true;
            }
        });
        if (refilled) {
            updateUI();
            // visual effect
            ammoBox.scale.set(1.5, 1.5, 1.5);
            setTimeout(() => ammoBox.scale.set(1, 1, 1), 200);
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const delta = (now - prevTime) / 1000;
    prevTime = now;

    if (controls.isLocked === true) {
        // Handle Shooting
        if (isMouseDown) fireWeapon();
        
        // Handle Infinite Ammo Box
        checkAmmoBox();

        // Player Physics & Movement
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 50.0 * delta; // 100.0 = mass

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        const speed = 200.0;
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
        
        // Keep player inside arena
        const pos = controls.getObject().position;
        const distFromCenter = Math.sqrt(pos.x*pos.x + pos.z*pos.z);
        if(distFromCenter > arenaRadius - 5) {
            const angle = Math.atan2(pos.z, pos.x);
            pos.x = Math.cos(angle) * (arenaRadius - 5);
            pos.z = Math.sin(angle) * (arenaRadius - 5);
        }

        // Enemy Logic
        enemies.forEach(enemy => {
            // Move towards player
            const dir = new THREE.Vector3();
            dir.subVectors(pos, enemy.position).normalize();
            
            // simple collision avoidance between enemies could be added here
            
            enemy.position.addScaledVector(dir, 10 * delta); // speed 10
            
            // Damage player
            if (enemy.position.distanceTo(pos) < 5) {
                hp -= 20 * delta;
                updateUI();
                if (hp <= 0) {
                    controls.unlock();
                    alert("Game Over! Score: " + score);
                    hp = 100;
                    score = 0;
                    weapons.forEach(w => { w.mag = w.maxMag; w.reserve = w.maxReserve; });
                    pos.set(0, 10, 0);
                    updateUI();
                }
            }
        });
        
        // Projectiles Logic (Rockets)
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            p.position.addScaledVector(p.velocity, delta);
            
            let hit = false;
            // check floor
            if (p.position.y < 0) hit = true;
            // check wall
            if (Math.sqrt(p.position.x*p.position.x + p.position.z*p.position.z) > arenaRadius) hit = true;
            // check enemies
            enemies.forEach(e => {
                if (p.position.distanceTo(e.position) < e.geometry.parameters.radius + 1) hit = true;
            });
            
            if (hit) {
                // Area damage
                [...enemies].forEach(e => {
                    if (p.position.distanceTo(e.position) < 20) { // explosion radius
                        damageEnemy(e, p.damage);
                        showHitMarker();
                    }
                });
                createExplosion(p.position, 0xffaa00, 50);
                scene.remove(p);
                projectiles.splice(i, 1);
            }
        }
        
        // Particles Logic
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= 1;
            if(p.velocity) p.position.addScaledVector(p.velocity, delta);
            if (p.life <= 0) {
                scene.remove(p);
                particles.splice(i, 1);
            }
        }
    }

    renderer.render(scene, camera);
}