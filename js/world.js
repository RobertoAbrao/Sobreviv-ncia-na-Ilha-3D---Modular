// js/world.js
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { ISLAND_SIZE, WATER_LEVEL } from './constants.js';
import Animal from './animal.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { Water } from './Water.js';
import { createRock } from './rock.js';
import { createTerrainMaterial } from './grass.js';

function createSeededRandom(seed) {
    let s = seed;
    return function() {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
    };
}

// NOVO: Função auxiliar para limpar a memória de um objeto 3D
function disposeObject(obj) {
    if (obj.geometry) {
        obj.geometry.dispose();
    }
    if (obj.material) {
        if (Array.isArray(obj.material)) {
            obj.material.forEach(material => material.dispose());
        } else {
            obj.material.dispose();
        }
    }
    if (obj.children) {
        obj.children.forEach(child => disposeObject(child));
    }
}


export default class World {
    constructor(scene, seed, directionalLight) {
        this.scene = scene;
        this.seed = seed;
        this.directionalLight = directionalLight;
        this.terrainMesh = null;
        this.waterMesh = null;
        this.trees = new THREE.Group();
        this.stones = new THREE.Group();
        this.animals = new THREE.Group();
        this.initialTreeCount = 80;
        this.initialStoneCount = 50;
        this.initialAnimalCount = 15;

        // NOVO: Propriedades para carregar o modelo do animal uma vez
        this.animalModel = null;
        this.animalLoaders = {
            mtl: new MTLLoader(),
            obj: new OBJLoader()
        };

        const seededRandom = createSeededRandom(this.seed);
        this.noise2D = createNoise2D(seededRandom);
    }

    // NOVO: Método para carregar o modelo do animal. Será chamado em main.js
    loadAnimalModel(callback) {
        const objPath = 'models/tartaruga/tartaruga.obj';
        const mtlPath = 'models/tartaruga/tartaruga.mtl';
        const basePath = objPath.substring(0, objPath.lastIndexOf('/') + 1);
        const mtlFileName = mtlPath.substring(mtlPath.lastIndexOf('/') + 1);
        const objFileName = objPath.substring(objPath.lastIndexOf('/') + 1);
        
        this.animalLoaders.mtl.setPath(basePath);
        this.animalLoaders.mtl.load(mtlFileName, (materials) => {
            materials.preload();
            this.animalLoaders.obj.setMaterials(materials);
            this.animalLoaders.obj.setPath(basePath);
            this.animalLoaders.obj.load(objFileName, (object) => {
                this.animalModel = object; // Armazena o modelo carregado
                console.log("Modelo do animal carregado com sucesso na memória.");
                callback(); // Chama a função de callback para continuar a criação dos animais
            }, undefined, (error) => {
                console.error("Falha ao carregar OBJ do animal.", error);
            });
        }, undefined, (error) => {
             console.error("Falha ao carregar MTL do animal.", error);
        });
    }

    generate() {
        console.log(`Gerando terreno suave com a semente: ${this.seed}`);

        const terrainGeo = new THREE.PlaneGeometry(ISLAND_SIZE, ISLAND_SIZE, 200, 200);
        terrainGeo.rotateX(-Math.PI / 2);

        const vertices = terrainGeo.attributes.position;
        const islandCenter = ISLAND_SIZE / 2;

        for (let i = 0; i < vertices.count; i++) {
            const x = vertices.getX(i);
            const z = vertices.getZ(i);

            const dist = Math.sqrt(Math.pow(x, 2) + Math.pow(z, 2));
            const falloff = (1 - Math.pow(dist / islandCenter, 2.5)) * 18;
            const noiseVal = this.noise2D((x + islandCenter) / 40, (z + islandCenter) / 40) * 6;
            let height = Math.max(0, falloff + noiseVal);
            vertices.setY(i, height);
        }
        terrainGeo.attributes.position.needsUpdate = true;
        terrainGeo.computeVertexNormals();
        
        terrainGeo.setAttribute('uv2', terrainGeo.attributes.uv);
        
        const terrainMaterial = createTerrainMaterial();

        this.terrainMesh = new THREE.Mesh(terrainGeo, terrainMaterial);
        this.terrainMesh.receiveShadow = true;
        this.terrainMesh.castShadow = true;
        this.scene.add(this.terrainMesh);

        const waterGeometry = new THREE.PlaneGeometry(ISLAND_SIZE, ISLAND_SIZE);

        this.waterMesh = new Water(
            waterGeometry,
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: new THREE.TextureLoader().load( 'textures/waternormals.jpg', function ( texture ) {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                }),
                sunDirection: this.directionalLight.position.clone().normalize(),
                sunColor: 0xffffff,
                waterColor: 0x001e0f,
                distortionScale: 3.7,
                fog: this.scene.fog !== undefined
            }
        );
        this.waterMesh.rotation.x = - Math.PI / 2;
        this.waterMesh.position.y = WATER_LEVEL;
        this.scene.add(this.waterMesh);

