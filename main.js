// main.js
import * as THREE from 'three';
import { TICK_RATE, PLAYER_HEIGHT, ISLAND_SIZE, WATER_LEVEL } from './js/constants.js';
import World from './js/world.js';
import Player from './js/player.js';
import Physics from './js/physics.js';
import InteractionHandler from './js/interaction.js';
import { Campfire, campfireCost } from './js/campfire.js';
import { Shelter, shelterCost } from './js/shelter.js';
import { updateUI, logMessage, toggleCraftingModal, renderCraftingList, selectTool, toggleInteractionModal, renderInteractionList, toggleCampfireModal, toggleShelterModal, renderShelterOptions } from './js/ui.js';
import { setInitializeGameCallback } from './js/auth.js';
import { Sky } from './js/Sky.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// --- Variáveis Globais ---
let scene, camera, renderer, clock, raycaster;
let world, player, physics, interactionHandler;
let sky, sun;
let animalsInstances = [];
let keys = {};
let highlightMesh, highlightedObject;
let activeCampfire = null, activeShelter = null;
let ambientLight, directionalLight;
let dayTime = 8, isNight = false, isRaining = false;
let rainParticles = null;
let currentUser = null, db;

// NOVO: Variáveis para o loop de lógica
let logicInterval;
const LOGIC_TICK_RATE = 50; // 50ms = 20 ticks por segundo

// --- Modais e Itens (sem alteração) ---
let isCraftingModalOpen = false, isInteractionModalOpen = false, isCampfireModalOpen = false, isShelterModalOpen = false;
const TOTAL_CYCLE_SECONDS = 480;
const craftableItems = [ { name: 'Fogueira', cost: campfireCost, effect: (player, scene, camera, world, raycaster) => { if (player.hasCampfire) { logMessage('Você já construiu uma fogueira!', 'warning'); return false; } const position = camera.position.clone(); const groundY = world.getTerrainHeight(position.x, position.z); if (groundY < WATER_LEVEL) { logMessage('Não é possível construir na água!', 'danger'); return false; } position.y = groundY + 0.1; const newCampfire = new Campfire(position); scene.add(newCampfire.mesh); activeCampfire = newCampfire; player.hasCampfire = true; player.campfireLocation = { x: position.x, y: position.y, z: position.z }; logMessage('Você construiu uma fogueira!', 'success'); return true; }, requires: null }, { name: 'Machado', cost: { 'Madeira': 10, 'Pedra': 5 }, effect: (player) => { if (player.hasAxe) { logMessage('Você já possui um machado!', 'warning'); return false; } player.hasAxe = true; logMessage('Você criou um machado!', 'success'); return true; }, requires: null }, { name: 'Picareta', cost: { 'Madeira': 10, 'Pedra': 10 }, effect: (player) => { if (player.hasPickaxe) { logMessage('Você já possui uma picareta!', 'warning'); return false; } player.hasPickaxe = true; logMessage('Você criou uma picareta!', 'success'); return true; }, requires: null }, { name: 'Abrigo', cost: shelterCost, effect: (player, scene, camera, world, raycaster) => { if (player.hasShelter) { logMessage('Você já construiu um abrigo!', 'warning'); return false; } const position = camera.position.clone(); const groundY = world.getTerrainHeight(position.x, position.z); if (groundY < WATER_LEVEL + 2) { logMessage('Não é possível construir o abrigo tão perto da água!', 'danger'); return false; } position.y = groundY; const newShelter = new Shelter(position); scene.add(newShelter.mesh); activeShelter = newShelter; player.hasShelter = true; player.shelterLocation = { x: position.x, y: position.y, z: position.z }; logMessage('Você construiu um abrigo! Um lugar para se proteger.', 'success'); return true; }, requires: null } ];


// NOVO: Função para o loop de lógica desacoplado
function logicTick() {
    // Não executa a lógica se um modal estiver aberto
    if (!world || !physics || isCraftingModalOpen || isInteractionModalOpen || isCampfireModalOpen || isShelterModalOpen) return;

    // 1. Executa a lógica da física do jogador
    physics.logicUpdate(keys, camera);

    // 2. Executa a "inteligência" de cada animal
    animalsInstances.forEach(animal => animal.think(world));
    
    // 3. Executa o raycast de interação (que é caro)
    updateInteractionHighlight();
}

