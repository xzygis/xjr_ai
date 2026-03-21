import * as THREE from 'three';

export class Bot {
    constructor(scene, objects, player, x, z) {
        this.scene = scene;
        this.objects = objects;
        this.player = player;
        
        this.health = 100;
        this.speed = 100;
        this.fireCooldown = 0;
        this.isDead = false;
        
        // Create bot mesh (simple red box for now)
        const geometry = new THREE.BoxGeometry(10, 20, 10);
        const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, 10, z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Add to scene and collision objects
        this.scene.add(this.mesh);
        this.objects.push(this.mesh);
        
        // Bot properties
        this.mesh.userData = { isBot: true, bot: this };
    }
    
    update(delta) {
        if (this.isDead) return;
        
        const playerPos = this.player.getPosition();
        const dist = this.mesh.position.distanceTo(playerPos);
        
        // Simple AI: Move towards player if within range, but keep some distance
        if (dist < 400 && dist > 100) {
            const dir = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
            dir.y = 0; // Don't fly
            
            this.mesh.position.addScaledVector(dir, this.speed * delta);
            this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
        }
        
        // Shoot at player
        if (dist < 300) {
            this.fireCooldown -= delta;
            if (this.fireCooldown <= 0) {
                this.fire(playerPos);
                this.fireCooldown = 1.5; // Shoot every 1.5s
            }
        }
    }
    
    fire(targetPos) {
        // Simple raycast shooting
        const origin = this.mesh.position.clone().add(new THREE.Vector3(0, 5, 0));
        const direction = new THREE.Vector3().subVectors(targetPos, origin).normalize();
        
        const raycaster = new THREE.Raycaster(origin, direction, 0, 400);
        
        // Check if we hit player (simplified: just check distance and chance)
        // In a real game, you'd raycast against player's bounding box
        const dist = origin.distanceTo(targetPos);
        if (dist < 300 && Math.random() > 0.5) {
            // Hit!
            this.player.takeDamage(10);
        }
        
        // Visual effect for shooting
        this.createTracer(origin, targetPos);
    }
    
    createTracer(start, end) {
        const material = new THREE.LineBasicMaterial({ color: 0xffaa00 });
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        
        setTimeout(() => {
            this.scene.remove(line);
            geometry.dispose();
            material.dispose();
        }, 100);
    }
    
    takeDamage(amount) {
        if (this.isDead) return;
        
        this.health -= amount;
        
        // Flash white
        const oldColor = this.mesh.material.color.getHex();
        this.mesh.material.color.setHex(0xffffff);
        setTimeout(() => {
            if (!this.isDead) this.mesh.material.color.setHex(oldColor);
        }, 100);
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    die() {
        this.isDead = true;
        
        // Visual death
        this.mesh.rotation.x = Math.PI / 2;
        this.mesh.position.y = 5;
        this.mesh.material.color.setHex(0x555555);
        
        // Remove from collision
        const index = this.objects.indexOf(this.mesh);
        if (index > -1) {
            this.objects.splice(index, 1);
        }
        
        // Respawn after 5 seconds
        setTimeout(() => {
            this.respawn();
        }, 5000);
    }
    
    respawn() {
        this.isDead = false;
        this.health = 100;
        this.mesh.rotation.x = 0;
        this.mesh.position.set(Math.random() * 800 - 400, 10, Math.random() * 800 - 400);
        this.mesh.material.color.setHex(0xff0000);
        
        if (!this.objects.includes(this.mesh)) {
            this.objects.push(this.mesh);
        }
    }
}