// js/world.js
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { ISLAND_SIZE, WATER_LEVEL } from './constants.js';
import Animal from './animal.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { Water } from './Water.js';
import { createRock } from './rock.js';
import { createTerrainMaterial } from './grass.js'; // ADICIONADO: Import do novo módulo de grama

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

        const seededRandom = createSeededRandom(this.seed);
        this.noise2D = createNoise2D(seededRandom);
    }

    generate() {
        console.log(`Gerando terreno suave com a semente: ${this.seed}`);

        // --- GERAÇÃO DO TERRENO (Geometria continua igual) ---
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
        
        // Adicionar o segundo conjunto de UVs para o Ambient Occlusion funcionar
        terrainGeo.setAttribute('uv2', terrainGeo.attributes.uv);
        
        // MODIFICADO: A criação do material agora é feita por uma função externa
        const terrainMaterial = createTerrainMaterial();

        this.terrainMesh = new THREE.Mesh(terrainGeo, terrainMaterial);
        this.terrainMesh.receiveShadow = true;
        this.terrainMesh.castShadow = true;
        this.scene.add(this.terrainMesh);

        // --- GERAÇÃO DA ÁGUA ---
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

        const objPath = 'models/arvore_lp/Lowpoly_tree_sample.obj';
        const mtlPath = 'models/arvore_lp/Lowpoly_tree_sample.mtl';
        const scale = 0.5 + Math.random() * 0.5;
        const rotationY = Math.random() * Math.PI * 2;

        mtlLoader.setPath('models/arvore_lp/');
        mtlLoader.load('Lowpoly_tree_sample.mtl', (materials) => {
            materials.preload();
            objLoader.setMaterials(materials);
            objLoader.setPath('models/arvore_lp/');
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
                // Fallback
            });
        },
        undefined,
        (error) => {
            console.error('Erro ao carregar o arquivo MTL da árvore:', error);
            // Fallback
        });
    }

    createStone(x, y, z) {
        const rockObject = createRock(this.scene, new THREE.Vector3(x, y, z));
        this.stones.add(rockObject);
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
            if(this.createTreeAtRandomLocation()) {
                console.log("Árvore renasceu com sucesso!");
            }
        }
    }

    respawnStoneIfNeeded() {
        if (this.stones.children.length < this.initialStoneCount) {
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