import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { ISLAND_SIZE, WATER_LEVEL } from './constants.js';

export default class World {
    constructor(scene) {
        this.scene = scene;
        this.terrainMesh = null;
        this.waterMesh = null;
        this.trees = new THREE.Group();
        this.stones = new THREE.Group(); // NOVO: Grupo para as pedras
        this.initialTreeCount = 80;
        this.initialStoneCount = 50; // NOVO: Define o número inicial de pedras
        this.noise2D = createNoise2D(Math.random);
    }

    generate() {
        console.log("Gerando terreno suave...");
        
        // ... (código de geração do terreno, sem alterações) ...
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
        this.placeInitialStones(); // NOVO: Chama a função para colocar as pedras
        this.scene.add(this.trees);
        this.scene.add(this.stones); // NOVO: Adiciona o grupo de pedras à cena
    }

    placeInitialTrees() {
        for (let i = 0; i < this.initialTreeCount; i++) {
            this.createTreeAtRandomLocation();
        }
    }

    // NOVO: Função para colocar as pedras iniciais
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

    // NOVO: Método para tentar criar uma pedra em um local aleatório
    createStoneAtRandomLocation() {
        const x = (Math.random() - 0.5) * ISLAND_SIZE * 0.8;
        const z = (Math.random() - 0.5) * ISLAND_SIZE * 0.8;
        const height = this.getTerrainHeight(x, z, new THREE.Raycaster());

        // Pedras aparecem apenas em locais altos e rochosos
        if (height > 11) {
            this.createStone(x, height, z);
            return true; // Sucesso
        }
        return false; // Falha
    }
    
    createTree(x, y, z) {
        // ... (código de criação da árvore, sem alterações) ...
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

    // NOVO: Método para criar o modelo 3D de uma pedra
    createStone(x, y, z) {
        const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });
        // Usamos Icosahedron para parecer uma pedra mais irregular
        const stoneGeo = new THREE.IcosahedronGeometry(Math.random() * 0.4 + 0.2, 0); 
        const stoneMesh = new THREE.Mesh(stoneGeo, stoneMaterial);
        stoneMesh.position.set(x, y + 0.2, z); // Posição na superfície do terreno
        stoneMesh.castShadow = true;
        this.stones.add(stoneMesh);
    }
    
    getTerrainHeight(x, z, raycaster) {
        raycaster.set(new THREE.Vector3(x, 50, z), new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObject(this.terrainMesh);
        return intersects.length > 0 ? intersects[0].point.y : 0;
    }
    
    removeTree(treeObject) {
        this.trees.remove(treeObject);
    }

    // NOVO: Método para remover uma pedra
    removeStone(stoneObject) {
        this.stones.remove(stoneObject);
    }

    respawnTreeIfNeeded() {
        if (this.trees.children.length < this.initialTreeCount) {
            console.log(`Há ${this.trees.children.length}/${this.initialTreeCount} árvores. Tentando renascer uma...`);
            if(this.createTreeAtRandomLocation()) {
                console.log("Árvore renasceu com sucesso!");
            }
        }
    }

    // NOVO: Método de regeneração para as pedras
    respawnStoneIfNeeded() {
        if (this.stones.children.length < this.initialStoneCount) {
            console.log(`Há ${this.stones.children.length}/${this.initialStoneCount} pedras. Tentando renascer uma...`);
            if(this.createStoneAtRandomLocation()) {
                console.log("Pedra renasceu com sucesso!");
            }
        }
    }
}