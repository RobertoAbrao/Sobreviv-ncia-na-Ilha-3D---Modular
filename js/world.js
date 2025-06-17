// js/world.js
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { ISLAND_SIZE, WATER_LEVEL } from './constants.js';
import Animal from './animal.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

function createSeededRandom(seed) {
    let s = seed;
    return function() {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
    };
}

const objLoader = new OBJLoader();
const mtlLoader = new MTLLoader();

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
        const treeGroup = new THREE.Group();
        treeGroup.position.set(x, y, z);
        this.trees.add(treeGroup);

        // ATENÇÃO: Nome do arquivo corrigido aqui
        const objPath = 'models/arvore_lp/Lowpoly_tree_sample.obj';
        const mtlPath = 'models/arvore_lp/Lowpoly_tree_sample.mtl';
        const scale = 0.5 + Math.random() * 0.5; // Ajuste a escala conforme necessário
        const rotationY = Math.random() * Math.PI * 2; // Rotação aleatória no eixo Y

        mtlLoader.setPath('models/arvore_lp/');
        // ATENÇÃO: Nome do arquivo corrigido aqui
        mtlLoader.load('Lowpoly_tree_sample.mtl', (materials) => {
            materials.preload();
            objLoader.setMaterials(materials);
            objLoader.setPath('models/arvore_lp/');
            // ATENÇÃO: Nome do arquivo corrigido aqui
            objLoader.load('Lowpoly_tree_sample.obj', (object) => {
                object.scale.set(scale, scale, scale);
                object.rotation.y = rotationY;

                object.position.y = 0;

                object.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                treeGroup.add(object);
            },
            undefined,
            (error) => {
                console.error('Erro ao carregar o modelo 3D da árvore (OBJ):', error);
                // Fallback para geometria simples se o modelo não carregar
                const trunkHeight = 2 + Math.random() * 2;
                const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, trunkHeight, 8);
                const trunkMesh = new THREE.Mesh(trunkGeo, new THREE.MeshStandardMaterial({color: 0x664422}));
                trunkMesh.position.y = trunkHeight / 2;
                trunkMesh.castShadow = true;

                // Adiciona um material verde semi-transparente para as "folhas" de fallback
                const leavesSize = 1 + Math.random();
                const leavesGeo = new THREE.IcosahedronGeometry(leavesSize, 1);
                const leavesMaterial = new THREE.MeshStandardMaterial({color: 0x228b22, transparent: true, opacity: 0.9});
                const leavesMesh = new THREE.Mesh(leavesGeo, leavesMaterial);
                leavesMesh.position.y = trunkHeight + leavesSize * 0.5;
                leavesMesh.castShadow = true;

                treeGroup.add(trunkMesh);
                treeGroup.add(leavesMesh);
            });
        },
        undefined,
        (error) => {
            console.error('Erro ao carregar o arquivo MTL da árvore:', error);
            // Fallback para OBJ sem MTL se o MTL não carregar
            objLoader.setPath('models/arvore_lp/');
            // ATENÇÃO: Nome do arquivo corrigido aqui
            objLoader.load('Lowpoly_tree_sample.obj', (object) => {
                object.scale.set(scale, scale, scale);
                object.rotation.y = rotationY;
                object.position.y = 0;
                object.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.material = new THREE.MeshStandardMaterial({ color: 0x808080 }); // Material padrão cinza
                    }
                });
                treeGroup.add(object);
            }, undefined, (objError) => {
                console.error('Erro ao carregar OBJ da árvore sem MTL:', objError);
                // Fallback final para geometria simples
                const trunkHeight = 2 + Math.random() * 2;
                const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, trunkHeight, 8);
                const trunkMesh = new THREE.Mesh(trunkGeo, new THREE.MeshStandardMaterial({color: 0x664422}));
                trunkMesh.position.y = trunkHeight / 2;
                trunkMesh.castShadow = true;

                const leavesSize = 1 + Math.random();
                const leavesGeo = new THREE.IcosahedronGeometry(leavesSize, 1);
                const leavesMaterial = new THREE.MeshStandardMaterial({color: 0x228b22, transparent: true, opacity: 0.9});
                const leavesMesh = new THREE.Mesh(leavesGeo, leavesMaterial);
                leavesMesh.position.y = trunkHeight + leavesSize * 0.5;
                leavesMesh.castShadow = true;

                treeGroup.add(trunkMesh);
                treeGroup.add(leavesMesh);
            });
        });
    }

    createStone(x, y, z) {
        const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });
        const stoneGeo = new THREE.IcosahedronGeometry(Math.random() * 0.4 + 0.2, 0);
        const stoneMesh = new THREE.Mesh(stoneGeo, stoneMaterial);
        stoneMesh.position.set(x, y + 0.2, z);
        stoneMesh.castShadow = true;
        this.stones.add(stoneMesh);
    }

    createAnimal(position, objPath = 'models/tartaruga/tartaruga.obj', mtlPath = 'models/tartaruga/tartaruga.mtl', scale = 0.05, rotationY = 0) {
        const animal = new Animal(this.scene, position, objPath, mtlPath, scale, rotationY);
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
               const newAnimalInstance = new Animal(this.scene, new THREE.Vector3(x, y + 0.4, z), 'models/tartaruga/tartaruga.obj', 'models/tartaruga/tartaruga.mtl', 0.05, Math.random() * Math.PI * 2);
               this.animals.add(newAnimalInstance.mesh);
               console.log("Animal renasceu com sucesso!");
            }
        }
    }
}