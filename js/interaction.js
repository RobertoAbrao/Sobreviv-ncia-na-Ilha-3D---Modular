import * as THREE from 'three';
import { logMessage } from './ui.js';

export default class InteractionHandler {
    constructor(camera, world, player, raycaster) {
        this.camera = camera;
        this.world = world;
        this.player = player; // NOVO: Referência ao objeto Player
        this.raycaster = raycaster;
        this.maxInteractionDistance = 5;
    }

    handlePrimaryAction() {
        this.raycaster.setFromCamera(new THREE.Vector2(), this.camera); 

        // Concatena as árvores e as pedras em uma única lista para verificar
        const objectsToIntersect = [...this.world.trees.children, ...this.world.stones.children];
        const intersects = this.raycaster.intersectObjects(objectsToIntersect, true);

        if (intersects.length > 0) {
            const intersect = intersects[0];

            if (intersect.distance < this.maxInteractionDistance) {
                let clickedObject = intersect.object;

                // Sobe na hierarquia para encontrar o objeto pai (o grupo da árvore ou a pedra individual)
                while (clickedObject.parent !== null && clickedObject.parent !== this.world.trees && clickedObject.parent !== this.world.stones) {
                    clickedObject = clickedObject.parent;
                }
                
                // Verifica se o objeto clicado é uma árvore
                if (clickedObject.parent === this.world.trees) {
                    const baseAmount = 5;
                    // NOVO: Bônus de coleta com machado equipado
                    const bonus = (this.player.equippedTool === 'Machado') ? 5 : 0; 
                    const totalAmount = baseAmount + bonus;
                    this.world.removeTree(clickedObject);
                    this.player.addToInventory('Madeira', totalAmount);
                    logMessage(`Você obteve ${totalAmount} de madeira!${bonus > 0 ? ' (Com machado!)' : ''}`, "success");
                } 
                // Verifica se o objeto clicado é uma pedra
                else if (clickedObject.parent === this.world.stones) {
                    const baseAmount = 3;
                    // NOVO: Bônus de coleta com picareta equipada
                    const bonus = (this.player.equippedTool === 'Picareta') ? 3 : 0; 
                    const totalAmount = baseAmount + bonus;
                    this.world.removeStone(clickedObject);
                    this.player.addToInventory('Pedra', totalAmount); // Adiciona pedras
                    logMessage(`Você obteve ${totalAmount} pedras!${bonus > 0 ? ' (Com picareta!)' : ''}`, "success");
                }
            }
        }
    }
}