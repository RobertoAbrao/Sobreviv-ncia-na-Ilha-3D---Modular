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
        mtlLoader.load(mtlFileName, (materials) => {
            materials.preload();
            objLoader.setMaterials(materials);

            // Define o caminho base para o OBJLoader também, caso o OBJ referencie outros OBJs
            objLoader.setPath(basePath);

            // Agora carrega o arquivo OBJ
            objLoader.load(objFileName, (object) => {
                this.model = object;
                this.model.scale.set(scale, scale, scale);
                
                // AJUSTE PARA VIRAR A TARTARUGA (experimente estes valores)
                this.model.rotation.x = Math.PI / 2; // Gira 90 graus no eixo X (comum para modelos com Z-up)
                this.model.rotation.y = rotationY; // Rotação horizontal

                // Ativa sombras para o modelo
                this.model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this.mesh.add(this.model);
                this.mesh.position.copy(position);
            },
            undefined, // Função de progresso opcional
            (error) => {
                console.error('Erro ao carregar o modelo 3D do animal (OBJ):', error);
                const geometry = new THREE.SphereGeometry(0.4, 16, 8);
                const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                this.mesh.add(new THREE.Mesh(geometry, material));
                this.mesh.position.copy(position);
            });
        },
        undefined, // Função de progresso opcional
        (error) => {
            console.error('Erro ao carregar o arquivo MTL do animal:', error);
            objLoader.setPath(basePath);
            objLoader.load(objFileName, (object) => {
                this.model = object;
                this.model.scale.set(scale, scale, scale);
                // AJUSTE PARA VIRAR A TARTARUGA (também aqui no fallback)
                this.model.rotation.x = Math.PI / 2; // Gira 90 graus no eixo X
                this.model.rotation.y = rotationY;
                this.model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.material = new THREE.MeshStandardMaterial({ color: 0x808080 });
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

    // MODIFICADO: update agora espera um Raycaster existente
    update(deltaTime, world, raycaster) { 
        if (!this.model) return;

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
        
        // Passando o raycaster recebido para world.getTerrainHeight
        const groundY = world.getTerrainHeight(nextPos.x, nextPos.z, raycaster); 
        
        if (groundY > WATER_LEVEL) {
            this.mesh.position.add(moveStep);
            this.mesh.position.y = groundY + 0.4;
            // A rotação horizontal do modelo é relativa à sua orientação inicial
            // Se você ajustou this.model.rotation.x = Math.PI / 2; no construtor,
            // esta linha precisará compensar isso para que o "frente" do seu modelo
            // aponte para a direção do movimento quando o ângulo mudar.
            this.model.rotation.y = -this.wanderAngle + Math.PI / 2;
        } else {
            this.wanderAngle += Math.PI;
        }
    }
}