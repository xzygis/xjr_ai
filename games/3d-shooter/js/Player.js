import * as THREE from 'three';

export class Player {
    constructor(camera, controls, objects, weapons) {
        this.camera = camera;
        this.controls = controls;
        this.objects = objects; // Reference to collidable world objects
        this.weapons = weapons; // To update weapon position

        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = false;

        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 10);
        
        // Start position
        this.controls.getObject().position.y = 10;
        
        // Player properties
        this.speed = 400.0;
        this.health = 100;
        
        this.init();
    }

    init() {
        // Initial health UI
        this.updateHealthUI();
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = true;
                break;
            case 'Space':
                if (this.canJump === true) this.velocity.y += 350;
                this.canJump = false;
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = false;
                break;
        }
    }

    getPosition() {
        return this.controls.getObject().position;
    }

    update(delta) {
        // Apply physics
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;
        this.velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize(); // Ensure consistent movement in all directions

        if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * this.speed * delta;
        if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * this.speed * delta;

        // Collision detection (floor)
        this.raycaster.ray.origin.copy(this.controls.getObject().position);
        this.raycaster.ray.origin.y -= 10;
        
        // Add rudimentary AABB check for obstacles
        const pos = this.controls.getObject().position;
        // Don't walk through buildings (Simple bounding box collision)
        let collided = false;
        
        this.controls.moveRight(-this.velocity.x * delta);
        this.controls.moveForward(-this.velocity.z * delta);
        this.controls.getObject().position.y += (this.velocity.y * delta);
        
        // Floor collision
        if (this.controls.getObject().position.y < 10) {
            this.velocity.y = 0;
            this.controls.getObject().position.y = 10;
            this.canJump = true;
        }
        
        // World bounds
        if (pos.x > 1000) pos.x = 1000;
        if (pos.x < -1000) pos.x = -1000;
        if (pos.z > 1000) pos.z = 1000;
        if (pos.z < -1000) pos.z = -1000;

        // Add some bobbing to weapon
        if (this.weapons && (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight)) {
            const time = performance.now();
            // Optional: weapon sway
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
        this.updateHealthUI();
    }

    die() {
        // Respawn or game over logic
        this.controls.getObject().position.set(0, 10, 0);
        this.health = 100;
        this.updateHealthUI();
    }

    updateHealthUI() {
        const hp = document.getElementById('health');
        if (hp) hp.innerText = this.health;
    }
}