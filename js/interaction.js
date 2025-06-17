// js/interaction.js
import * as THREE from 'three';
import { logMessage, updateUI } from './ui.js'; // Importa updateUI também
import { cookableItems } from './campfire.js';

// Variáveis para o modal de tarefa (necessário para o performTask)
const taskModal = document.getElementById('task-modal');
const taskTitle = document.getElementById('task-title');
const taskAnimation = document.getElementById('task-animation');
const taskProgressBar = document.getElementById('task-progress-bar');

let isTaskInProgress = false; // Estado para controlar se uma tarefa está em andamento

export default class InteractionHandler {
    constructor(camera, world, player, raycaster, getActiveCampfire) {
        this.camera = camera;
        this.world = world;
        this.player = player;
        this.raycaster = raycaster;
        this.maxInteractionDistance = 5;
        this.getActiveCampfire = getActiveCampfire;
    }

    // Método para desabilitar/habilitar ações durante uma tarefa
    setActionsDisabled(disabled) {
        isTaskInProgress = disabled;
        // Futuramente, você pode querer desabilitar os controles do jogador aqui
        // Por enquanto, apenas atualizamos a variável de estado
    }

    // NOVO: Função para exibir um modal de progresso para tarefas
    performTask(config) {
        const { title, animation, duration, onSuccess, onFailure } = config;
        this.setActionsDisabled(true); // Desabilita outras ações
        
        taskModal.classList.remove('hidden');
        taskTitle.textContent = title;
        taskAnimation.innerHTML = `<span>${animation}</span>`;
        taskProgressBar.style.width = '0%';
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += 50; // Incrementa o progresso
            taskProgressBar.style.width = `${Math.min(100, (progress / duration) * 100)}%`;
        }, 50);

        setTimeout(() => {
            clearInterval(interval);
            taskModal.classList.add('hidden');
            this.setActionsDisabled(false); // Habilita ações novamente
            
            // Consumo de fome/sede durante a tarefa (se aplicável) - ajustar conforme necessário
            this.player.hunger = Math.min(100, this.player.hunger + 1); 
            this.player.thirst = Math.min(100, this.player.thirst + 1);
            
            onSuccess(); // Chama a função de sucesso
            updateUI(this.player); // Atualiza a UI após a tarefa
        }, duration);
    }

    handlePrimaryAction() {
        if (isTaskInProgress) { // Impede interações se uma tarefa estiver em andamento
            logMessage('Uma tarefa já está em progresso...', 'warning');
            return;
        }

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

    // Método para cozinhar na fogueira
    cookItemAtCampfire() {
        if (!this.getActiveCampfire()) {
            logMessage('Não há uma fogueira ativa para cozinhar.', 'warning');
            return;
        }

        const recipe = cookableItems.find(item => this.player.inventory[item.name] >= item.amount);

        if (recipe) {
            this.performTask({
                title: `Cozinhando ${recipe.name}...`,
                animation: '🍳...🔥...🍖',
                duration: recipe.time, // Usa o tempo definido na receita
                onSuccess: () => {
                    this.player.consumeResources({ [recipe.name]: recipe.amount });
                    this.player.addToInventory(recipe.produces, recipe.amount);
                    logMessage(`Você cozinhou ${recipe.amount}x ${recipe.produces}!`, 'success');
                }
            });
        } else {
            logMessage('Você não tem nada para cozinhar na fogueira (ex: Carne Crua).', 'warning');
        }
    }
}