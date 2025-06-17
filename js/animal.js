// js/animal.js
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { WATER_LEVEL } from './constants.js';

const objLoader = new OBJLoader();
const mtlLoader = new MTLLoader();

export default class Animal {
    constructor(scene, position, objPath = 'models/tartaruga/tartaruga.obj', mtlPath = 'models/tartaruga/tartaruga.mtl', scale = 0.05, rotationY = 0) {
        this.mesh = new THREE.Group();
        this.velocity = new THREE.Vector3();
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.changeDirectionCooldown = 0;

        // Extrai o caminho base do objPath e mtlPath
        const basePath = objPath.substring(0, objPath.lastIndexOf('/') + 1);

        // Extrai apenas o nome do arquivo (ex: 'tartaruga.obj', 'tartaruga.mtl')
        const objFileName = objPath.substring(objPath.lastIndexOf('/') + 1);
        const mtlFileName = mtlPath.substring(mtlPath.lastIndexOf('/') + 1);

        // Define o caminho base para o MTLLoader
        mtlLoader.setPath(basePath);

        // Carrega o arquivo MTL primeiro para aplicar os materiais ao OBJ
        mtlLoader.load(mtlFileName, (materials) => { // AGORA USA APENAS O NOME DO ARQUIVO
            materials.preload();
            objLoader.setMaterials(materials);

            // Define o caminho base para o OBJLoader também, caso o OBJ referencie outros OBJs
            objLoader.setPath(basePath);

            // Agora carrega o arquivo OBJ
            objLoader.load(objFileName, (object) => { // AGORA USA APENAS O NOME DO ARQUIVO
                this.model = object;
                this.model.scale.set(scale, scale, scale); // Ajusta a escala do modelo
                this.model.rotation.y = rotationY; // Ajusta a rotação inicial se necessário

                // Ativa sombras para o modelo
                this.model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this.mesh.add(this.model); // Adiciona o modelo ao grupo do Animal
                this.mesh.position.copy(position); // Define a posição do grupo
            },
            undefined, // Função de progresso opcional
            (error) => {
                console.error('Erro ao carregar o modelo 3D do animal (OBJ):', error);
                // Em caso de erro, pode ser útil fallback para uma esfera ou logar
                const geometry = new THREE.SphereGeometry(0.4, 16, 8);
                const material = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Cor de erro
                this.mesh.add(new THREE.Mesh(geometry, material));
                this.mesh.position.copy(position);
            });
        },
        undefined, // Função de progresso opcional
        (error) => {
            console.error('Erro ao carregar o arquivo MTL do animal:', error);
            // Em caso de erro no MTL, tenta carregar apenas o OBJ sem materiais externos
            objLoader.setPath(basePath); // Ainda define o path para o OBJLoader
            objLoader.load(objFileName, (object) => { // AGORA USA APENAS O NOME DO ARQUIVO
                this.model = object;
                this.model.scale.set(scale, scale, scale);
                this.model.rotation.y = rotationY;
                this.model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.material = new THREE.MeshStandardMaterial({ color: 0x808080 }); // Material padrão cinza
                    }
                });
                this.mesh.add(this.model);
                this.mesh.position.copy(position);
            }, undefined, (objError) => {
                console.error('Erro ao carregar OBJ sem MTL:', objError);
                const geometry = new THREE.SphereGeometry(0.4, 16, 8);
                const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                this.mesh.add(new THREE.Mesh(geometry, material));
                this.mesh.position.copy(position);
            });
        });
    }

    update(deltaTime, world, raycaster) {
        if (!this.model) return; // Garante que o modelo foi carregado antes de tentar atualizá-lo

        this.changeDirectionCooldown -= deltaTime;
        if (this.changeDirectionCooldown <= 0) {
            this.wanderAngle += (Math.random() - 0.5) * Math.PI;
            this.changeDirectionCooldown = 2 + Math.random() * 3;
        }
        
        const speed = 1.5;
        this.velocity.x = Math.cos(this.wanderAngle) * speed;
        this.velocity.z = Math.sin(this.wanderAngle) * speed;
        
        const moveStep = this.velocity.clone().multiplyScalar(deltaTime);
        const nextPos = this.mesh.position.clone().add(moveStep);
        
        const groundY = world.getTerrainHeight(nextPos.x, nextPos.z, raycaster);
        
        if (groundY > WATER_LEVEL) {
            this.mesh.position.add(moveStep);
            this.mesh.position.y = groundY + 0.4; // Ajuste a altura do modelo em relação ao chão
            // Faça o modelo "olhar" na direção do movimento
            this.model.rotation.y = -this.wanderAngle + Math.PI / 2; // Ajuste para a frente do seu modelo
        } else {
            this.wanderAngle += Math.PI; // Inverte a direção se estiver em água
        }
    }
}