function updateInteractionHighlight() {
    raycaster.setFromCamera(new THREE.Vector2(), camera);
    const objectsToIntersect = world.interactionColliders.children;
    const intersects = raycaster.intersectObjects(objectsToIntersect);

    if (intersects.length > 0 && intersects[0].distance < interactionHandler.maxInteractionDistance) {
        const interactableObject = intersects[0].object.userData.parentObject;
        if (highlightedObject !== interactableObject) {
            highlightedObject = interactableObject;
            highlightMesh.visible = true;
            // A posição e escala do highlight continuam sendo atualizadas aqui
            highlightMesh.position.copy(interactableObject.position);
            if (interactableObject.parent === world.trees) { highlightMesh.scale.set(1.5, 4, 1.5); highlightMesh.position.y = interactableObject.position.y + 2; } 
            else if (interactableObject.parent === world.stones) { highlightMesh.scale.set(1.5, 1.5, 1.5); } 
            else if (interactableObject.parent === world.animals) { highlightMesh.scale.set(1.2, 1.2, 1.2); } 
            else if (activeCampfire && interactableObject === activeCampfire.mesh) { highlightMesh.scale.set(1.5, 1.5, 1.5); highlightMesh.position.y = activeCampfire.mesh.position.y + 0.75; } 
            else if (activeShelter && interactableObject === activeShelter.mesh) { highlightMesh.scale.set(4, 3, 4); highlightMesh.position.y = activeShelter.mesh.position.y + 1.5; } 
            else { highlightMesh.scale.set(1.2, 1.2, 1.2); }
        }
    } else {
        highlightMesh.visible = false;
        highlightedObject = null;
    }
}


export async function initializeGame(user) {
    currentUser = user; db = getFirestore(); console.log("Iniciando jogo para o usuário:", currentUser.email || "Offline"); scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true }); renderer.setSize(window.innerWidth, window.innerHeight); renderer.setPixelRatio(window.devicePixelRatio); renderer.shadowMap.enabled = true; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.5; clock = new THREE.Clock(); raycaster = new THREE.Raycaster(); const highlightGeometry = new THREE.BoxGeometry(1.2, 1.2, 1.2); const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3, side: THREE.DoubleSide }); highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial); highlightMesh.visible = false; scene.add(highlightMesh); ambientLight = new THREE.AmbientLight(0xffffff, 0.7); scene.add(ambientLight); directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); directionalLight.castShadow = true; directionalLight.shadow.mapSize.set(2048, 2048); scene.add(directionalLight); sky = new Sky(); sky.scale.setScalar(ISLAND_SIZE * 3); scene.add(sky); sun = new THREE.Vector3(); player = new Player(); 
    if (user.uid !== 'offline-player') { const playerDocRef = doc(db, "players", user.uid); const docSnap = await getDoc(playerDocRef); let worldSeed; if (docSnap.exists() && docSnap.data().worldSeed) { worldSeed = docSnap.data().worldSeed; logMessage(`Semente do mundo carregada para ${user.email}!`, 'success'); if (docSnap.data().playerState) { player.loadState(docSnap.data().playerState); dayTime = docSnap.data().dayTime !== undefined ? docSnap.data().dayTime : 8; logMessage(`Progresso do jogador carregado!`, 'success'); } } else { worldSeed = Math.random(); logMessage(`Nova semente de mundo gerada para ${user.email}.`, 'info'); try { await setDoc(playerDocRef, { worldSeed: worldSeed, playerState: player.saveState(), dayTime: dayTime }, { merge: true }); logMessage('Seu novo mundo foi salvo na nuvem!', 'success'); } catch (error) { console.error("Erro ao salvar nova semente:", error); logMessage('Não foi possível salvar seu novo mundo.', 'danger'); } } world = new World(scene, worldSeed, directionalLight); } else { world = new World(scene, Math.random(), directionalLight); logMessage("Jogando offline. Progresso não será salvo.", 'info'); }
    world.generate();
    if (player.hasCampfire && player.campfireLocation) { const campfirePos = new THREE.Vector3( player.campfireLocation.x, player.campfireLocation.y, player.campfireLocation.z ); const loadedCampfire = new Campfire(campfirePos); scene.add(loadedCampfire.mesh); activeCampfire = loadedCampfire; logMessage('Fogueira carregada do progresso salvo!', 'info'); }
    if (player.hasShelter && player.shelterLocation) { const shelterPos = new THREE.Vector3( player.shelterLocation.x, player.shelterLocation.y, player.shelterLocation.z ); const loadedShelter = new Shelter(shelterPos); scene.add(loadedShelter.mesh); activeShelter = loadedShelter; logMessage('Abrigo carregado do progresso salvo!', 'info'); }
    const startX = 0, startZ = 0; const startY = world.getTerrainHeight(startX, startZ) + PLAYER_HEIGHT; camera.position.set(startX, startY, startZ);
    
    physics = new Physics(world); // Raycaster não é mais necessário no construtor
    
    interactionHandler = new InteractionHandler(camera, world, player, raycaster, () => activeCampfire, () => activeShelter); updateUI(player);
    world.loadAnimalModel(() => { console.log("Callback de carregamento do animal chamado. Criando animais..."); for(let i = 0; i < world.initialAnimalCount; i++) { const aX = (Math.random() - 0.5) * ISLAND_SIZE * 0.7; const aZ = (Math.random() - 0.5) * ISLAND_SIZE * 0.7; const aY = world.getTerrainHeight(aX, aZ); if(aY > WATER_LEVEL) { const newAnimal = world.createAnimal(new THREE.Vector3(aX, aY + 0.4, aZ)); if (newAnimal) { animalsInstances.push(newAnimal); } } } });

    initializeControls();
    // Limpa o intervalo antigo se existir e cria o novo
    if(logicInterval) clearInterval(logicInterval);
    logicInterval = setInterval(logicTick, LOGIC_TICK_RATE);

    setInterval(() => { const isNearShelterOrCampfire = checkProximityToShelterOrCampfire(); player.gameTick(logMessage, isNight, isRaining, isNearShelterOrCampfire); if (currentUser.uid !== 'offline-player') { savePlayerState(); } }, TICK_RATE);
    logMessage('Você acordou em uma ilha. Sobreviva.', 'info');
    setInterval(() => { world.respawnTreeIfNeeded(); world.respawnStoneIfNeeded(); world.respawnAnimalIfNeeded(animalsInstances); }, 15000);
    setInterval(updateWeather, 60000);
    animate();
}

