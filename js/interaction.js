// js/interaction.js
import * as THREE from 'three';
import { logMessage, toggleCampfireModal, renderCampfireOptions, toggleShelterModal, renderShelterOptions } from './ui.js'; // Importe as novas funções
import { cookableItems } from './campfire.js'; 
import { WATER_LEVEL } from './constants.js'; 

// NOVO: Referências aos elementos da UI
const cookingProgressContainer = document.getElementById('cooking-progress-container');
const cookingProgressBar = document.getElementById('cooking-progress-bar');
const cookingProgressText = document.getElementById('cooking-progress-text');

export default class InteractionHandler {
    constructor(camera, world, player, raycaster, getActiveCampfire, getActiveShelter) { // NOVO: Adicionado getActiveShelter
        this.camera = camera;
        this.world = world;
        this.player = player;
        this.raycaster = raycaster;
        this.maxInteractionDistance = 5;
        this.getActiveCampfire = getActiveCampfire;
        this.getActiveShelter = getActiveShelter; // NOVO
        this.isCooking = false; 
    }

    handlePrimaryAction() {
        this.raycaster.setFromCamera(new THREE.Vector2(), this.camera); 

        const objectsToIntersect = [...this.world.trees.children, ...this.world.stones.children, ...this.world.animals.children];
        const activeCampfireMesh = this.getActiveCampfire() ? this.getActiveCampfire().mesh : null;
        const activeShelterMesh = this.getActiveShelter() ? this.getActiveShelter().mesh : null; // NOVO

        if (activeCampfireMesh) {
            objectsToIntersect.push(activeCampfireMesh);
        }
        if (activeShelterMesh) { // NOVO
            objectsToIntersect.push(activeShelterMesh);
        }

        const intersects = this.raycaster.intersectObjects(objectsToIntersect, true);

        // NOVO: Coleta de água fora do loop de intersects para ser mais confiável
        const waterMeshPosition = this.world.waterMesh.position;
        const playerPosition = this.camera.position;

        // Calcula a distância horizontal até o centro do mesh de água
        const distToWaterPlane = new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(waterMeshPosition.x, waterMeshPosition.z));

        // Verifica se o jogador está na área da água (considerando o tamanho do plano)
        const isInWaterArea = distToWaterPlane < this.world.waterMesh.geometry.parameters.width / 2;

        // Verifica se o jogador está dentro de uma altura razoável para coletar água
        const isAtWaterLevel = playerPosition.y < WATER_LEVEL + 1.0; 

        if (isInWaterArea && isAtWaterLevel) {
            this.collectWater();
            return; 
        }

