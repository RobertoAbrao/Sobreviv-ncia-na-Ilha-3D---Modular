// js/campfire.js
import * as THREE from 'three';

// Custo de recursos para construir a fogueira
export const campfireCost = {
    'Madeira': 5,
    'Pedra': 3
};

export class Campfire {
    constructor(position) {
        this.mesh = new THREE.Group();

        // Base de pedras
        const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });
        for (let i = 0; i < 5; i++) {
            const stoneGeo = new THREE.IcosahedronGeometry(0.2, 0);
            const stone = new THREE.Mesh(stoneGeo, stoneMaterial);
            const angle = (i / 5) * Math.PI * 2;
            stone.position.set(Math.cos(angle) * 0.5, 0.1, Math.sin(angle) * 0.5);
            this.mesh.add(stone);
        }

        // Lenha
        const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 5), woodMaterial);
        log1.rotateZ(Math.PI / 2);
        log1.rotateX(0.5);
        log1.position.y = 0.2;
        const log2 = log1.clone();
        log2.rotateY(Math.PI / 2);
        this.mesh.add(log1, log2);
        
        // Luz do fogo
        this.light = new THREE.PointLight(0xffaa33, 3, 10);
        this.light.position.y = 0.5;
        this.light.castShadow = true;
        this.mesh.add(this.light);

        this.mesh.position.copy(position);
        this.time = 0;
    }
    
    // Anima a luz para parecer que está piscando
    update(deltaTime) {
        this.time += deltaTime;
        this.light.intensity = 2.5 + Math.sin(this.time * 10) * 0.5;
    }
}

// NOVO: Itens que podem ser cozidos/fervidos na fogueira
export const cookableItems = [
    {
        name: 'Carne Crua',
        produces: 'Carne Cozida',
        amount: 1,
        time: 3000, // Tempo em ms para cozinhar
        processText: 'Cozinhando',
        processVerb: 'cozinhou'
    },
    {
        name: 'Peixe Cru', // NOVO: Receita para Peixe Cru
        produces: 'Peixe Cozido', // NOVO
        amount: 1, // NOVO
        time: 2500, // NOVO: Tempo para cozinhar peixe
        processText: 'Cozinhando', // NOVO
        processVerb: 'cozinhou' // NOVO
    },
    {
        name: 'Agua Suja', 
        produces: 'Agua Limpa', 
        amount: 1, 
        time: 2000, 
        processText: 'Fervendo', 
        processVerb: 'ferveu' 
    }
];