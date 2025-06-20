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
        // NOVO: Grupo para colisores de interação
        this.interactionColliders = new THREE.Group();
        this.initialTreeCount = 80;
        this.initialStoneCount = 50;
        this.initialAnimalCount = 15;

        this.animalModel = null;
        this.animalLoaders = {
            mtl: new MTLLoader(),
            obj: new OBJLoader()
        };

        const seededRandom = createSeededRandom(this.seed);
        this.noise2D = createNoise2D(seededRandom);
    }

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
                this.animalModel = object; 
                console.log("Modelo do animal carregado com sucesso na memória.");
                callback();
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
            waterGeometry, {
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
        // NOVO: Adiciona o grupo de colisores à cena
        this.scene.add(this.interactionColliders);
    }

    createTree(x, y, z) {
        const treeGroup = new THREE.Group();
        treeGroup.position.set(x, y, z);
        this.trees.add(treeGroup);

        const mtlLoader = new MTLLoader();
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

                // NOVO: Criação do colisor para a árvore
                const collider = new THREE.Mesh(
                    new THREE.BoxGeometry(1.5, 4, 1.5),
                    new THREE.MeshBasicMaterial({ visible: false })
                );
                collider.position.copy(treeGroup.position);
                collider.position.y += 2; // Centraliza a caixa na árvore
                collider.userData.parentObject = treeGroup; // Referência de volta para o objeto real
                treeGroup.userData.collider = collider; // Referência para o colisor
                this.interactionColliders.add(collider);
            });
        });
    }

    createStone(x, y, z) {
        const rockObject = createRock(this.scene, new THREE.Vector3(x, y, z));
        this.stones.add(rockObject);
        
        // NOVO: Criação do colisor para a pedra
        const collider = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 1.5, 1.5),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        collider.position.copy(rockObject.position);
        collider.userData.parentObject = rockObject;
        rockObject.userData.collider = collider;
        this.interactionColliders.add(collider);
    }

    createAnimal(position) {
        if (!this.animalModel) return null;
        const animal = new Animal(this.scene, position, this.animalModel, 0.05, Math.random() * Math.PI * 2);
        this.animals.add(animal.mesh);
        
        // NOVO: Criação do colisor para o animal
        const collider = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        // O colisor seguirá a posição do animal (mesh)
        collider.userData.parentObject = animal.mesh;
        animal.mesh.userData.collider = collider; // animal.mesh é o Group que se move
        this.interactionColliders.add(collider);

        return animal;
    }

    // MODIFICADO: Função de altura muito mais rápida, sem Raycaster.
    getTerrainHeight(x, z) {
        if (!this.terrainMesh) return 0;

        const geo = this.terrainMesh.geometry;
        const pos = geo.attributes.position;
        const width = geo.parameters.width;
        const height = geo.parameters.height;
        const wSegs = geo.parameters.widthSegments;
        const hSegs =geo.parameters.heightSegments;

        const xFrac = (x + width / 2) / width;
        const zFrac = (z + height / 2) / height;

        const xIndex = Math.floor(xFrac * wSegs);
        const zIndex = Math.floor(zFrac * hSegs);

        if (xIndex < 0 || xIndex >= wSegs || zIndex < 0 || zIndex >= hSegs) return 0;

        const v1 = zIndex * (wSegs + 1) + xIndex;
        const v2 = zIndex * (wSegs + 1) + xIndex + 1;
        const v3 = (zIndex + 1) * (wSegs + 1) + xIndex;
        const v4 = (zIndex + 1) * (wSegs + 1) + xIndex + 1;

        if (v4 >= pos.count) return 0;

        const xLocal = (xFrac * wSegs) - xIndex;
        const zLocal = (zFrac * hSegs) - zIndex;

        const h1 = pos.getY(v1);
        const h2 = pos.getY(v2);
        const h3 = pos.getY(v3);
        const h4 = pos.getY(v4);

        const topHeight = h1 * (1 - xLocal) + h2 * xLocal;
        const bottomHeight = h3 * (1 - xLocal) + h4 * xLocal;

        const finalHeight = topHeight * (1 - zLocal) + bottomHeight * zLocal;

        return finalHeight;
    }

    // MODIFICADO: Remove o colisor junto com o objeto
    removeTree(treeObject) {
        if (treeObject.userData.collider) {
            this.interactionColliders.remove(treeObject.userData.collider);
        }
        treeObject.traverse(disposeObject);
        this.trees.remove(treeObject);
    }
    
    // MODIFICADO: Remove o colisor junto com o objeto
    removeStone(stoneObject) {
        if (stoneObject.userData.collider) {
            this.interactionColliders.remove(stoneObject.userData.collider);
        }
        stoneObject.traverse(disposeObject);
        this.stones.remove(stoneObject);
    }

    // MODIFICADO: Remove o colisor junto com o objeto
    removeAnimal(animalMesh) {
        if (animalMesh.userData.collider) {
            this.interactionColliders.remove(animalMesh.userData.collider);
        }
        animalMesh.traverse(disposeObject);
        this.animals.remove(animalMesh);
    }
    
    // ... métodos de respawn sem alterações ...
    placeInitialTrees() { for (let i = 0; i < this.initialTreeCount; i++) this.createTreeAtRandomLocation(); }
    placeInitialStones() { for (let i = 0; i < this.initialStoneCount; i++) this.createStoneAtRandomLocation(); }
    createTreeAtRandomLocation() { const x = (Math.random() - 0.5) * ISLAND_SIZE * 0.8; const z = (Math.random() - 0.5) * ISLAND_SIZE * 0.8; const height = this.getTerrainHeight(x, z); if (height > WATER_LEVEL + 2 && height < 12) { this.createTree(x, height, z); return true; } return false; }
    createStoneAtRandomLocation() { const x = (Math.random() - 0.5) * ISLAND_SIZE * 0.8; const z = (Math.random() - 0.5) * ISLAND_SIZE * 0.8; const height = this.getTerrainHeight(x, z); if (height > 11) { this.createStone(x, height, z); return true; } return false; }
    respawnTreeIfNeeded() { if (this.trees.children.length < this.initialTreeCount && this.createTreeAtRandomLocation()) { console.log("Árvore renasceu com sucesso!"); } }
    respawnStoneIfNeeded() { if (this.stones.children.length < this.initialStoneCount && this.createStoneAtRandomLocation()) { console.log("Pedra renasceu com sucesso!"); } }
    respawnAnimalIfNeeded() { if (this.animals.children.length < this.initialAnimalCount) { const x = (Math.random() - 0.5) * ISLAND_SIZE * 0.7; const z = (Math.random() - 0.5) * ISLAND_SIZE * 0.7; const y = this.getTerrainHeight(x, z); if(y > WATER_LEVEL) { if (this.createAnimal(new THREE.Vector3(x, y + 0.4, z))) console.log("Animal renasceu com sucesso!"); } } }
}