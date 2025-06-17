// main.js
import * as THREE from 'three';
import { TICK_RATE, PLAYER_HEIGHT, ISLAND_SIZE, WATER_LEVEL } from './js/constants.js';
import World from './js/world.js';
import Player from './js/player.js';
import Physics from './js/physics.js';
import Animal from './js/animal.js';
import InteractionHandler from './js/interaction.js';
import { Campfire, campfireCost } from './js/campfire.js';
import { Shelter, shelterCost } from './js/shelter.js'; // NOVO: Importa Shelter e shelterCost
import { updateUI, logMessage, toggleCraftingModal, renderCraftingList, selectTool, toggleInteractionModal, renderInteractionList, toggleCampfireModal, toggleShelterModal, renderShelterOptions } from './js/ui.js'; // NOVO: Importa funções do abrigo

// --- Variáveis Globais da Cena ---
let scene, camera, renderer, clock, raycaster;
let world, player, physics, interactionHandler;
let animalsInstances = [];
let keys = {};
let isCraftingModalOpen = false;
let isInteractionModalOpen = false; 
let isCampfireModalOpen = false; 
let isShelterModalOpen = false; // NOVO: Flag para o modal do abrigo
let activeCampfire = null;
let activeShelter = null; // NOVO: Abrigo ativo
let highlightMesh = null;
let highlightedObject = null;

