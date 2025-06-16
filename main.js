import * as THREE from 'three';
import { TICK_RATE, PLAYER_HEIGHT, ISLAND_SIZE, WATER_LEVEL } from './js/constants.js';
import World from './js/world.js';
import Player from './js/player.js';
import Physics from './js/physics.js';
import Animal from './js/animal.js';
import InteractionHandler from './js/interaction.js';
import { Campfire, campfireCost } from './js/campfire.js';
import { updateUI, logMessage, toggleCraftingModal, renderCraftingList, selectTool } from './js/ui.js'; // NOVO: Importa selectTool

// --- Variáveis Globais da Cena ---
let scene, camera, renderer, clock, raycaster;
let world, player, physics, interactionHandler;
let animals = [];
let keys = {};
let isCraftingModalOpen = false;
let activeCampfire = null;
let highlightMesh = null;
let highlightedObject = null;

// NOVO: Definição dos itens de crafting
const craftableItems = [
    {
        name: 'Fogueira',
        cost: campfireCost,
        effect: (player, scene, camera, world, raycaster) => {
            if (player.hasCampfire) {
                logMessage('Você já construiu uma fogueira!', 'warning');
                return false;
            }

            const position = camera.position.clone();
            const groundY = world.getTerrainHeight(position.x, position.z, raycaster);
            if (groundY < WATER_LEVEL) {
                logMessage('Não é possível construir na água!', 'danger');
                return false;
            }
            position.y = groundY;

            const newCampfire = new Campfire(position);
            scene.add(newCampfire.mesh);
            activeCampfire = newCampfire;
            player.hasCampfire = true;
            logMessage('Você construiu uma fogueira!', 'success');
            return true;
        }
    },
    {
        name: 'Machado',
        cost: { 'Madeira': 10, 'Pedra': 5 },
        effect: (player) => {
            if (player.hasAxe) {
                logMessage('Você já possui um machado!', 'warning');
                return false;
            }
            player.hasAxe = true;
            logMessage('Você criou um machado!', 'success');
            return true;
        }
    },
    {
        name: 'Picareta',
        cost: { 'Madeira': 10, 'Pedra': 10 },
        effect: (player) => {
            if (player.hasPickaxe) {
                logMessage('Você já possui uma picareta!', 'warning');
                return false;
            }
            player.hasPickaxe = true;
            logMessage('Você criou uma picareta!', 'success');
            return true;
        }
    }
];

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

    const highlightGeometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    highlightMesh.visible = false;
    scene.add(highlightMesh);

    // --- Iluminação ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    scene.add(dirLight);

    world = new World(scene);
    world.generate();

    const startX = 0, startZ = 0;
    const startY = world.getTerrainHeight(startX, startZ, raycaster) + PLAYER_HEIGHT;
    camera.position.set(startX, startY, startZ);

    player = new Player();
    physics = new Physics(world, raycaster);
    interactionHandler = new InteractionHandler(camera, world, player, raycaster); // Passa o player para InteractionHandler

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
        world.respawnStoneIfNeeded();
    }, 15000); 

    animate();
}

function initializeControls() {
    document.addEventListener('keydown', (e) => { 
        keys[e.code] = true; 
        if (e.code === 'KeyB') {
            isCraftingModalOpen = !isCraftingModalOpen;
            toggleCraftingModal(isCraftingModalOpen);
            if (isCraftingModalOpen) {
                document.exitPointerLock();
                renderCraftingList(craftableItems, player, handleCraftItem);
            }
        }
        // NOVO: Lógica para selecionar ferramentas com 1 e 2
        if (e.code === 'Digit1') {
            selectTool(player, 'Machado');
        } else if (e.code === 'Digit2') {
            selectTool(player, 'Picareta');
        }
    });
    document.addEventListener('keyup', (e) => { keys[e.code] = false; });
    
    document.body.addEventListener('click', () => { 
        if (!isCraftingModalOpen) {
            document.body.requestPointerLock(); 
        }
    });

    document.getElementById('close-crafting-modal').addEventListener('click', () => {
        isCraftingModalOpen = false;
        toggleCraftingModal(false);
    });

    camera.rotation.order = 'YXZ';
    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === document.body && !isCraftingModalOpen) {
            camera.rotation.y -= e.movementX / 500;
            camera.rotation.x -= e.movementY / 500;
            camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (document.pointerLockElement === document.body && e.button === 0 && !isCraftingModalOpen) { 
            interactionHandler.handlePrimaryAction();
        }
    });
}

function handleCraftItem(item) {
    // Ajuste para não permitir crafitar ferramenta se já tiver
    if ((item.name === 'Machado' && player.hasAxe) || (item.name === 'Picareta' && player.hasPickaxe)) {
        logMessage(`Você já possui ${item.name}.`, 'warning');
        return;
    }

    if (player.hasResources(item.cost)) {
        player.consumeResources(item.cost);
        if (item.effect(player, scene, camera, world, raycaster)) {
            renderCraftingList(craftableItems, player, handleCraftItem);
        }
        updateUI(player);
    } else {
        logMessage(`Você não tem recursos suficientes para criar ${item.name}.`, 'danger');
    }
}

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    if (!isCraftingModalOpen) {
        physics.update(camera, keys, deltaTime);
        animals.forEach(animal => animal.update(deltaTime, world, raycaster));
        if (activeCampfire) {
            activeCampfire.update(deltaTime);
        }

        // Lógica para o destaque de interação
        raycaster.setFromCamera(new THREE.Vector2(), camera);
        const objectsToIntersect = [...world.trees.children, ...world.stones.children];
        const intersects = raycaster.intersectObjects(objectsToIntersect, true);

        if (intersects.length > 0 && intersects[0].distance < interactionHandler.maxInteractionDistance) {
            let interactableObject = intersects[0].object;
            while (interactableObject.parent !== null && interactableObject.parent !== world.trees && interactableObject.parent !== world.stones) {
                interactableObject = interactableObject.parent;
            }

            if (highlightedObject !== interactableObject) {
                highlightedObject = interactableObject;
                highlightMesh.visible = true;
                highlightMesh.position.copy(interactableObject.position);
                if (interactableObject.parent === world.trees) {
                    highlightMesh.scale.set(1.5, 3, 1.5);
                } else if (interactableObject.parent === world.stones) {
                    highlightMesh.scale.set(1.5, 1.5, 1.5);
                } else {
                    highlightMesh.scale.set(1.2, 1.2, 1.2);
                }
            }
        } else {
            highlightMesh.visible = false;
            highlightedObject = null;
        }
    }
    
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