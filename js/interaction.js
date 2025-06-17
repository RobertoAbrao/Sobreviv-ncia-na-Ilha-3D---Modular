// js/interaction.js
import * as THREE from 'three';
import { logMessage } from './ui.js';
import { cookableItems } from './campfire.js';

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
        this.isCooking = false; // NOVO: Flag para evitar cozimentos múltiplos
    }

    handlePrimaryAction() {
        this.raycaster.setFromCamera(new THREE.Vector2(), this.camera); 

        const objectsToIntersect = [...this.world.trees.children, ...this.world.stones.children, ...this.world.animals.children];
        const activeCampfireMesh = this.getActiveCampfire() ? this.getActiveCampfire().mesh : null;

        if (activeCampfireMesh) {
            objectsToIntersect.push(activeCampfireMesh);
        }

        const intersects = this.raycaster.intersectObjects(objectsToIntersect, true);

        if (intersects.length > 0) {
            const intersect = intersects[0];

            if (intersect.distance < this.maxInteractionDistance) {
                let clickedObject = intersect.object;

                while (clickedObject.parent !== null && 
                       clickedObject.parent !== this.world.trees && 
                       clickedObject.parent !== this.world.stones && 
                       clickedObject.parent !== this.world.animals &&
                       clickedObject !== activeCampfireMesh) {
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
                    logMessage(`Você caçou um animal e obteve ${meatAmount}x Carne Crua!`, 'success');
                }
                // Lógica para interagir com a fogueira para cozinhar
                else if (activeCampfireMesh && clickedObject === activeCampfireMesh) {
                    this.cookItemAtCampfire();
                }
            }
        }
    }

    cookItemAtCampfire() {
        if (!this.getActiveCampfire()) {
            logMessage('Não há uma fogueira ativa para cozinhar.', 'warning');
            return;
        }
        if (this.isCooking) { // Se já estiver cozinhando, não faz nada
            logMessage('Já tem algo cozinhando na fogueira.', 'warning');
            return;
        }

        const recipe = cookableItems.find(item => this.player.inventory[item.name] >= item.amount);

        if (recipe) {
            this.isCooking = true; // Define a flag de cozimento
            cookingProgressContainer.classList.remove('hidden'); // Mostra a barra

            let cookedAmount = 0;
            const totalToCook = this.player.inventory[recipe.name]; // Cozinhar todo o estoque disponível

            const cookingInterval = setInterval(() => {
                if (cookedAmount < totalToCook) {
                    this.player.consumeResources({ [recipe.name]: recipe.amount });
                    this.player.addToInventory(recipe.produces, recipe.amount);
                    cookedAmount++;
                    
                    const progress = (cookedAmount / totalToCook) * 100;
                    cookingProgressBar.style.width = `${progress}%`;
                    cookingProgressText.textContent = `Cozinhando ${recipe.produces} (${cookedAmount}/${totalToCook})...`;
                    logMessage(`Você cozinhou ${recipe.amount}x ${recipe.produces}!`, 'success');

                    if (this.player.inventory[recipe.name] === 0) { // Se acabou a carne crua, para
                        clearInterval(cookingInterval);
                        this.finishCooking();
                    }
                } else {
                    clearInterval(cookingInterval);
                    this.finishCooking();
                }
            }, recipe.time); // Tempo de cozimento por item

        } else {
            logMessage('Você não tem nada para cozinhar na fogueira (ex: Carne Crua).', 'warning');
        }
    }

    // NOVO: Função para finalizar o cozimento
    finishCooking() {
        this.isCooking = false;
        cookingProgressContainer.classList.add('hidden');
        cookingProgressBar.style.width = '0%';
        cookingProgressText.textContent = 'Cozinhando...';
        logMessage('Cozimento finalizado!', 'info');
    }

    // NOVO: Método para atualizar a posição da barra de progresso (chamado no animate loop do main.js)
    updateCookingProgressUI(camera, renderer) {
        if (!this.isCooking || !this.getActiveCampfire()) {
            cookingProgressContainer.classList.add('hidden');
            return;
        }

        const campfireMesh = this.getActiveCampfire().mesh;
        const vector = new THREE.Vector3();
        // A posição da barra deve ser um pouco acima da fogueira
        vector.set(campfireMesh.position.x, campfireMesh.position.y + 1.5, campfireMesh.position.z);
        
        // Projeta a posição 3D para coordenadas 2D da tela
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