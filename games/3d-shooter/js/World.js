import * as THREE from 'three';

export class World {
    constructor(scene, objects) {
        this.scene = scene;
        this.objects = objects; // Objects for collision detection
        this.ammoBoxes = [];
        this.lastTime = performance.now();
    }

    init() {
        this.addLighting();
        this.addFloor();
        this.addObstacles();
        this.addSky();
        this.spawnAmmoBox();
    }

    addLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        this.scene.add(ambientLight);

        // Directional light (Sun)
        const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
        dirLight.position.set(-100, 200, 100);
        dirLight.castShadow = true;
        
        // Shadow map settings
        dirLight.shadow.camera.top = 500;
        dirLight.shadow.camera.bottom = -500;
        dirLight.shadow.camera.left = -500;
        dirLight.shadow.camera.right = 500;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 1000;
        dirLight.shadow.mapSize.width = 4096;
        dirLight.shadow.mapSize.height = 4096;
        
        this.scene.add(dirLight);
    }

    addFloor() {
        // Large floor
        const floorGeometry = new THREE.PlaneGeometry(2000, 2000, 50, 50);
        floorGeometry.rotateX(-Math.PI / 2);
        
        // Simple grid texture for floor
        const gridTexture = new THREE.GridHelper(2000, 100).material.map;
        
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2e8b57, // Sea green
            roughness: 0.8,
            metalness: 0.2
        });

        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    addObstacles() {
        // Add random buildings/boxes so the world is not flat
        const boxGeometry = new THREE.BoxGeometry(20, 20, 20);
        const materials = [
            new THREE.MeshStandardMaterial({ color: 0x808080 }),
            new THREE.MeshStandardMaterial({ color: 0x8b4513 }),
            new THREE.MeshStandardMaterial({ color: 0x4682b4 }),
            new THREE.MeshStandardMaterial({ color: 0xd2b48c })
        ];

        // Create a city-like structure or ruins
        for (let i = 0; i < 200; i++) {
            const material = materials[Math.floor(Math.random() * materials.length)];
            const width = Math.random() * 30 + 10;
            const height = Math.random() * 80 + 20; // Some tall buildings to see from afar
            const depth = Math.random() * 30 + 10;
            
            const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
            const building = new THREE.Mesh(buildingGeometry, material);
            
            // Random position between -400 and 400, leaving center mostly clear
            let x = (Math.random() - 0.5) * 800;
            let z = (Math.random() - 0.5) * 800;
            
            // Don't spawn too close to start (0,0)
            if (Math.abs(x) < 50 && Math.abs(z) < 50) {
                x += (x > 0 ? 50 : -50);
                z += (z > 0 ? 50 : -50);
            }

            building.position.set(x, height / 2, z);
            building.castShadow = true;
            building.receiveShadow = true;
            
            // For simple AABB collision, just add the mesh to objects
            this.scene.add(building);
            this.objects.push(building);
        }
    }

    addSky() {
        // Very simple skybox using large sphere
        const skyGeo = new THREE.SphereGeometry(1000, 32, 32);
        const skyMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
    }

    spawnAmmoBox() {
        // Create an infinite ammo box (无线弹药盒)
        const boxSize = 5;
        const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xffff00, // Yellow
            emissive: 0x555500,
            roughness: 0.2,
            metalness: 0.8
        });
        
        const ammoBox = new THREE.Mesh(geometry, material);
        // Place it somewhere accessible near spawn
        ammoBox.position.set(20, boxSize / 2, -20);
        ammoBox.castShadow = true;
        
        // Add text or symbol? A simple point light above it
        const light = new THREE.PointLight(0xffff00, 2, 50);
        light.position.set(0, boxSize + 2, 0);
        ammoBox.add(light);
        
        this.scene.add(ammoBox);
        this.ammoBoxes.push(ammoBox);
    }

    update(delta, playerPos) {
        const time = performance.now();
        // Animate ammo boxes (spin and hover)
        for (const box of this.ammoBoxes) {
            box.rotation.y += delta;
            box.position.y = 2.5 + Math.sin(time * 0.003) * 1;
            
            // Check pickup collision
            const dist = playerPos.distanceTo(box.position);
            if (dist < 10) {
                // Pick up infinite ammo (refill all weapons to max)
                this.triggerAmmoPickup();
            }
        }
    }

    triggerAmmoPickup() {
        const now = performance.now();
        if (now - this.lastTime > 5000) { // Cooldown 5 seconds
            this.lastTime = now;
            // Dispatch event for weapons to catch
            const event = new CustomEvent('ammoPickedUp');
            window.dispatchEvent(event);
            
            // Show message
            this.showMessage("获得无限弹药！ (Ammo Refilled)");
        }
    }
    
    showMessage(text) {
        const msg = document.getElementById('message');
        if (msg) {
            msg.innerText = text;
            msg.style.opacity = 1;
            setTimeout(() => {
                msg.style.opacity = 0;
            }, 2000);
        }
    }
}