        if (intersects.length > 0) {
            const intersect = intersects[0];

            if (intersect.distance < this.maxInteractionDistance) {
                let clickedObject = intersect.object;

                while (clickedObject.parent !== null && 
                       clickedObject.parent !== this.world.trees && 
                       clickedObject.parent !== this.world.stones && 
                       clickedObject.parent !== this.world.animals &&
                       clickedObject !== activeCampfireMesh &&
                       clickedObject !== activeShelterMesh // NOVO
                       ) {
                    clickedObject = clickedObject.parent;
                }
                
                if (clickedObject.parent === this.world.trees) {
                    const baseAmount = 5;
                    const bonus = (this.player.equippedTool === 'Machado') ? 5 : 0; 
                    const totalAmount = baseAmount + bonus;
                    this.world.removeTree(clickedObject);
                    this.player.addToInventory('Madeira', totalAmount);
                    logMessage(`Você obteve ${totalAmount} de madeira!${bonus > 0 ? ' (Com machado!)' : ''}`, "success");
                } 
                else if (clickedObject.parent === this.world.stones) {
                    const baseAmount = 3;
                    const bonus = (this.player.equippedTool === 'Picareta') ? 3 : 0; 
                    const totalAmount = baseAmount + bonus;
                    this.world.removeStone(clickedObject);
                    this.player.addToInventory('Pedra', totalAmount);
                    logMessage(`Você obteve ${totalAmount} pedras!${bonus > 0 ? ' (Com picareta!)' : ''}`, "success");
                }
                else if (clickedObject.parent === this.world.animals) {
                    const meatAmount = 1 + Math.floor(Math.random() * 2);
                    this.world.removeAnimal(clickedObject);
                    this.player.addToInventory('Carne Crua', meatAmount);
                    logMessage(`Você caçou um animal e obtejo ${meatAmount}x Carne Crua!`, 'success');
                }
                else if (activeCampfireMesh && clickedObject === activeCampfireMesh) {
                    this.openCampfireMenu(); 
                }
                // NOVO: Interação com o abrigo (tecla E)
                else if (activeShelterMesh && clickedObject === activeShelterMesh) {
                    this.openShelterMenu();
                }
            }
        }
    }

    // NOVO: Abre o modal de opções da fogueira
    openCampfireMenu() {
        if (!this.getActiveCampfire()) {
            logMessage('Não há uma fogueira ativa para interagir.', 'warning');
            return;
        }
        if (this.isCooking) {
            logMessage('Já tem algo cozinhando/fervendo na fogueira.', 'warning');
            return;
        }

        toggleCampfireModal(true); 
        renderCampfireOptions(this.player, 
            () => this.cookItemAtCampfire('meat'), 
            () => this.boilWaterAtCampfire(),
            () => this.cookItemAtCampfire('fish') // NOVO
        );
        document.exitPointerLock(); 
    }

    // NOVO: Abre o modal de opções do abrigo
    openShelterMenu() {
        if (!this.getActiveShelter()) {
            logMessage('Não há um abrigo ativo para interagir.', 'warning');
            return;
        }
        toggleShelterModal(true);
        // Não há opções de ação dentro do abrigo ainda, mas o modal pode ser aberto.
        // As ações como "dormir" serão tratadas via keybind (ex: tecla L), mas o modal pode ser um ponto de partida.
        logMessage('Você entrou no seu abrigo. Pressione L para mais opções.', 'info');
        document.exitPointerLock();
    }


    // NOVO: Inicia o processo de cozimento de carne ou peixe
    cookItemAtCampfire(type) {
        let recipe;
        let consumedItem, producedItem;

        if (type === 'meat') {
            recipe = cookableItems.find(item => item.produces === 'Carne Cozida');
            consumedItem = 'Carne Crua';
            producedItem = 'Carne Cozida';
            if (this.player.inventory['Carne Crua'] === 0) {
                logMessage('Você não tem carne crua para cozinhar.', 'warning');
                return;
            }
        } else if (type === 'fish') { 
            recipe = cookableItems.find(item => item.produces === 'Peixe Cozido'); 
            consumedItem = 'Peixe Cru';
            producedItem = 'Peixe Cozido';
            if (this.player.inventory['Peixe Cru'] === 0) {
                logMessage('Você não tem peixe cru para cozinhar.', 'warning');
                return;
            }
        } else {
            return;
        }

        if (this.isCooking) {
            logMessage('Já tem algo cozinhando/fervendo na fogueira.', 'warning');
            return;
        }

        this.isCooking = true;
        toggleCampfireModal(false); 
        cookingProgressContainer.classList.remove('hidden');

        let processedAmount = 0;
        const totalToProcess = this.player.inventory[consumedItem];

        const processingInterval = setInterval(() => {
            if (processedAmount < totalToProcess) {
                if (this.player.consumeResources({ [consumedItem]: recipe.amount })) {
                    this.player.addToInventory(producedItem, recipe.amount);
                    processedAmount++;
                    
                    const progress = (processedAmount / totalToProcess) * 100;
                    cookingProgressBar.style.width = `${progress}%`;
                    cookingProgressText.textContent = `${recipe.processText} ${producedItem} (${processedAmount}/${totalToProcess})...`;
                    logMessage(`Você ${recipe.processVerb} ${recipe.amount}x ${producedItem}!`, 'success');

                    if (this.player.inventory[consumedItem] === 0) {
                        clearInterval(processingInterval);
                        this.finishCooking();
                    }
                } else {
                    clearInterval(processingInterval);
                    this.finishCooking();
                }
            } else {
                clearInterval(processingInterval);
                this.finishCooking();
            }
        }, recipe.time);
    }

    // NOVO: Inicia o processo de fervura de água
    boilWaterAtCampfire() {
        const waterRecipe = cookableItems.find(item => item.produces === 'Agua Limpa');
        if (!waterRecipe || this.player.inventory['Agua Suja'] === 0) {
            logMessage('Você não tem água suja para ferver na fogueira.', 'warning');
            return;
        }

        if (this.isCooking) {
            logMessage('Já tem algo cozinhando/fervendo na fogueira.', 'warning');
            return;
        }

        this.isCooking = true;
        toggleCampfireModal(false); 
        cookingProgressContainer.classList.remove('hidden');

        let processedAmount = 0;
        const totalToProcess = this.player.inventory['Agua Suja'];

        const processingInterval = setInterval(() => {
            if (processedAmount < totalToProcess) {
                if (this.player.consumeResources({ [waterRecipe.name]: waterRecipe.amount })) {
                    this.player.addToInventory(waterRecipe.produces, waterRecipe.amount);
                    processedAmount++;
                    
                    const progress = (processedAmount / totalToProcess) * 100;
                    cookingProgressBar.style.width = `${progress}%`;
                    cookingProgressText.textContent = `${waterRecipe.processText} ${waterRecipe.produces} (${processedAmount}/${totalToProcess})...`;
                    logMessage(`Você ${waterRecipe.processVerb} ${waterRecipe.amount}x ${waterRecipe.produces}!`, 'success');

                    if (this.player.inventory[waterRecipe.name] === 0) {
                        clearInterval(processingInterval);
                        this.finishCooking();
                    }
                } else {
                    clearInterval(processingInterval);
                    this.finishCooking();
                }
            } else {
                clearInterval(processingInterval);
                this.finishCooking();
            }
        }, waterRecipe.time);
    }

    collectWater() {
        this.player.addToInventory('Agua Suja', 1);
        logMessage('Você coletou um pouco de água suja. É melhor ferver antes de beber!', 'info');
        this.player.thirst = Math.min(100, this.player.thirst + 5); 
    }

    finishCooking() {
        this.isCooking = false;
        cookingProgressContainer.classList.add('hidden');
        cookingProgressBar.style.width = '0%';
        cookingProgressText.textContent = 'Cozinhando...';
        logMessage('Processo na fogueira finalizado!', 'info');
    }

    updateCookingProgressUI(camera, renderer) {
        if (!this.isCooking || !this.getActiveCampfire()) {
            cookingProgressContainer.classList.add('hidden');
            return;
        }

        const campfireMesh = this.getActiveCampfire().mesh;
        const vector = new THREE.Vector3();
        vector.set(campfireMesh.position.x, campfireMesh.position.y + 1.5, campfireMesh.position.z);
        
        vector.project(camera);

        const width = renderer.domElement.clientWidth;
        const height = renderer.domElement.clientHeight;

        const x = (vector.x * 0.5 + 0.5) * width;
        const y = (-vector.y * 0.5 + 0.5) * height;

        cookingProgressContainer.style.left = `${x}px`;
        cookingProgressContainer.style.top = `${y}px`;
        cookingProgressContainer.classList.remove('hidden');
    }
}