// js/interaction.js
import * as THREE from 'three';
import { logMessage } from './ui.js';
import { cookableItems } from './campfire.js'; 
import { WATER_LEVEL } from './constants.js'; // Importe WATER_LEVEL

// NOVO: Referências aos elementos da UI
const cookingProgressContainer = document.getElementById('cooking-progress-container');
const cookingProgressBar = document.getElementById('cooking-progress-bar');
const cookingProgressText = document.getElementById('cooking-progress-text');

export default class InteractionHandler {
    constructor(camera, world, player, raycaster, getActiveCampfire) {
        this.camera = camera;
        this.world = world;
        this.player = player;
        this.raycaster = raycaster;
        this.maxInteractionDistance = 5;
        this.getActiveCampfire = getActiveCampfire;
        this.isCooking = false; 
    }

    handlePrimaryAction() {
        this.raycaster.setFromCamera(new THREE.Vector2(), this.camera); 

        const objectsToIntersect = [...this.world.trees.children, ...this.world.stones.children, ...this.world.animals.children];
        const activeCampfireMesh = this.getActiveCampfire() ? this.getActiveCampfire().mesh : null;

        if (activeCampfireMesh) {
            objectsToIntersect.push(activeCampfireMesh);
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
        const isAtWaterLevel = playerPosition.y < WATER_LEVEL + 1.0; // Permite coletar se estiver na água ou um pouco acima dela

        if (isInWaterArea && isAtWaterLevel) {
            // Se o jogador estiver na área da água e em um nível adequado, permitir a coleta
            // Você pode adicionar um pequeno cooldown para evitar coleta excessiva
            this.collectWater();
            return; // Retorna para não processar outras interações imediatamente
        }


        if (intersects.length > 0) {
            const intersect = intersects[0];

            if (intersect.distance < this.maxInteractionDistance) {
                let clickedObject = intersect.object;

                while (clickedObject.parent !== null && 
                       clickedObject.parent !== this.world.trees && 
                       clickedObject.parent !== this.world.stones && 
                       clickedObject.parent !== this.world.animals &&
                       clickedObject !== activeCampfireMesh
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
                    this.interactWithCampfire();
                }
            }
        }
    }

    interactWithCampfire() {
        if (!this.getActiveCampfire()) {
            logMessage('Não há uma fogueira ativa para interagir.', 'warning');
            return;
        }
        if (this.isCooking) {
            logMessage('Já tem algo cozinhando/fervendo na fogueira.', 'warning');
            return;
        }

        if (this.player.inventory['Agua Suja'] > 0) {
            this.boilWaterAtCampfire();
            return;
        }

        const meatRecipe = cookableItems.find(item => item.produces === 'Carne Cozida' && this.player.inventory[item.name] >= item.amount);
        if (meatRecipe) {
            this.cookItemAtCampfire(meatRecipe);
            return;
        }

        logMessage('Você não tem nada para cozinhar ou ferver na fogueira.', 'warning');
    }

    cookItemAtCampfire(recipe) {
        this.isCooking = true;
        cookingProgressContainer.classList.remove('hidden');

        let processedAmount = 0;
        const totalToProcess = this.player.inventory[recipe.name];

        const processingInterval = setInterval(() => {
            if (processedAmount < totalToProcess) {
                if (this.player.consumeResources({ [recipe.name]: recipe.amount })) {
                    this.player.addToInventory(recipe.produces, recipe.amount);
                    processedAmount++;
                    
                    const progress = (processedAmount / totalToProcess) * 100;
                    cookingProgressBar.style.width = `${progress}%`;
                    cookingProgressText.textContent = `${recipe.processText} ${recipe.produces} (${processedAmount}/${totalToProcess})...`;
                    logMessage(`Você ${recipe.processVerb} ${recipe.amount}x ${recipe.produces}!`, 'success');

                    if (this.player.inventory[recipe.name] === 0) {
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

    boilWaterAtCampfire() {
        const waterRecipe = cookableItems.find(item => item.produces === 'Agua Limpa');
        if (waterRecipe && this.player.inventory[waterRecipe.name] > 0) {
            this.cookItemAtCampfire(waterRecipe);
        } else {
            logMessage('Você não tem água suja para ferver na fogueira.', 'warning');
        }
    }

    collectWater() {
        // A checagem de proximidade horizontal e vertical foi movida para handlePrimaryAction
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