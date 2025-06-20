// js/animal.js
import * as THREE from 'three';
// As importações de OBJLoader e MTLLoader não são mais necessárias aqui
import { WATER_LEVEL } from './constants.js';

export default class Animal {
    // MODIFICADO: O construtor agora recebe um modelo pré-carregado
    constructor(scene, position, loadedModel, scale = 0.05, rotationY = 0) {
        this.mesh = new THREE.Group();
        this.velocity = new THREE.Vector3();
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.changeDirectionCooldown = 0;
        
        // NOVO: Verifica se o modelo foi passado corretamente
        if (loadedModel) {
            // Clona o modelo pré-carregado em vez de carregar um novo
            this.model = loadedModel.clone(true); 
            this.model.scale.set(scale, scale, scale);
            
            // Ajustes de rotação e sombra como antes
            this.model.rotation.x = Math.PI / 2;
            this.model.rotation.y = rotationY;
            
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.mesh.add(this.model);
        } else {
            // Fallback: Se nenhum modelo for fornecido, cria uma esfera de erro
            console.error("Tentativa de criar um animal sem um modelo pré-carregado!");
            const geometry = new THREE.SphereGeometry(0.4, 16, 8);
            const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
            this.mesh.add(new THREE.Mesh(geometry, material));
        }

        this.mesh.position.copy(position);
        scene.add(this.mesh); // Adiciona a si mesmo na cena
    }

    // O método update permanece o mesmo, mas agora opera no modelo clonado
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
        
        const groundY = world.getTerrainHeight(nextPos.x, nextPos.z, raycaster); 
        
        if (groundY > WATER_LEVEL) {
            this.mesh.position.add(moveStep);
            this.mesh.position.y = groundY + 0.4;
            this.model.rotation.y = -this.wanderAngle + Math.PI / 2;
        } else {
            this.wanderAngle += Math.PI;
        }
    }
}