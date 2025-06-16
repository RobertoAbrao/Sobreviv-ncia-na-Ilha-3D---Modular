import * as THREE from 'three';
import { TICK_RATE, PLAYER_HEIGHT, ISLAND_SIZE, WATER_LEVEL } from './js/constants.js';
import World from './js/world.js';
import Player from './js/player.js';
import Physics from './js/physics.js';
import Animal from './js/animal.js';
import InteractionHandler from './js/interaction.js';
import { Campfire, campfireCost } from './js/campfire.js'; // NOVO: Importa Campfire e campfireCost
import { updateUI, logMessage, toggleCraftingModal, renderCraftingList } from './js/ui.js'; // NOVO: Importa funções do UI para o modal

// --- Variáveis Globais da Cena ---
let scene, camera, renderer, clock, raycaster;
let world, player, physics, interactionHandler;
let animals = [];
let keys = {};
let isCraftingModalOpen = false; // NOVO: Estado do modal de crafting
let activeCampfire = null; // NOVO: Referência à fogueira ativa na cena

// NOVO: Definição dos itens de crafting
const craftableItems = [
    {
        name: 'Fogueira',
        cost: campfireCost, // Puxa o custo de campfire.js
        effect: (player, scene, camera, world, raycaster) => {
            if (player.hasCampfire) {
                logMessage('Você já construiu uma fogueira!', 'warning');
                return false;
            }

            const position = camera.position.clone();
            // Tenta colocar a fogueira no chão abaixo do jogador
            const groundY = world.getTerrainHeight(position.x, position.z, raycaster);
            if (groundY < WATER_LEVEL) {
                logMessage('Não é possível construir na água!', 'danger');
                return false;
            }
            position.y = groundY;

            const newCampfire = new Campfire(position);
            scene.add(newCampfire.mesh);
            activeCampfire = newCampfire;
            player.hasCampfire = true; // Define que o jogador tem uma fogueira
            logMessage('Você construiu uma fogueira!', 'success');
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
    document.addEventListener('keydown', (e) => { 
        keys[e.code] = true; 
        // NOVO: Abre/fecha o modal de crafting com a tecla 'B'
        if (e.code === 'KeyB') {
            isCraftingModalOpen = !isCraftingModalOpen;
            toggleCraftingModal(isCraftingModalOpen);
            // NOVO: Libera o ponteiro se o modal abrir, ou tenta travar se fechar
            if (isCraftingModalOpen) {
                document.exitPointerLock(); // Libera o ponteiro
                renderCraftingList(craftableItems, player, handleCraftItem);
            } else {
                // Ao fechar o modal, o jogador pode querer re-travar o ponteiro
                // Mas isso deve ser feito por um clique, não automaticamente
            }
        }
    });
    document.addEventListener('keyup', (e) => { keys[e.code] = false; });
    
    // NOVO: Trava o ponteiro apenas se o modal de crafting não estiver aberto
    document.body.addEventListener('click', () => { 
        if (!isCraftingModalOpen) {
            document.body.requestPointerLock(); 
        }
    });

    // NOVO: Fecha o modal de crafting ao clicar no botão de fechar
    document.getElementById('close-crafting-modal').addEventListener('click', () => {
        isCraftingModalOpen = false;
        toggleCraftingModal(false);
    });

    camera.rotation.order = 'YXZ';
    document.addEventListener('mousemove', (e) => {
        // NOVO: Só controla a câmera se o ponteiro estiver travado E o modal de crafting não estiver aberto
        if (document.pointerLockElement === document.body && !isCraftingModalOpen) {
            camera.rotation.y -= e.movementX / 500;
            camera.rotation.x -= e.movementY / 500;
            camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        }
    });

    document.addEventListener('mousedown', (e) => {
        // NOVO: Só interage se o ponteiro estiver travado E o modal de crafting não estiver aberto
        if (document.pointerLockElement === document.body && e.button === 0 && !isCraftingModalOpen) { 
            interactionHandler.handlePrimaryAction();
        }
    });
}

// NOVO: Função para lidar com a criação de itens
function handleCraftItem(item) {
    if (player.hasResources(item.cost)) {
        player.consumeResources(item.cost);
        if (item.effect(player, scene, camera, world, raycaster)) {
            // Se o item foi criado com sucesso, renderiza a lista novamente para atualizar o estado dos botões
            renderCraftingList(craftableItems, player, handleCraftItem);
        }
        updateUI(player); // Atualiza a UI do inventário
    } else {
        logMessage(`Você não tem recursos suficientes para criar ${item.name}.`, 'danger');
    }
}

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    // NOVO: Só atualiza física e animais se o modal de crafting não estiver aberto
    if (!isCraftingModalOpen) {
        physics.update(camera, keys, deltaTime);
        animals.forEach(animal => animal.update(deltaTime, world, raycaster));
        if (activeCampfire) { // NOVO: Atualiza a fogueira se existir
            activeCampfire.update(deltaTime);
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