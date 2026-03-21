import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { World } from './World.js';
import { Player } from './Player.js';
import { Weapons } from './Weapons.js';
import { Bot } from './Bot.js';

let camera, scene, renderer, controls;
let world, player, weapons;
let bots = [];
let clock, lastTime;
let ui;

const objects = [];
let raycaster;
let isStarted = false;

init();
animate();

function init() {
    // Basic setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    scene.fog = new THREE.Fog(0x87ceeb, 50, 800);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Controls
    controls = new PointerLockControls(camera, document.body);

    const startBtn = document.getElementById('start-btn');
    const startScreen = document.getElementById('start-screen');
    const uiElement = document.getElementById('ui');

    startBtn.addEventListener('click', function () {
        controls.lock();
    });

    controls.addEventListener('lock', function () {
        startScreen.style.display = 'none';
        uiElement.style.display = 'block';
        isStarted = true;
    });

    controls.addEventListener('unlock', function () {
        startScreen.style.display = 'flex';
        uiElement.style.display = 'none';
        isStarted = false;
        // Stop any automatic firing
        weapons.stopFiring();
        weapons.setAiming(false);
    });

    scene.add(controls.getObject());

    // Initialize systems
    world = new World(scene, objects);
    world.init();

    weapons = new Weapons(scene, camera, controls, objects);
    
    player = new Player(camera, controls, objects, weapons);
    
    // Create some bots
    for (let i = 0; i < 5; i++) {
        bots.push(new Bot(scene, objects, player, Math.random() * 800 - 400, Math.random() * 800 - 400));
    }

    raycaster = new THREE.Raycaster();

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('contextmenu', e => e.preventDefault());

    clock = new THREE.Clock();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseDown(event) {
    if (!isStarted) return;
    if (event.button === 0) {
        weapons.startFiring();
    } else if (event.button === 2) {
        event.preventDefault();
        weapons.setAiming(true);
    }
}

function onMouseUp(event) {
    if (!isStarted) return;
    if (event.button === 0) {
        weapons.stopFiring();
    } else if (event.button === 2) {
        weapons.setAiming(false);
    }
}

function onKeyDown(event) {
    if (!isStarted) return;
    player.onKeyDown(event);
    
    // Weapon switching
    if (event.code === 'Digit1') weapons.switchWeapon(0); // Pistol
    if (event.code === 'Digit2') weapons.switchWeapon(1); // Assault Rifle
    if (event.code === 'Digit3') weapons.switchWeapon(2); // SMG
    if (event.code === 'Digit4') weapons.switchWeapon(3); // Sniper
    if (event.code === 'Digit5') weapons.switchWeapon(4); // Rocket Launcher
    if (event.code === 'KeyR') weapons.reload();
}

function onKeyUp(event) {
    if (!isStarted) return;
    player.onKeyUp(event);
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (controls.isLocked === true) {
        player.update(delta);
        weapons.update(delta);
        world.update(delta, player.getPosition());
        
        // Update bots
        for (const bot of bots) {
            bot.update(delta);
        }
    }

    renderer.render(scene, camera);
}