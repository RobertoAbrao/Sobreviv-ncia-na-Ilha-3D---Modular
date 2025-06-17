// js/world.js
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { ISLAND_SIZE, WATER_LEVEL } from './constants.js';
import Animal from './animal.js';

// NOVA FUNÇÃO: Cria um gerador de números pseudo-aleatórios a partir de uma semente.
// Isso garante que, para a mesma semente, a sequência de números aleatórios seja sempre a mesma.
function createSeededRandom(seed) {
    let s = seed;
    return function() {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
    };
}

export default class World {
    constructor(scene, seed) {
        this.scene = scene;
        this.seed = seed; 
        this.terrainMesh = null;
        this.waterMesh = null;
        this.trees = new THREE.Group();
        this.stones = new THREE.Group();
        this.animals = new THREE.Group();
        this.initialTreeCount = 80;
        this.initialStoneCount = 50;
        this.initialAnimalCount = 15;
        
        // MODIFICADO: Usamos nossa nova função para criar um gerador de aleatoriedade
        // baseado na semente, que é o que createNoise2D espera.
        const seededRandom = createSeededRandom(this.seed);
        this.noise2D = createNoise2D(seededRandom); 
    }

    generate() {
        console.log(`Gerando terreno suave com a semente: ${this.seed}`);
        
        const terrainGeo = new THREE.PlaneGeometry(ISLAND_SIZE, ISLAND_SIZE, 200, 200);
        terrainGeo.rotateX(-Math.PI / 2);

        const vertices = terrainGeo.attributes.position;
        const colors = [];
        const islandCenter = ISLAND_SIZE / 2;

        for (let i = 0; i < vertices.count; i++) {
            const x = vertices.getX(i);
            const z = vertices.getZ(i);

            const dist = Math.sqrt(Math.pow(x, 2) + Math.pow(z, 2));
            const falloff = (1 - Math.pow(dist / islandCenter, 2.5)) * 18;
            const noiseVal = this.noise2D((x + islandCenter) / 40, (z + islandCenter) / 40) * 6;
            let height = Math.max(0, falloff + noiseVal);
            vertices.setY(i, height);

            const sandColor = new THREE.Color(0xC2B280);
            const grassColor = new THREE.Color(0x4C7F4C);
            const rockColor = new THREE.Color(0x808080);
            let finalColor = new THREE.Color();

            if (height < WATER_LEVEL + 1.5) {
                finalColor.copy(sandColor);
            } else if (height < 12) {
                finalColor.copy(grassColor);
            } else {
                const t = Math.min(1, (height - 12) / 6);
                finalColor.lerpColors(grassColor, rockColor, t);
            }
            colors.push(finalColor.r, finalColor.g, finalColor.b);
        }
        terrainGeo.attributes.position.needsUpdate = true;
        terrainGeo.computeVertexNormals();
        terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const terrainMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.1, roughness: 0.8 });
        this.terrainMesh = new THREE.Mesh(terrainGeo, terrainMaterial);
        this.terrainMesh.receiveShadow = true;
        this.terrainMesh.castShadow = true;
        this.scene.add(this.terrainMesh);

        const waterGeo = new THREE.PlaneGeometry(ISLAND_SIZE, ISLAND_SIZE);
        waterGeo.rotateX(-Math.PI / 2);
        waterGeo.translate(0, WATER_LEVEL, 0);
        const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x1E90FF, transparent: true, opacity: 0.7, roughness: 0.1 });
        this.waterMesh = new THREE.Mesh(waterGeo, waterMaterial);
        this.scene.add(this.waterMesh);

        this.placeInitialTrees();
        this.placeInitialStones();
        this.scene.add(this.trees);
        this.scene.add(this.stones);
        this.scene.add(this.animals);
    }

    placeInitialTrees() {
        for (let i = 0; i < this.initialTreeCount; i++) {
            this.createTreeAtRandomLocation();
        }
    }

    placeInitialStones() {
        for (let i = 0; i < this.initialStoneCount; i++) {
            this.createStoneAtRandomLocation();
        }
    }
    
    createTreeAtRandomLocation() {
        const x = (Math.random() - 0.5) * ISLAND_SIZE * 0.8;
        const z = (Math.random() - 0.5) * ISLAND_SIZE * 0.8;
        const height = this.getTerrainHeight(x, z, new THREE.Raycaster());

        if (height > WATER_LEVEL + 2 && height < 12) {
            this.createTree(x, height, z);
            return true;
        }
        return false;
    }

    createStoneAtRandomLocation() {
        const x = (Math.random() - 0.5) * ISLAND_SIZE * 0.8;
        const z = (Math.random() - 0.5) * ISLAND_SIZE * 0.8;
        const height = this.getTerrainHeight(x, z, new THREE.Raycaster());

        if (height > 11) {
            this.createStone(x, height, z);
            return true;
        }
        return false;
    }
    
    createTree(x, y, z) {
        const treeMaterial = new THREE.MeshStandardMaterial({color: 0x664422});
        const leavesMaterial = new THREE.MeshStandardMaterial({color: 0x228b22});
        
        const tree = new THREE.Group();
        const trunkHeight = 2 + Math.random() * 2;
        const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, trunkHeight, 8);
        const trunkMesh = new THREE.Mesh(trunkGeo, treeMaterial);
        trunkMesh.position.y = trunkHeight / 2;
        trunkMesh.castShadow = true;
        
        const leavesSize = 1 + Math.random();
        const leavesGeo = new THREE.IcosahedronGeometry(leavesSize, 1);
        const leavesMesh = new THREE.Mesh(leavesGeo, leavesMaterial);
        leavesMesh.position.y = trunkHeight + leavesSize * 0.5;
        leavesMesh.castShadow = true;

        tree.add(trunkMesh);
        tree.add(leavesMesh);
        tree.position.set(x, y, z);
        this.trees.add(tree);
    }

    createStone(x, y, z) {
        const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });
        const stoneGeo = new THREE.IcosahedronGeometry(Math.random() * 0.4 + 0.2, 0); 
        const stoneMesh = new THREE.Mesh(stoneGeo, stoneMaterial);
        stoneMesh.position.set(x, y + 0.2, z);
        stoneMesh.castShadow = true;
        this.stones.add(stoneMesh);
    }

    createAnimal(position, color) {
        const animal = new Animal(this.scene, position, color);
        this.animals.add(animal.mesh);
        return animal;
    }
    
    getTerrainHeight(x, z, raycaster) {
        raycaster.set(new THREE.Vector3(x, 50, z), new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObject(this.terrainMesh);
        return intersects.length > 0 ? intersects[0].point.y : 0;
    }
    
    removeTree(treeObject) {
        this.trees.remove(treeObject);
    }

    removeStone(stoneObject) {
        this.stones.remove(stoneObject);
    }

    removeAnimal(animalMesh) {
        this.animals.remove(animalMesh);
    }

    respawnTreeIfNeeded() {
        if (this.trees.children.length < this.initialTreeCount) {
            console.log(`Há ${this.trees.children.length}/${this.initialTreeCount} árvores. Tentando renascer uma...`);
            if(this.createTreeAtRandomLocation()) {
                console.log("Árvore renasceu com sucesso!");
            }
        }
    }

    respawnStoneIfNeeded() {
        if (this.stones.children.length < this.initialStoneCount) {
            console.log(`Há ${this.stones.children.length}/${this.initialStoneCount} pedras. Tentando renascer uma...`);
            if(this.createStoneAtRandomLocation()) {
                console.log("Pedra renasceu com sucesso!");
            }
        }
    }

    respawnAnimalIfNeeded() {
        if (this.animals.children.length < this.initialAnimalCount) {
            const x = (Math.random() - 0.5) * ISLAND_SIZE * 0.7;
            const z = (Math.random() - 0.5) * ISLAND_SIZE * 0.7;
            const y = this.getTerrainHeight(x, z, new THREE.Raycaster());
            if(y > WATER_LEVEL) {
               const newAnimalInstance = new Animal(this.scene, new THREE.Vector3(x, y + 0.4, z), Math.random() * 0xffffff);
               this.animals.add(newAnimalInstance.mesh);
               console.log("Animal renasceu com sucesso!");
            }
        }
    }
}