// main.js
import * as THREE from 'three';
import { TICK_RATE, PLAYER_HEIGHT, ISLAND_SIZE, WATER_LEVEL } from './js/constants.js';
import World from './js/world.js';
import Player from './js/player.js';
import Physics from './js/physics.js';
import Animal from './js/animal.js';
import InteractionHandler from './js/interaction.js';
import { Campfire, campfireCost } from './js/campfire.js';
import { updateUI, logMessage, toggleCraftingModal, renderCraftingList, selectTool, toggleInteractionModal, renderInteractionList, toggleCampfireModal } from './js/ui.js'; // NOVO: Importar toggleCampfireModal

// --- Variáveis Globais da Cena ---
let scene, camera, renderer, clock, raycaster;
let world, player, physics, interactionHandler;
let animalsInstances = [];
let keys = {};
let isCraftingModalOpen = false;
let isInteractionModalOpen = false; 
let isCampfireModalOpen = false; // NOVO: Flag para o modal da fogueira
let activeCampfire = null;
let highlightMesh = null;
let highlightedObject = null;

// Variáveis para o ciclo dia/noite
let ambientLight, directionalLight;
let dayTime = 0;
const TOTAL_CYCLE_SECONDS = 480;
const DAY_PHASE_END_HOUR = (5 / 8) * 24;
const NIGHT_PHASE_END_HOUR = (8 / 8) * 24;

// Definição dos itens de crafting
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
        },
        requires: null
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
        },
        requires: null
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
        },
        requires: null
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
    ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(2048, 2048);
    scene.add(directionalLight);

    world = new World(scene);
    world.generate();

    const startX = 0, startZ = 0;
    const startY = world.getTerrainHeight(startX, startZ, raycaster) + PLAYER_HEIGHT;
    camera.position.set(startX, startY, startZ);

    player = new Player();
    physics = new Physics(world, raycaster);
    // Passa a fogueira ativa para o InteractionHandler
    interactionHandler = new InteractionHandler(camera, world, player, raycaster, () => activeCampfire);

    // --- Adicionar Animais ---
    for(let i = 0; i < world.initialAnimalCount; i++) {
        const aX = (Math.random() - 0.5) * ISLAND_SIZE * 0.7;
        const aZ = (Math.random() - 0.5) * ISLAND_SIZE * 0.7;
        const aY = world.getTerrainHeight(aX, aZ, raycaster);
        if(aY > WATER_LEVEL) {
           const newAnimal = world.createAnimal(new THREE.Vector3(aX, aY + 0.4, aZ), Math.random() * 0xffffff);
           animalsInstances.push(newAnimal);
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
        world.respawnAnimalIfNeeded(animalsInstances);
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
            // NOVO: Fecha os outros modais se o de crafting abrir
            if (isCraftingModalOpen && isInteractionModalOpen) {
                isInteractionModalOpen = false;
                toggleInteractionModal(isInteractionModalOpen);
            }
            if (isCraftingModalOpen && isCampfireModalOpen) {
                isCampfireModalOpen = false;
                toggleCampfireModal(isCampfireModalOpen);
            }
        }
        // NOVO: Adicionar listener para a tecla 'H'
        if (e.code === 'KeyH') {
            isInteractionModalOpen = !isInteractionModalOpen;
            toggleInteractionModal(isInteractionModalOpen);
            if (isInteractionModalOpen) {
                document.exitPointerLock();
                // Função que renderiza os itens de interação (comer/beber)
                renderInteractionList(player, handlePlayerInteraction); 
            }
            // NOVO: Fecha os outros modais se o de interação abrir
            if (isInteractionModalOpen && isCraftingModalOpen) {
                isCraftingModalOpen = false;
                toggleCraftingModal(isCraftingModalOpen);
            }
            if (isInteractionModalOpen && isCampfireModalOpen) {
                isCampfireModalOpen = false;
                toggleCampfireModal(isCampfireModalOpen);
            }
        }
        // NOVO: Adicionar listener para a tecla 'K' para o modal da fogueira
        if (e.code === 'KeyK') {
            if (activeCampfire) { // Só abre se houver uma fogueira construída
                isCampfireModalOpen = !isCampfireModalOpen;
                toggleCampfireModal(isCampfireModalOpen);
                if (isCampfireModalOpen) {
                    document.exitPointerLock();
                    // Chama a função para renderizar as opções da fogueira
                    interactionHandler.openCampfireMenu();
                }
                // NOVO: Fecha os outros modais se o da fogueira abrir
                if (isCampfireModalOpen && isCraftingModalOpen) {
                    isCraftingModalOpen = false;
                    toggleCraftingModal(isCraftingModalOpen);
                }
                if (isCampfireModalOpen && isInteractionModalOpen) {
                    isInteractionModalOpen = false;
                    toggleInteractionModal(isInteractionModalOpen);
                }
            } else {
                logMessage('Você precisa construir uma fogueira primeiro (tecla B)!', 'warning');
            }
        }

        if (e.code === 'Digit1') {
            selectTool(player, 'Machado');
        } else if (e.code === 'Digit2') {
            selectTool(player, 'Picareta');
        }
    });
    document.addEventListener('keyup', (e) => { keys[e.code] = false; });
    
    document.body.addEventListener('click', () => { 
        if (!isCraftingModalOpen && !isInteractionModalOpen && !isCampfireModalOpen) { // NOVO: Verifica todos os modais
            document.body.requestPointerLock();
        }
    });

    document.getElementById('close-crafting-modal').addEventListener('click', () => {
        isCraftingModalOpen = false;
        toggleCraftingModal(false);
    });

    // NOVO: Listener para fechar o modal de interação
    document.getElementById('close-interaction-modal').addEventListener('click', () => {
        isInteractionModalOpen = false;
        toggleInteractionModal(false);
    });

    // NOVO: Listener para fechar o modal da fogueira
    document.getElementById('close-campfire-modal').addEventListener('click', () => {
        isCampfireModalOpen = false;
        toggleCampfireModal(false);
    });

    camera.rotation.order = 'YXZ';
    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === document.body && !isCraftingModalOpen && !isInteractionModalOpen && !isCampfireModalOpen) { // NOVO: Verifica todos
            camera.rotation.y -= e.movementX / 500;
            camera.rotation.x -= e.movementY / 500;
            camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (document.pointerLockElement === document.body && e.button === 0 && !isCraftingModalOpen && !isInteractionModalOpen && !isCampfireModalOpen) { // NOVO: Verifica todos
            interactionHandler.handlePrimaryAction();
        }
    });
}