// ... (funções de controles e lógica de jogo sem alterações até o animate)
async function savePlayerState() { if (!currentUser || currentUser.uid === 'offline-player' || !world) return; const playerState = player.saveState(); const fullState = { playerState: playerState, worldSeed: world.seed, dayTime: dayTime }; try { await setDoc(doc(db, "players", currentUser.uid), fullState, { merge: true }); } catch (error) { console.error("Erro ao salvar progresso:", error); } }
function initializeControls() { document.addEventListener('keydown', (e) => { keys[e.code] = true; if (e.code === 'KeyB') { isCraftingModalOpen = !isCraftingModalOpen; toggleCraftingModal(isCraftingModalOpen); if (isCraftingModalOpen) { document.exitPointerLock(); renderCraftingList(craftableItems, player, handleCraftItem); } if (isCraftingModalOpen && isInteractionModalOpen) { isInteractionModalOpen = false; toggleInteractionModal(isInteractionModalOpen); } if (isCraftingModalOpen && isCampfireModalOpen) { isCampfireModalOpen = false; toggleCampfireModal(isCampfireModalOpen); } if (isCraftingModalOpen && isShelterModalOpen) { isShelterModalOpen = false; toggleShelterModal(isShelterModalOpen); } } if (e.code === 'KeyH') { isInteractionModalOpen = !isInteractionModalOpen; toggleInteractionModal(isInteractionModalOpen); if (isInteractionModalOpen) { document.exitPointerLock(); renderInteractionList(player, handlePlayerInteraction); } if (isInteractionModalOpen && isCraftingModalOpen) { isCraftingModalOpen = false; toggleCraftingModal(isCraftingModalOpen); } if (isInteractionModalOpen && isCampfireModalOpen) { isCampfireModalOpen = false; toggleCampfireModal(isCampfireModalOpen); } if (isInteractionModalOpen && isShelterModalOpen) { isShelterModalOpen = false; toggleShelterModal(isShelterModalOpen); } } if (e.code === 'KeyK') { if (activeCampfire) { isCampfireModalOpen = !isCampfireModalOpen; toggleCampfireModal(isCampfireModalOpen); if (isCampfireModalOpen) { document.exitPointerLock(); interactionHandler.openCampfireMenu(); } if (isCampfireModalOpen && isCraftingModalOpen) { isCraftingModalOpen = false; toggleCraftingModal(isCampfireModalOpen); } if (isCampfireModalOpen && isInteractionModalOpen) { isInteractionModalOpen = false; toggleInteractionModal(isInteractionModalOpen); } if (isCampfireModalOpen && isShelterModalOpen) { isShelterModalOpen = false; toggleShelterModal(isShelterModalOpen); } } else { logMessage('Você precisa construir uma fogueira primeiro (tecla B)!', 'warning'); } } if (e.code === 'KeyL') { if (player.hasShelter) { isShelterModalOpen = !isShelterModalOpen; toggleShelterModal(isShelterModalOpen); if (isShelterModalOpen) { document.exitPointerLock(); renderShelterOptions(player, handleSleepInShelter); } if (isShelterModalOpen && isCraftingModalOpen) { isCraftingModalOpen = false; toggleCraftingModal(isCraftingModalOpen); } if (isShelterModalOpen && isInteractionModalOpen) { isInteractionModalOpen = false; toggleInteractionModal(isInteractionModalOpen); } if (isShelterModalOpen && isCampfireModalOpen) { isCampfireModalOpen = false; toggleCampfireModal(isCampfireModalOpen); } } else { logMessage('Você precisa construir um abrigo primeiro (tecla B)!', 'warning'); } } if (e.code === 'Digit1') { selectTool(player, 'Machado'); } else if (e.code === 'Digit2') { selectTool(player, 'Picareta'); } }); document.addEventListener('keyup', (e) => { keys[e.code] = false; }); document.body.addEventListener('click', () => { if (!isCraftingModalOpen && !isInteractionModalOpen && !isCampfireModalOpen && !isShelterModalOpen) { document.body.requestPointerLock(); } }); document.getElementById('close-crafting-modal').addEventListener('click', () => { isCraftingModalOpen = false; toggleCraftingModal(false); }); document.getElementById('close-interaction-modal').addEventListener('click', () => { isInteractionModalOpen = false; toggleInteractionModal(false); }); document.getElementById('close-campfire-modal').addEventListener('click', () => { isCampfireModalOpen = false; toggleCampfireModal(false); }); document.getElementById('close-shelter-modal').addEventListener('click', () => { isShelterModalOpen = false; toggleShelterModal(false); }); camera.rotation.order = 'YXZ'; document.addEventListener('mousemove', (e) => { if (document.pointerLockElement === document.body && !isCraftingModalOpen && !isInteractionModalOpen && !isCampfireModalOpen && !isShelterModalOpen) { camera.rotation.y -= e.movementX / 500; camera.rotation.x -= e.movementY / 500; camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x)); } }); document.addEventListener('mousedown', (e) => { if (document.pointerLockElement === document.body && e.button === 0 && !isCraftingModalOpen && !isInteractionModalOpen && !isCampfireModalOpen && !isShelterModalOpen) { interactionHandler.handlePrimaryAction(); } }); }
function handleCraftItem(item) { if ((item.name === 'Machado' && player.hasAxe) || (item.name === 'Picareta' && player.hasPickaxe)) { logMessage(`Você já possui ${item.name}.`, 'warning'); return; } if (item.name === 'Abrigo' && player.hasShelter) { logMessage(`Você já construiu um ${item.name}.`, 'warning'); return; } if (player.hasResources(item.cost)) { if (item.effect(player, scene, camera, world, raycaster)) { player.consumeResources(item.cost); renderCraftingList(craftableItems, player, handleCraftItem); if (currentUser.uid !== 'offline-player') { savePlayerState(); } } updateUI(player); } else { logMessage(`Você não tem recursos suficientes para criar ${item.name}.`, 'danger'); } }
function handlePlayerInteraction(actionType) { let actionSuccessful = false; if (actionType === 'eat') { actionSuccessful = player.eatCookedMeat(logMessage); } else if (actionType === 'eat-fish') { actionSuccessful = player.eatCookedFish(logMessage); } else if (actionType === 'drink') { actionSuccessful = player.drinkCleanWater(logMessage); } if (actionSuccessful && currentUser.uid !== 'offline-player') { savePlayerState(); } renderInteractionList(player, handlePlayerInteraction); updateUI(player); }
function handleSleepInShelter() { if (!player.hasShelter) { logMessage('Você precisa de um abrigo para dormir!', 'warning'); return; } if (!isNight) { logMessage('Você só pode dormir à noite para pular o tempo.', 'warning'); return; } if (!checkProximityToShelterOrCampfire()) { logMessage('Você precisa estar perto do seu abrigo para dormir.', 'warning'); return; } logMessage('Você se recolheu para dormir no abrigo.', 'info'); toggleShelterModal(false); document.body.requestPointerLock(); const currentTimeInHours = dayTime; const hoursUntilMorning = 24 - currentTimeInHours + 7; dayTime += hoursUntilMorning; if (dayTime >= 24) { dayTime -= 24; } isNight = false; logMessage('Você acordou revigorado!', 'success'); player.health = Math.min(100, player.health + 10); player.hunger = Math.min(100, player.hunger + 10); player.thirst = Math.min(100, player.thirst + 10); player.coldness = 0; if (currentUser.uid !== 'offline-player') { savePlayerState(); } }
function checkProximityToShelterOrCampfire() { const playerPosition = camera.position; const proximityRadius = 5; if (activeShelter) { const shelterPosition = activeShelter.mesh.position; const distanceToShelter = playerPosition.distanceTo(shelterPosition); if (distanceToShelter <= proximityRadius) { return true; } } if (activeCampfire) { const campfirePosition = activeCampfire.mesh.position; const distanceToCampfire = playerPosition.distanceTo(campfirePosition); if (distanceToCampfire <= proximityRadius) { return true; } } return false; }
function updateDayNightCycle(deltaTime) { dayTime += deltaTime / TOTAL_CYCLE_SECONDS * 24; if (dayTime >= 24) { dayTime -= 24; } const dayStart = 6.0; const dayEnd = 18.0; const dayDuration = dayEnd - dayStart; const dayProgress = (dayTime - dayStart) / dayDuration; const sunIntensity = Math.max(0, Math.sin(dayProgress * Math.PI)); isNight = (dayTime < dayStart || dayTime >= dayEnd); const uniforms = sky.material.uniforms; uniforms['turbidity'].value = 10; uniforms['rayleigh'].value = isNight ? 0.2 : 3; uniforms['mieCoefficient'].value = 0.005; uniforms['mieDirectionalG'].value = 0.8; const elevation = sunIntensity * 90; const azimuth = 180; const phi = THREE.MathUtils.degToRad(90 - elevation); const theta = THREE.MathUtils.degToRad(azimuth); sun.setFromSphericalCoords(1, phi, theta); uniforms['sunPosition'].value.copy(sun); directionalLight.position.copy(sun).multiplyScalar(100); directionalLight.intensity = sunIntensity * 1.5; ambientLight.intensity = sunIntensity * 0.7; updateGameTimeUI(); }
function updateWeather() { const chanceOfRain = 0.3; if (Math.random() < chanceOfRain) { isRaining = true; logMessage('Começou a chover!', 'info'); startRainEffect(); } else { if (isRaining) { logMessage('A chuva parou.', 'info'); } isRaining = false; stopRainEffect(); } }
function startRainEffect() { if (rainParticles) return; const rainGeometry = new THREE.BufferGeometry(); const positions = []; const particleCount = 2000; for (let i = 0; i < particleCount; i++) { const x = (Math.random() - 0.5) * ISLAND_SIZE * 2; const y = Math.random() * 50 + 20; const z = (Math.random() - 0.5) * ISLAND_SIZE * 2; positions.push(x, y, z); } rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); const rainMaterial = new THREE.PointsMaterial({ color: 0xADD8E6, size: 0.1, transparent: true, opacity: 0.7 }); rainParticles = new THREE.Points(rainGeometry, rainMaterial); scene.add(rainParticles); }
function stopRainEffect() { if (rainParticles) { scene.remove(rainParticles); rainParticles.geometry.dispose(); rainParticles.material.dispose(); rainParticles = null; } }
function updateGameTimeUI() { const hours = Math.floor(dayTime); const minutes = Math.floor((dayTime - hours) * 60); const formattedHours = String(hours).padStart(2, '0'); const formattedMinutes = String(minutes).padStart(2, '0'); document.getElementById('game-time-value').textContent = `${formattedHours}:${formattedMinutes}`; }


function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    if (world && world.waterMesh) {
        world.waterMesh.material.uniforms[ 'time' ].value += deltaTime;
    }

    // MODIFICADO: A lógica de movimento agora é muito mais leve
    if (!isCraftingModalOpen && !isInteractionModalOpen && !isCampfireModalOpen && !isShelterModalOpen) {
        physics.update(camera, deltaTime); // Apenas aplica movimento
        animalsInstances.forEach(animal => animal.update(deltaTime)); // Apenas aplica movimento
    }

    if (activeCampfire) activeCampfire.update(deltaTime);
    if (rainParticles) {
        rainParticles.position.y -= 10 * deltaTime;
        if (rainParticles.position.y < -20) rainParticles.position.y = 50;
    }
    
    updateDayNightCycle(deltaTime); // Atualização do céu e sol
    interactionHandler.updateCookingProgressUI(camera, renderer);
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

setInitializeGameCallback(initializeGame);