        this.placeInitialTrees();
        this.placeInitialStones();
        this.scene.add(this.trees);
        this.scene.add(this.stones);
        this.scene.add(this.animals);
    }

    placeInitialTrees() {
        // ... (código original sem alteração)
        for (let i = 0; i < this.initialTreeCount; i++) {
            this.createTreeAtRandomLocation();
        }
    }

    placeInitialStones() {
        // ... (código original sem alteração)
        for (let i = 0; i < this.initialStoneCount; i++) {
            this.createStoneAtRandomLocation();
        }
    }

    createTreeAtRandomLocation() {
        // ... (código original sem alteração)
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
        // ... (código original sem alteração)
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
        // ... (código original sem alteração)
        const treeGroup = new THREE.Group();
        treeGroup.position.set(x, y, z);
        this.trees.add(treeGroup);

        const mtlLoader = new MTLLoader(); // Local para evitar conflito com o loader do animal
        const objLoader = new OBJLoader();

        mtlLoader.setPath('models/arvore_lp/');
        mtlLoader.load('Lowpoly_tree_sample.mtl', (materials) => {
            materials.preload();
            objLoader.setMaterials(materials);
            objLoader.setPath('models/arvore_lp/');
            objLoader.load('Lowpoly_tree_sample.obj', (object) => {
                const scale = 0.5 + Math.random() * 0.5;
                const rotationY = Math.random() * Math.PI * 2;
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
            });
        });
    }

    createStone(x, y, z) {
        // ... (código original sem alteração)
        const rockObject = createRock(this.scene, new THREE.Vector3(x, y, z));
        this.stones.add(rockObject);
    }
    
    // MODIFICADO: Agora usa o modelo pré-carregado
    createAnimal(position) {
        if (!this.animalModel) {
            console.error("Modelo do animal ainda não carregado. Não é possível criar.");
            return null;
        }
        // A instância do Animal agora é mais simples.
        const animal = new Animal(this.scene, position, this.animalModel, 0.05, Math.random() * Math.PI * 2);
        this.animals.add(animal.mesh);
        return animal;
    }

    getTerrainHeight(x, z, raycaster) {
        // ... (código original sem alteração)
        raycaster.set(new THREE.Vector3(x, 50, z), new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObject(this.terrainMesh);
        return intersects.length > 0 ? intersects[0].point.y : 0;
    }

    // MODIFICADO: Adicionado disposeObject
    removeTree(treeObject) {
        treeObject.traverse(disposeObject);
        this.trees.remove(treeObject);
    }

    // MODIFICADO: Adicionado disposeObject
    removeStone(stoneObject) {
        stoneObject.traverse(disposeObject);
        this.stones.remove(stoneObject);
    }

    // MODIFICADO: Adicionado disposeObject
    removeAnimal(animalMesh) {
        animalMesh.traverse(disposeObject);
        this.animals.remove(animalMesh);
    }

    respawnTreeIfNeeded() {
        // ... (código original sem alteração)
        if (this.trees.children.length < this.initialTreeCount) {
            if(this.createTreeAtRandomLocation()) {
                console.log("Árvore renasceu com sucesso!");
            }
        }
    }

    respawnStoneIfNeeded() {
        // ... (código original sem alteração)
        if (this.stones.children.length < this.initialStoneCount) {
            if(this.createStoneAtRandomLocation()) {
                console.log("Pedra renasceu com sucesso!");
            }
        }
    }

    respawnAnimalIfNeeded() {
        // ... (código original sem alteração)
        if (this.animals.children.length < this.initialAnimalCount) {
            const x = (Math.random() - 0.5) * ISLAND_SIZE * 0.7;
            const z = (Math.random() - 0.5) * ISLAND_SIZE * 0.7;
            const y = this.getTerrainHeight(x, z, new THREE.Raycaster());
            if(y > WATER_LEVEL) {
               // A criação agora é mais simples
               const newAnimalInstance = this.createAnimal(new THREE.Vector3(x, y + 0.4, z));
               if (newAnimalInstance) {
                   console.log("Animal renasceu com sucesso!");
               }
            }
        }
    }
}