// Variáveis para o ciclo dia/noite e clima
let ambientLight, directionalLight;
let dayTime = 0;
const TOTAL_CYCLE_SECONDS = 480; // Duração de um ciclo completo em segundos
let isNight = false; // NOVO: Variável para controlar se é noite
let isRaining = false; // NOVO: Variável para controlar se está chovendo
let rainParticles = null; // NOVO: Para o efeito de chuva

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
    },
    // NOVO: Receita para o Abrigo
    {
        name: 'Abrigo',
        cost: shelterCost,
        effect: (player, scene, camera, world, raycaster) => {
            if (player.hasShelter) {
                logMessage('Você já construiu um abrigo!', 'warning');
                return false;
            }

            const position = camera.position.clone();
            const groundY = world.getTerrainHeight(position.x, position.z, raycaster);
            if (groundY < WATER_LEVEL + 2) { // Não pode construir muito perto da água
                logMessage('Não é possível construir o abrigo tão perto da água!', 'danger');
                return false;
            }
            position.y = groundY; // Coloca o abrigo no chão

            const newShelter = new Shelter(position);
            scene.add(newShelter.mesh);
            activeShelter = newShelter;
            player.hasShelter = true;
            logMessage('Você construiu um abrigo! Um lugar para se proteger.', 'success');
            return true;
        },
        requires: null // Não requer fogueira para construir abrigo
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
    // Passa a fogueira ativa e o abrigo ativo para o InteractionHandler
    interactionHandler = new InteractionHandler(camera, world, player, raycaster, () => activeCampfire, () => activeShelter); // NOVO

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
    setInterval(() => {
        // Verifica se o jogador está perto de um abrigo ou fogueira
        const isNearShelterOrCampfire = checkProximityToShelterOrCampfire();
        player.gameTick(logMessage, isNight, isRaining, isNearShelterOrCampfire); // Passa os novos parâmetros
    }, TICK_RATE);
    logMessage('Você acordou em uma ilha. Sobreviva.', 'info');

    // Loop de regeneração do mundo
    setInterval(() => {
        world.respawnTreeIfNeeded();
        world.respawnStoneIfNeeded();
        world.respawnAnimalIfNeeded(animalsInstances);
    }, 15000); 

    // NOVO: Loop de clima
    setInterval(updateWeather, 60000); // A cada 1 minuto (60 segundos)
    
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
            if (isCraftingModalOpen && isShelterModalOpen) { // NOVO
                isShelterModalOpen = false;
                toggleShelterModal(isShelterModalOpen);
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
            if (isInteractionModalOpen && isShelterModalOpen) { // NOVO
                isShelterModalOpen = false;
                toggleShelterModal(isShelterModalOpen);
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
                if (isCampfireModalOpen && isShelterModalOpen) { // NOVO
                    isShelterModalOpen = false;
                    toggleShelterModal(isShelterModalOpen);
                }
            } else {
                logMessage('Você precisa construir uma fogueira primeiro (tecla B)!', 'warning');
            }
        }
        // NOVO: Adicionar listener para a tecla 'L' para o modal do abrigo
        if (e.code === 'KeyL') {
            if (player.hasShelter) { // Só abre se houver um abrigo construído
                isShelterModalOpen = !isShelterModalOpen;
                toggleShelterModal(isShelterModalOpen);
                if (isShelterModalOpen) {
                    document.exitPointerLock();
                    renderShelterOptions(player, handleSleepInShelter);
                }
                // Fecha os outros modais se o do abrigo abrir
                if (isShelterModalOpen && isCraftingModalOpen) {
                    isCraftingModalOpen = false;
                    toggleCraftingModal(isCraftingModalOpen);
                }
                if (isShelterModalOpen && isInteractionModalOpen) {
                    isInteractionModalOpen = false;
                    toggleInteractionModal(isInteractionModalOpen);
                }
                if (isShelterModalOpen && isCampfireModalOpen) {
                    isCampfireModalOpen = false;
                    toggleCampfireModal(isCampfireModalOpen);
                }
            } else {
                logMessage('Você precisa construir um abrigo primeiro (tecla B)!', 'warning');
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
        if (!isCraftingModalOpen && !isInteractionModalOpen && !isCampfireModalOpen && !isShelterModalOpen) { // NOVO: Verifica todos os modais
            document.body.requestPointerLock();
        }
    });

    document.getElementById('close-crafting-modal').addEventListener('click', () => {
        isCraftingModalOpen = false;
        toggleCraftingModal(false);
    });

    // Listener para fechar o modal de interação
    document.getElementById('close-interaction-modal').addEventListener('click', () => {
        isInteractionModalOpen = false;
        toggleInteractionModal(false);
    });

    // Listener para fechar o modal da fogueira
    document.getElementById('close-campfire-modal').addEventListener('click', () => {
        isCampfireModalOpen = false;
        toggleCampfireModal(false);
    });

    // NOVO: Listener para fechar o modal do abrigo
    document.getElementById('close-shelter-modal').addEventListener('click', () => {
        isShelterModalOpen = false;
        toggleShelterModal(false);
    });

    camera.rotation.order = 'YXZ';
    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === document.body && !isCraftingModalOpen && !isInteractionModalOpen && !isCampfireModalOpen && !isShelterModalOpen) { // NOVO: Verifica todos
            camera.rotation.y -= e.movementX / 500;
            camera.rotation.x -= e.movementY / 500;
            camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (document.pointerLockElement === document.body && e.button === 0 && !isCraftingModalOpen && !isInteractionModalOpen && !isCampfireModalOpen && !isShelterModalOpen) { // NOVO: Verifica todos
            interactionHandler.handlePrimaryAction();
        }
    });
}

function handleCraftItem(item) {
    if ((item.name === 'Machado' && player.hasAxe) || (item.name === 'Picareta' && player.hasPickaxe)) {
        logMessage(`Você já possui ${item.name}.`, 'warning');
        return;
    }
    // NOVO: Verifica se o abrigo já foi construído antes de tentar criar novamente
    if (item.name === 'Abrigo' && player.hasShelter) {
        logMessage(`Você já construiu um ${item.name}.`, 'warning');
        return;
    }

    if (player.hasResources(item.cost)) {
        if (item.effect(player, scene, camera, world, raycaster)) { // effect agora consome recursos internamente se for bem-sucedido
            player.consumeResources(item.cost); // Consome recursos após o sucesso da criação
            renderCraftingList(craftableItems, player, handleCraftItem);
        }
        updateUI(player);
    } else {
        logMessage(`Você não tem recursos suficientes para criar ${item.name}.`, 'danger');
    }
}

