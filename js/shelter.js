// js/shelter.js
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

// Crie instâncias dos loaders
const objLoader = new OBJLoader();
const mtlLoader = new MTLLoader();

export const shelterCost = {
    'Madeira': 20,
    'Pedra': 10
};

export class Shelter {
    constructor(position) {
        this.mesh = new THREE.Group();
        this.mesh.position.copy(position);

        const objPath = 'models/medieval_house/medieval house.obj';
        const mtlPath = 'models/medieval_house/medieval house.mtl';
        const texturePath = 'models/medieval_house/house2.png'; // Confirmada como PNG

        const textureLoader = new THREE.TextureLoader();
        let loadedTexture = null;

        // Carrega a textura. Esta função é assíncrona.
        textureLoader.load(texturePath,
            (texture) => {
                loadedTexture = texture;
            },
            undefined,
            (err) => {
                console.error('Erro ao carregar a textura da casa:', err);
            }
        );

        mtlLoader.setPath('models/medieval_house/');
        // Carrega o arquivo MTL
        mtlLoader.load('medieval house.mtl', (materials) => {
            materials.preload();
            objLoader.setMaterials(materials);

            objLoader.setPath('models/medieval_house/');
            objLoader.load('medieval house.obj', (object) => {
                const scale = 0.1; // Manter este como ponto de partida
                object.scale.set(scale, scale, scale);
                object.position.y = 0; // Manter este como ponto de partida

                object.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;

                        if (child.material) {
                            // Cria um novo material para não modificar o material original do loader
                            const newMaterial = Array.isArray(child.material) ? child.material.map(m => new THREE.MeshStandardMaterial().copy(m)) : new THREE.MeshStandardMaterial().copy(child.material);

                            const updateMaterial = (mat) => {
                                if (loadedTexture) {
                                    mat.map = loadedTexture;
                                }
                                mat.color.set(0xffffff); // Garante que a cor base seja branca para a textura aparecer
                                mat.transparent = false; // <<< ESSENCIAL: TORNAR OPACO (contraria o 'd 0.000000' do MTL)
                                mat.opacity = 1.0;       // <<< ESSENCIAL: TORNAR TOTALMENTE VISÍVEL
                                mat.side = THREE.DoubleSide; // <<< NOVO: Renderiza ambos os lados das faces
                                mat.needsUpdate = true; // Garante a atualização
                            };

                            if (Array.isArray(newMaterial)) {
                                newMaterial.forEach(updateMaterial);
                            } else {
                                updateMaterial(newMaterial);
                            }
                            child.material = newMaterial;
                        } else {
                            // Se não houver material, cria um novo com a textura e as propriedades corretas
                            child.material = new THREE.MeshStandardMaterial({
                                map: loadedTexture,
                                color: 0xffffff,
                                transparent: false,
                                opacity: 1.0,
                                side: THREE.DoubleSide // <<< NOVO: Também para o caso de fallback sem material
                            });
                        }
                    }
                });

                this.mesh.add(object);
                console.log('Modelo da casa carregado com sucesso!');
            },
            undefined, // Função de progresso opcional
            (error) => {
                console.error('Erro ao carregar o modelo 3D da casa (OBJ):', error);
                this.createFallbackShelter();
            });
        },
        undefined, // Função de progresso opcional
        (error) => {
            console.error('Erro ao carregar o arquivo MTL da casa:', error);
            // Fallback: Se o MTL não carregar, tenta carregar o OBJ sem materiais MTL
            objLoader.setPath('models/medieval_house/');
            objLoader.load('medieval house.obj', (object) => {
                // Use os mesmos ajustes de escala e posição do bloco de sucesso
                const scale = 0.1;
                object.scale.set(scale, scale, scale);
                object.position.y = 0;
                object.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        // Se o MTL falhou, aplicamos um material padrão e tentamos a textura
                        child.material = new THREE.MeshStandardMaterial({
                            map: loadedTexture, // Tenta aplicar a textura carregada
                            color: 0xffffff, // Cor base branca
                            transparent: false,
                            opacity: 1.0,
                            side: THREE.DoubleSide // <<< NOVO: Também para o caso de fallback sem MTL
                        });
                        child.material.needsUpdate = true;
                    }
                });
                this.mesh.add(object);
                console.log('Modelo da casa carregado sem MTL (material padrão aplicado).');
            }, undefined, (objError) => {
                console.error('Erro ao carregar OBJ da casa sem MTL:', objError);
                this.createFallbackShelter();
            });
        });
    }

    createFallbackShelter() {
        console.log('Criando barraca de fallback.');
        const baseGeo = new THREE.BoxGeometry(3.5, 0.2, 3.5);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const baseMesh = new THREE.Mesh(baseGeo, baseMaterial);
        baseMesh.position.y = 0.1;
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        this.mesh.add(baseMesh);

        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xA0522D });
        const backWallGeo = new THREE.BoxGeometry(3.5, 2.5, 0.1);
        const backWallMesh = new THREE.Mesh(backWallGeo, wallMaterial);
        backWallMesh.position.set(0, 1.35, -1.7);
        backWallMesh.castShadow = true;
        backWallMesh.receiveShadow = true;
        this.mesh.add(backWallMesh);

        const sideWallGeo = new THREE.BoxGeometry(0.1, 2.5, 3.5);
        const leftWallMesh = new THREE.Mesh(sideWallGeo, wallMaterial);
        leftWallMesh.position.set(-1.7, 1.35, 0);
        leftWallMesh.castShadow = true;
        leftWallMesh.receiveShadow = true;
        this.mesh.add(leftWallMesh);

        const rightWallMesh = new THREE.Mesh(sideWallGeo, wallMaterial);
        rightWallMesh.position.set(1.7, 1.35, 0);
        rightWallMesh.castShadow = true;
        rightWallMesh.receiveShadow = true;
        this.mesh.add(rightWallMesh);

        const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x5C4033 });
        const roofGeo = new THREE.BoxGeometry(3.8, 0.1, 4);
        const roofMesh = new THREE.Mesh(roofGeo, roofMaterial);
        roofMesh.rotation.x = -Math.PI / 12;
        roofMesh.position.set(0, 2.5, -0.2);
        roofMesh.castShadow = true;
        roofMesh.receiveShadow = true;
        this.mesh.add(roofMesh);
    }
}