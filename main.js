import * as THREE from 'three';
import { TICK_RATE, PLAYER_HEIGHT, ISLAND_SIZE, WATER_LEVEL } from './js/constants.js';
import World from './js/world.js';
import Player from './js/player.js';
import Physics from './js/physics.js';
import Animal from './js/animal.js';
import InteractionHandler from './js/interaction.js';
import { updateUI, logMessage } from './js/ui.js';

// --- Variáveis Globais da Cena ---
let scene, camera, renderer, clock, raycaster;
let world, player, physics, interactionHandler;
let animals = [];
let keys = {};

function initializeGame() {
    // --- Configuração Básica ---
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 40, ISLAND_SIZE);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    
    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();

    // --- Iluminação ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    scene.add(dirLight);

    // --- Criação do Mundo e Jogador ---
    world = new World(scene);
    world.generate();

    const startX = 0, startZ = 0;
    const startY = world.getTerrainHeight(startX, startZ, raycaster) + PLAYER_HEIGHT;
    camera.position.set(startX, startY, startZ);

    player = new Player();
    physics = new Physics(world, raycaster);
    interactionHandler = new InteractionHandler(camera, world, player, raycaster);

    // --- Adicionar Animais ---
    for(let i = 0; i < 15; i++) {
        const aX = (Math.random() - 0.5) * ISLAND_SIZE * 0.7;
        const aZ = (Math.random() - 0.5) * ISLAND_SIZE * 0.7;
        const aY = world.getTerrainHeight(aX, aZ, raycaster);
        if(aY > WATER_LEVEL) {
           animals.push(new Animal(scene, new THREE.Vector3(aX, aY + 0.4, aZ), Math.random() * 0xffffff));
        }
    }
    
    // --- Iniciar Controles e Loops ---
    initializeControls();
    setInterval(() => player.gameTick(logMessage), TICK_RATE);
    logMessage('Você acordou em uma ilha. Sobreviva.', 'info');

    // Loop de regeneração do mundo
    setInterval(() => {
        world.respawnTreeIfNeeded();
        world.respawnStoneIfNeeded(); // NOVO: Chama o respawn de pedras
    }, 15000); 

    animate();
}

function initializeControls() {
    // ... (código de controles, sem alterações) ...
    document.addEventListener('keydown', (e) => { keys[e.code] = true; });
    document.addEventListener('keyup', (e) => { keys[e.code] = false; });
    document.body.addEventListener('click', () => { document.body.requestPointerLock(); });
    camera.rotation.order = 'YXZ';
    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === document.body) {
            camera.rotation.y -= e.movementX / 500;
            camera.rotation.x -= e.movementY / 500;
            camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (document.pointerLockElement === document.body && e.button === 0) { 
            interactionHandler.handlePrimaryAction();
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    physics.update(camera, keys, deltaTime);
    animals.forEach(animal => animal.update(deltaTime, world, raycaster));
    updateUI(player); 
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

// --- INÍCIO ---
initializeGame();