// js/animal.js
import * as THREE from 'three';
import { WATER_LEVEL } from './constants.js';

export default class Animal {
    constructor(scene, position, loadedModel, scale = 0.05, rotationY = 0) {
        this.mesh = new THREE.Group();
        this.velocity = new THREE.Vector3();
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.changeDirectionCooldown = 0;
        
        // NOVO: Propriedade para guardar a altura do terreno calculada no loop lento
        this.targetY = position.y;
        
        if (loadedModel) {
            this.model = loadedModel.clone(true); 
            this.model.scale.set(scale, scale, scale);
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
            console.error("Tentativa de criar um animal sem um modelo pré-carregado!");
            const geometry = new THREE.SphereGeometry(0.4, 16, 8);
            const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
            this.mesh.add(new THREE.Mesh(geometry, material));
        }

        this.mesh.position.copy(position);
        scene.add(this.mesh);
    }

    // NOVO: Loop de lógica (lento) para IA e cálculos pesados
    think(world) {
        if (!this.model) return;

        // Usa um delta de tempo fixo (50ms = 20 ticks/s)
        const LOGIC_TICK_DELTA = 0.05; 
        this.changeDirectionCooldown -= LOGIC_TICK_DELTA;

        if (this.changeDirectionCooldown <= 0) {
            this.wanderAngle += (Math.random() - 0.5) * Math.PI;
            this.changeDirectionCooldown = 2 + Math.random() * 3;
            // Gira o modelo quando a direção muda
            this.model.rotation.y = -this.wanderAngle + Math.PI / 2;
        }
        
        const speed = 1.5;
        this.velocity.x = Math.cos(this.wanderAngle) * speed;
        this.velocity.z = Math.sin(this.wanderAngle) * speed;
        
        // O único cálculo pesado fica aqui
        const checkPos = this.mesh.position.clone().add(this.velocity.clone().multiplyScalar(0.2));
        const groundY = world.getTerrainHeight(checkPos.x, checkPos.z); 
        
        if (groundY > WATER_LEVEL) {
            this.targetY = groundY + 0.4;
        } else {
            // Se o próximo ponto for na água, inverte a direção
            this.wanderAngle += Math.PI;
            this.velocity.x = -this.velocity.x;
            this.velocity.z = -this.velocity.z;
            this.model.rotation.y = -this.wanderAngle + Math.PI / 2;
        }
    }

    // MODIFICADO: Loop de renderização (rápido) para movimento suave
    update(deltaTime) { 
        if (!this.model) return;

        const moveStep = this.velocity.clone().multiplyScalar(deltaTime);
        this.mesh.position.x += moveStep.x;
        this.mesh.position.z += moveStep.z;
        
        // Interpola suavemente a altura em vez de defini-la diretamente
        this.mesh.position.y = THREE.MathUtils.lerp(this.mesh.position.y, this.targetY, 0.05);

        if (this.mesh.userData.collider) {
            this.mesh.userData.collider.position.copy(this.mesh.position);
        }
    }
}