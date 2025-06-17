// js/animal.js
import * as THREE from 'three';
import { WATER_LEVEL } from './constants.js';

export default class Animal {
    constructor(scene, position, color = 0xffffff) { // Remove 'scene' daqui se o world for adicionar
        const geometry = new THREE.SphereGeometry(0.4, 16, 8);
        const material = new THREE.MeshStandardMaterial({ color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;
        // scene.add(this.mesh); // REMOVER esta linha, pois o World.animals vai adicionar o mesh
        
        this.velocity = new THREE.Vector3();
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.changeDirectionCooldown = 0;
    }

    update(deltaTime, world, raycaster) {
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
            this.mesh.rotation.y = -this.wanderAngle - Math.PI / 2;
        } else {
            this.wanderAngle += Math.PI;
        }
    }
}