function handleCraftItem(item) {
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

// NOVO: Função para lidar com interações do menu (comer/beber)
function handlePlayerInteraction(actionType) {
    if (actionType === 'eat') {
        // Verifica se há carne cozida ou peixe cozido para comer
        if (player.inventory['Carne Cozida'] > 0) {
            player.eatCookedMeat(logMessage);
        } else if (player.inventory['Peixe Cozido'] > 0) {
            player.eatCookedFish(logMessage);
        } else {
            logMessage('Você não tem nada cozido para comer.', 'warning');
        }
    } else if (actionType === 'drink') {
        player.drinkCleanWater(logMessage);
    }
    // Re-renderiza a lista para atualizar os estados dos botões (habilitado/desabilitado)
    renderInteractionList(player, handlePlayerInteraction); 
    updateUI(player);
}


// Função para atualizar o ciclo dia/noite
function updateDayNightCycle(deltaTime) {
    dayTime += deltaTime / TOTAL_CYCLE_SECONDS * 24;
    if (dayTime >= 24) {
        dayTime -= 24;
    }

    let ambientIntensity, directionalIntensity;
    let directionalColor, ambientColor, skyColor, fogColor;
    let lightX, lightY, lightZ;

    const sunriseStart = 4;
    const sunriseEnd = 7;
    const sunsetStart = 17;
    const sunsetEnd = 20;

    // Amanhecer (transição da noite para o dia)
    if (dayTime >= sunriseStart && dayTime < sunriseEnd) {
        const t = (dayTime - sunriseStart) / (sunriseEnd - sunriseStart);
        ambientIntensity = THREE.MathUtils.lerp(0.1, 0.7, t);
        directionalIntensity = THREE.MathUtils.lerp(0.05, 1.5, t);
        ambientColor = new THREE.Color(0x202040).lerp(new THREE.Color(0xFFFFFF), t);
        directionalColor = new THREE.Color(0x202040).lerp(new THREE.Color(0xFFFFFF), t);
        skyColor = new THREE.Color(0x000033).lerp(new THREE.Color(0x87CEEB), t);
        fogColor = skyColor;
        
        lightX = THREE.MathUtils.lerp(-100, 50, t);
        lightY = THREE.MathUtils.lerp(10, 100, t);
        lightZ = THREE.MathUtils.lerp(-50, 50, t);
    }
    // Dia (luz plena)
    else if (dayTime >= sunriseEnd && dayTime < sunsetStart) {
        ambientIntensity = 0.7;
        directionalIntensity = 1.5;
        ambientColor = new THREE.Color(0xFFFFFF);
        directionalColor = new THREE.Color(0xFFFFFF);
        skyColor = new THREE.Color(0x87CEEB);
        fogColor = skyColor;

        const t = (dayTime - sunriseEnd) / (sunsetStart - sunriseEnd);
        lightX = THREE.MathUtils.lerp(50, -50, t);
        lightY = 100;
        lightZ = THREE.MathUtils.lerp(50, -50, t);
    }
    // Entardecer (transição do dia para a noite)
    else if (dayTime >= sunsetStart && dayTime < sunsetEnd) {
        const t = (dayTime - sunsetStart) / (sunsetEnd - sunsetStart);
        ambientIntensity = THREE.MathUtils.lerp(0.7, 0.1, t);
        directionalIntensity = THREE.MathUtils.lerp(1.5, 0.05, t);
        ambientColor = new THREE.Color(0xFFFFFF).lerp(new THREE.Color(0x202040), t);
        directionalColor = new THREE.Color(0xFFFFFF).lerp(new THREE.Color(0x202040), t);
        skyColor = new THREE.Color(0x87CEEB).lerp(new THREE.Color(0x000033), t);
        fogColor = skyColor;

        lightX = THREE.MathUtils.lerp(-50, -100, t);
        lightY = THREE.MathUtils.lerp(100, 10, t);
        lightZ = THREE.MathUtils.lerp(-50, -50, t);
    }
    // Noite (escuridão)
    else {
        ambientIntensity = 0.1;
        directionalIntensity = 0.05;
        ambientColor = new THREE.Color(0x202040);
        directionalColor = new THREE.Color(0x202040);
        skyColor = new THREE.Color(0x000033);
        fogColor = skyColor;

        lightX = 0; 
        lightY = 50; 
        lightZ = 0;
    }

    ambientLight.intensity = ambientIntensity;
    ambientLight.color.copy(ambientColor);

    directionalLight.intensity = directionalIntensity;
    directionalLight.color.copy(directionalColor);
    directionalLight.position.set(lightX, lightY, lightZ);

    scene.background.copy(skyColor);
    scene.fog.color.copy(fogColor);
}


function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    // NOVO: Só atualiza o jogo se nenhum modal estiver aberto
    if (!isCraftingModalOpen && !isInteractionModalOpen && !isCampfireModalOpen) { 
        physics.update(camera, keys, deltaTime);
        animalsInstances.forEach(animal => animal.update(deltaTime, world, raycaster));
        if (activeCampfire) {
            activeCampfire.update(deltaTime);
        }

        updateDayNightCycle(deltaTime);

        // Lógica para o destaque de interação
        raycaster.setFromCamera(new THREE.Vector2(), camera);
        const objectsToIntersect = [...world.trees.children, ...world.stones.children, ...world.animals.children];
        const activeCampfireMesh = activeCampfire ? activeCampfire.mesh : null;
        if (activeCampfireMesh) {
            objectsToIntersect.push(activeCampfireMesh);
        }

        const intersects = raycaster.intersectObjects(objectsToIntersect, true);

        if (intersects.length > 0 && intersects[0].distance < interactionHandler.maxInteractionDistance) {
            let interactableObject = intersects[0].object;
            while (interactableObject.parent !== null && interactableObject.parent !== world.trees && interactableObject.parent !== world.stones && interactableObject.parent !== world.animals && interactableObject !== activeCampfireMesh) {
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
                } else if (interactableObject.parent === world.animals) {
                    highlightMesh.scale.set(1, 1, 1);
                }
                else if (activeCampfire && interactableObject === activeCampfire.mesh) {
                    highlightMesh.scale.set(1.5, 1.5, 1.5);
                    highlightMesh.position.y = activeCampfire.mesh.position.y + 0.75;
                }
                else {
                    highlightMesh.scale.set(1.2, 1.2, 1.2);
                }
            }
        } else {
            highlightMesh.visible = false;
            highlightedObject = null;
        }
        
        // NOVO: Atualiza a posição da barra de progresso do cozimento
        interactionHandler.updateCookingProgressUI(camera, renderer);
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