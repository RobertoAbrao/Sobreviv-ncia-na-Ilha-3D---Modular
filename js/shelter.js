// js/shelter.js
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

export const shelterCost = {
    'Madeira': 20,
    'Pedra': 10
};

export class Shelter {
    // MODIFICADO: O construtor agora aceita o 'manager'
    constructor(position, manager) {
        this.mesh = new THREE.Group();
        this.mesh.position.copy(position);

        // MODIFICADO: Os loaders agora usam o gerenciador central
        const objLoader = new OBJLoader(manager);
        const mtlLoader = new MTLLoader(manager);
        const textureLoader = new THREE.TextureLoader(manager);

        const mtlPath = 'models/medieval_house/medieval house.mtl';
        const texturePath = 'models/medieval_house/house2.png';

        let loadedTexture = null;

        textureLoader.load(texturePath,
            (texture) => {
                loadedTexture = texture;
                loadedTexture.colorSpace = THREE.SRGBColorSpace;
            },
            undefined,
            (err) => {
                console.error('Erro ao carregar a textura da casa:', err);
            }
        );

        mtlLoader.setPath('models/medieval_house/');
        mtlLoader.load('medieval house.mtl', (materials) => {
            materials.preload();
            objLoader.setMaterials(materials);

            objLoader.setPath('models/medieval_house/');
            objLoader.load('medieval house.obj', (object) => {
                const scale = 0.1;
                object.scale.set(scale, scale, scale);
                object.position.y = 0;

                object.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;

                        // Assegura que o material seja MeshStandardMaterial para consistência de iluminação
                        const newMaterial = new THREE.MeshStandardMaterial();
                        if (child.material.color) newMaterial.color.copy(child.material.color);
                        
                        if (loadedTexture) {
                           newMaterial.map = loadedTexture;
                        }
                        
                        newMaterial.transparent = false;
                        newMaterial.opacity = 1.0;
                        newMaterial.side = THREE.DoubleSide;
                        
                        child.material = newMaterial;
                    }
                });

                this.mesh.add(object);
                console.log('Modelo da casa carregado com sucesso!');
            },
            undefined,
            (error) => {
                console.error('Erro ao carregar o modelo 3D da casa (OBJ):', error);
                this.createFallbackShelter();
            });
        },
        undefined,
        (error) => {
            console.error('Erro ao carregar o arquivo MTL da casa:', error);
            objLoader.setPath('models/medieval_house/');
            objLoader.load('medieval house.obj', (object) => {
                const scale = 0.1;
                object.scale.set(scale, scale, scale);
                object.position.y = 0;
                object.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.material = new THREE.MeshStandardMaterial({
                            map: loadedTexture,
                            color: 0xcccccc,
                            side: THREE.DoubleSide
                        });
                    }
                });
                this.mesh.add(object);
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