// Função para lidar com interações do menu (comer/beber)
function handlePlayerInteraction(actionType) {
    if (actionType === 'eat') {
        player.eatCookedMeat(logMessage); // Agora a função no player gerencia a quantidade e logs
    } else if (actionType === 'eat-fish') { // NOVO
        player.eatCookedFish(logMessage);
    } else if (actionType === 'drink') {
        player.drinkCleanWater(logMessage);
    }
    renderInteractionList(player, handlePlayerInteraction); 
    updateUI(player);
}

// NOVO: Função para dormir no abrigo
function handleSleepInShelter() {
    if (!player.hasShelter) {
        logMessage('Você precisa de um abrigo para dormir!', 'warning');
        return;
    }
    if (!isNight) {
        logMessage('Você só pode dormir à noite para pular o tempo.', 'warning');
        return;
    }
    if (!checkProximityToShelterOrCampfire()) { // Certifica-se de que está perto do abrigo
        logMessage('Você precisa estar perto do seu abrigo para dormir.', 'warning');
        return;
    }

    logMessage('Você se recolheu para dormir no abrigo.', 'info');
    toggleShelterModal(false);
    document.body.requestPointerLock(); // Volta para o controle do jogo

    // Avança o tempo para o próximo amanhecer
    const currentTimeInHours = dayTime;
    const hoursUntilMorning = 24 - currentTimeInHours + 7; // Pula para 7 da manhã do próximo dia
    dayTime += hoursUntilMorning;
    if (dayTime >= 24) {
        dayTime -= 24;
    }
    isNight = false; // Garante que não é mais noite
    logMessage('Você acordou revigorado!', 'success');
    player.health = Math.min(100, player.health + 10); // Recupera um pouco de vida ao dormir
    player.hunger = Math.min(100, player.hunger + 10); // Mas a fome e sede podem aumentar um pouco
    player.thirst = Math.min(100, player.thirst + 10);
    player.coldness = 0; // Zera o frio ao dormir no abrigo
}

// Função para verificar proximidade ao abrigo ou fogueira
function checkProximityToShelterOrCampfire() {
    const playerPosition = camera.position;
    const proximityRadius = 5; // Raio de proximidade

    if (activeShelter) {
        const shelterPosition = activeShelter.mesh.position;
        const distanceToShelter = playerPosition.distanceTo(shelterPosition);
        if (distanceToShelter <= proximityRadius) {
            return true;
        }
    }
    if (activeCampfire) {
        const campfirePosition = activeCampfire.mesh.position;
        const distanceToCampfire = playerPosition.distanceTo(campfirePosition);
        if (distanceToCampfire <= proximityRadius) {
            return true;
        }
    }
    return false;
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
        isNight = false; // Não é noite
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
        isNight = false; // Não é noite
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
        isNight = true; // É noite
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
        isNight = true; // É noite
    }

    ambientLight.intensity = ambientIntensity;
    ambientLight.color.copy(ambientColor);

    directionalLight.intensity = directionalIntensity;
    directionalLight.color.copy(directionalColor);
    directionalLight.position.set(lightX, lightY, lightZ);

    scene.background.copy(skyColor);
    scene.fog.color.copy(fogColor);
}

// NOVO: Função para atualizar o clima
function updateWeather() {
    const chanceOfRain = 0.3; // 30% de chance de chuva a cada minuto
    if (Math.random() < chanceOfRain) {
        isRaining = true;
        logMessage('Começou a chover!', 'info');
        startRainEffect();
    } else {
        if (isRaining) {
            logMessage('A chuva parou.', 'info');
        }
        isRaining = false;
        stopRainEffect();
    }
}

