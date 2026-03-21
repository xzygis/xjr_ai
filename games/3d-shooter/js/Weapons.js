import * as THREE from 'three';

export class Weapons {
    constructor(scene, camera, controls, objects) {
        this.scene = scene;
        this.camera = camera;
        this.controls = controls;
        this.objects = objects;

        this.raycaster = new THREE.Raycaster();
        
        // List of available weapons
        this.weaponsList = [
            { id: 0, name: "手枪 (Pistol)", type: "semi", damage: 20, fireRate: 300, maxAmmo: 15, currentAmmo: 15, range: 50, reloadTime: 1000 },
            { id: 1, name: "突击步枪 (Assault Rifle)", type: "auto", damage: 25, fireRate: 100, maxAmmo: 30, currentAmmo: 30, range: 100, reloadTime: 2000 },
            { id: 2, name: "冲锋枪 (SMG)", type: "auto", damage: 15, fireRate: 50, maxAmmo: 50, currentAmmo: 50, range: 40, reloadTime: 1500 },
            { id: 3, name: "狙击枪 (Sniper)", type: "semi", damage: 100, fireRate: 1500, maxAmmo: 5, currentAmmo: 5, range: 300, reloadTime: 3000 },
            { id: 4, name: "火箭发射器 (Rocket Launcher)", type: "projectile", damage: 150, fireRate: 2000, maxAmmo: 3, currentAmmo: 3, range: 200, reloadTime: 4000 }
        ];

        this.currentWeaponIndex = 0;
        this.isFiring = false;
        this.isAiming = false;
        this.lastFireTime = 0;
        this.isReloading = false;

        this.weaponMesh = null;
        this.projectiles = [];
        
        this.hasInfiniteAmmo = false;
        
        this.init();
        
        // Listen to infinite ammo pickup
        window.addEventListener('ammoPickedUp', () => this.activateInfiniteAmmo());
    }

    init() {
        this.createWeaponModel();
        this.updateUI();
        this.renderWeaponList();
    }

    createWeaponModel() {
        if (this.weaponMesh) {
            this.camera.remove(this.weaponMesh);
        }

        // A simple generic blocky weapon model attached to camera
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 2);
        const material = new THREE.MeshStandardMaterial({ color: 0x333333 });
        this.weaponMesh = new THREE.Mesh(geometry, material);
        