// NOVO: Efeito de chuva
function startRainEffect() {
    if (rainParticles) return; // Já está chovendo

    const rainGeometry = new THREE.BufferGeometry();
    const positions = [];
    const particleCount = 2000;

    for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * ISLAND_SIZE * 2;
        const y = Math.random() * 50 + 20; // Acima da câmera
        const z = (Math.random() - 0.5) * ISLAND_SIZE * 2;
        positions.push(x, y, z);
    }

    rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const rainMaterial = new THREE.PointsMaterial({
        color: 0xADD8E6, // Azul claro para a chuva
        size: 0.1,
        transparent: true,
        opacity: 0.7
    });

    rainParticles = new THREE.Points(rainGeometry, rainMaterial);
    scene.add(rainParticles);
}

// NOVO: Parar efeito de chuva
function stopRainEffect() {
    if (rainParticles) {
        scene.remove(rainParticles);
        rainParticles.geometry.dispose();
        rainParticles.material.dispose();
        rainParticles = null;
    }
}

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    // NOVO: Só atualiza o jogo se nenhum modal estiver aberto
    if (!isCraftingModalOpen && !isInteractionModalOpen && !isCampfireModalOpen && !isShelterModalOpen) { 
        physics.update(camera, keys, deltaTime);
        animalsInstances.forEach(animal => animal.update(deltaTime, world, raycaster));
        if (activeCampfire) {
            activeCampfire.update(deltaTime);
        }
        // NÃO TEM activeShelter.update(), pois o abrigo é estático.
        
        updateDayNightCycle(deltaTime);

        // NOVO: Atualiza a posição das partículas de chuva
        if (rainParticles) {
            rainParticles.position.y -= 10 * deltaTime; // Velocidade da chuva
            if (rainParticles.position.y < -20) { // Resetar partículas quando caem muito
                rainParticles.position.y = 50;
            }
        }

        // Lógica para o destaque de interação
        raycaster.setFromCamera(new THREE.Vector2(), camera);
        const objectsToIntersect = [...world.trees.children, ...world.stones.children, ...world.animals.children];
        const activeCampfireMesh = activeCampfire ? activeCampfire.mesh : null;
        if (activeCampfireMesh) {
            objectsToIntersect.push(activeCampfireMesh);
        }
        // NOVO: Adiciona o abrigo para interação
        const activeShelterMesh = activeShelter ? activeShelter.mesh : null;
        if (activeShelterMesh) {
            objectsToIntersect.push(activeShelterMesh);
        }

        const intersects = raycaster.intersectObjects(objectsToIntersect, true);

        if (intersects.length > 0 && intersects[0].distance < interactionHandler.maxInteractionDistance) {
            let interactableObject = intersects[0].object;
            // Percorre a hierarquia de parentes para encontrar o objeto principal (árvore, pedra, animal, fogueira, abrigo)
            while (interactableObject.parent !== null && 
                   interactableObject.parent !== world.trees && 
                   interactableObject.parent !== world.stones && 
                   interactableObject.parent !== world.animals && 
                   interactableObject !== (activeCampfire ? activeCampfire.mesh : null) && // Verifica se é o mesh da fogueira
                   interactableObject !== (activeShelter ? activeShelter.mesh : null) // NOVO: Verifica se é o mesh do abrigo
                   ) {
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
                // NOVO: Ajusta o highlight para o abrigo
                else if (activeShelter && interactableObject === activeShelter.mesh) {
                    highlightMesh.scale.set(4, 3, 4); // Ajuste o tamanho do highlight para o abrigo
                    highlightMesh.position.y = activeShelter.mesh.position.y + 1.5; // Centralize na altura do abrigo
                }
                else {
                    highlightMesh.scale.set(1.2, 1.2, 1.2);
                }
            }
        } else {
            highlightMesh.visible = false;
            highlightedObject = null;
        }
        
        // Atualiza a posição da barra de progresso do cozimento
        interactionHandler.updateCookingProgressUI(camera, renderer);

        // NOVO: Atualiza a interação com o abrigo
        if (activeShelter && highlightedObject === activeShelter.mesh && keys['KeyE']) {
            if (!isShelterModalOpen) {
                isShelterModalOpen = true;
                toggleShelterModal(true);
                document.exitPointerLock();
                renderShelterOptions(player, handleSleepInShelter);
            }
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