        this.weaponMesh.position.set(1, -1, -2); // Bottom right relative to camera
        this.weaponMesh.castShadow = true;
        this.camera.add(this.weaponMesh);
    }

    switchWeapon(index) {
        if (index >= 0 && index < this.weaponsList.length && index !== this.currentWeaponIndex && !this.isReloading) {
            this.currentWeaponIndex = index;
            
            // Adjust weapon model slightly based on type
            const w = this.weaponsList[this.currentWeaponIndex];
            if (w.id === 0) this.weaponMesh.scale.set(0.5, 0.5, 0.5); // Pistol
            else if (w.id === 1) this.weaponMesh.scale.set(0.8, 0.8, 1.2); // AR
            else if (w.id === 2) this.weaponMesh.scale.set(0.6, 0.6, 0.8); // SMG
            else if (w.id === 3) this.weaponMesh.scale.set(1, 1, 2); // Sniper
            else if (w.id === 4) this.weaponMesh.scale.set(1.5, 1.5, 1.5); // Rocket

            this.updateUI();
            this.renderWeaponList();
            
            // Reset aiming
            if (this.isAiming) this.setAiming(false);
        }
    }

    startFiring() {
        this.isFiring = true;
    }

    stopFiring() {
        this.isFiring = false;
    }

    setAiming(aim) {
        this.isAiming = aim;
        const w = this.weaponsList[this.currentWeaponIndex];
        const sniperScope = document.getElementById('sniper-scope');
        const crosshair = document.getElementById('crosshair');

        if (this.isAiming) {
            if (w.id === 3) { // Sniper
                this.camera.fov = 20; // Zoom in
                sniperScope.style.display = 'block';
                crosshair.style.display = 'none';
            } else {
                this.camera.fov = 60; // Slight zoom
                this.weaponMesh.position.set(0, -0.5, -2); // ADS view
            }
        } else {
            this.camera.fov = 75; // Normal FOV
            sniperScope.style.display = 'none';
            crosshair.style.display = 'flex';
            this.weaponMesh.position.set(1, -1, -2); // Hip view
        }
        this.camera.updateProjectionMatrix();
    }

    reload() {
        const w = this.weaponsList[this.currentWeaponIndex];
        if (w.currentAmmo < w.maxAmmo && !this.isReloading) {
            this.isReloading = true;
            document.getElementById('ammo').innerText = "Reloading...";
            setTimeout(() => {
                w.currentAmmo = w.maxAmmo;
                this.isReloading = false;
                this.updateUI();
            }, w.reloadTime);
        }
    }

    activateInfiniteAmmo() {
        this.hasInfiniteAmmo = true;
        for (let w of this.weaponsList) {
            w.currentAmmo = w.maxAmmo;
        }
        this.updateUI();
    }

    fire() {
        const w = this.weaponsList[this.currentWeaponIndex];
        const now = performance.now();

        if (this.isReloading || now - this.lastFireTime < w.fireRate) {
            return;
        }

        if (!this.hasInfiniteAmmo && w.currentAmmo <= 0) {
            this.reload();
            return;
        }

        if (!this.hasInfiniteAmmo) {
            w.currentAmmo--;
        }
        
        this.lastFireTime = now;
        this.updateUI();

        // Recoil effect
        this.camera.rotation.x += 0.02;

        if (w.type === "projectile") {
            this.fireProjectile(w);
        } else {
            this.fireHitscan(w);
        }

        if (w.type === "semi") {
            this.isFiring = false; // Requires clicking again
        }
    }

    fireHitscan(w) {
        // Raycast from camera center
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        
        // Add a visible tracer
        const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
        const points = [];
        points.push(this.weaponMesh.getWorldPosition(new THREE.Vector3()));
        
        const intersects = this.raycaster.intersectObjects(this.objects);

        let endPoint = new THREE.Vector3();
        this.raycaster.ray.at(w.range, endPoint);

        if (intersects.length > 0 && intersects[0].distance <= w.range) {
            endPoint = intersects[0].point;
            
            const hit = intersects[0];
            let hitObj = hit.object;
            let isBot = false;
            let botInstance = null;
            
            // Check if we hit a bot (traversing up in case we hit a nested mesh)
            while (hitObj) {
                if (hitObj.userData && hitObj.userData.isBot) {
                    isBot = true;
                    botInstance = hitObj.userData.bot;
                    break;
                }
                hitObj = hitObj.parent;
            }
            
            if (isBot && botInstance) {
                botInstance.takeDamage(w.damage);
                this.showHitMarker();
            } else {
                // Create a small explosion/spark at hit point
                this.createHitSpark(endPoint);
            }
        }

        points.push(endPoint);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);

        // Remove tracer after short time
        setTimeout(() => {
            this.scene.remove(line);
        }, 50);
    }

    fireProjectile(w) {
        // Rocket launcher logic
        const geo = new THREE.SphereGeometry(0.5, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const rocket = new THREE.Mesh(geo, mat);

        const pos = this.weaponMesh.getWorldPosition(new THREE.Vector3());
        rocket.position.copy(pos);

        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        rocket.userData = { direction: dir, speed: 50, life: 2000, birth: performance.now() };

        this.scene.add(rocket);
        this.projectiles.push(rocket);
    }

    createHitSpark(position) {
        const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const spark = new THREE.Mesh(geo, mat);
        spark.position.copy(position);
        this.scene.add(spark);

        setTimeout(() => {
            this.scene.remove(spark);
        }, 100);
    }

    showHitMarker() {
        const marker = document.getElementById('hit-marker');
        if (marker) {
            marker.style.opacity = 1;
            setTimeout(() => {
                marker.style.opacity = 0;
            }, 100);
        }
    }

    update(delta) {
        if (this.isFiring) {
            this.fire();
        }

        // Return recoil
        this.camera.rotation.x = THREE.MathUtils.lerp(this.camera.rotation.x, 0, 0.1);

        // Update projectiles
        const now = performance.now();
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            
            // Move projectile
            p.position.add(p.userData.direction.clone().multiplyScalar(p.userData.speed * delta));

            // Simple collision check for projectiles
            let hit = false;
            for (const obj of this.objects) {
                const box = new THREE.Box3().setFromObject(obj);
                if (box.containsPoint(p.position)) {
                    hit = true;
                    // Explosion
                    this.createExplosion(p.position);
                    break;
                }
            }

            if (hit || now - p.userData.birth > p.userData.life) {
                this.scene.remove(p);
                this.projectiles.splice(i, 1);
            }
        }
    }

    createExplosion(position) {
        const geo = new THREE.SphereGeometry(3, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.8 });
        const explosion = new THREE.Mesh(geo, mat);
        explosion.position.copy(position);
        this.scene.add(explosion);

        let scale = 1;
        const interval = setInterval(() => {
            scale += 0.2;
            explosion.scale.set(scale, scale, scale);
            explosion.material.opacity -= 0.1;
            if (explosion.material.opacity <= 0) {
                clearInterval(interval);
                this.scene.remove(explosion);
            }
        }, 30);
    }

    updateUI() {
        const w = this.weaponsList[this.currentWeaponIndex];
        const ammoUI = document.getElementById('ammo');
        const weaponUI = document.getElementById('current-weapon');
        if (ammoUI && weaponUI) {
            ammoUI.innerText = this.hasInfiniteAmmo ? '∞ / ∞' : `${w.currentAmmo} / ∞`;
            weaponUI.innerText = w.name;
        }
    }

    renderWeaponList() {
        const listUI = document.getElementById('weapon-list');
        if (!listUI) return;
        
        let html = '';
        this.weaponsList.forEach((w, i) => {
            const active = i === this.currentWeaponIndex ? 'class="active-weapon"' : '';
            html += `<div ${active}>${i+1}: ${w.name}</div>`;
        });
        listUI.innerHTML = html;
    }
}