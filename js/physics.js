// js/physics.js
import * as THREE from 'three';
import { PLAYER_HEIGHT, WATER_LEVEL, ISLAND_SIZE } from './constants.js';
import { logMessage } from './ui.js';

export default class Physics {
    constructor(world) {
        // O raycaster não é mais necessário aqui
        this.world = world;
        this.velocity = new THREE.Vector3();
        this.onGround = false;
        this.gravity = -30.0;
        this.playerSpeed = 5.0;
        this.jumpSpeed = 8.0;
        this.swimSpeed = 3.0;
    }

    // NOVO: Loop de lógica (lento) para cálculos pesados
    logicUpdate(keys, camera) {
        const isSwimming = camera.position.y < WATER_LEVEL + (PLAYER_HEIGHT * 0.5);
        
        // Aplica gravidade (se não estiver nadando)
        if (!isSwimming) {
            this.velocity.y += this.gravity * (1 / 20); // Usa um delta fixo (20 ticks por segundo)
        }

        const moveDirection = new THREE.Vector3(
            (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0),
            0,
            (keys['KeyS'] ? 1 : 0) - (keys['KeyW'] ? 1 : 0)
        );
        moveDirection.normalize().applyEuler(camera.rotation);

        const currentSpeed = isSwimming ? this.swimSpeed : this.playerSpeed;
        this.velocity.x = moveDirection.x * currentSpeed;
        this.velocity.z = moveDirection.z * currentSpeed;

        // Pulo e nado vertical
        if (isSwimming) {
            this.velocity.y = 0; // Zera para natação
            if (keys['Space']) this.velocity.y = this.swimSpeed;
            else if (keys['ShiftLeft'] || keys['ControlLeft']) this.velocity.y = -this.swimSpeed;
        } else {
             if (keys['Space'] && this.onGround) {
                this.velocity.y = this.jumpSpeed;
            }
        }
    }

    // MODIFICADO: Loop de renderização (rápido) para aplicar movimento
    update(camera, deltaTime) {
        const moveStep = this.velocity.clone().multiplyScalar(deltaTime);
        const nextX = camera.position.x + moveStep.x;
        const nextZ = camera.position.z + moveStep.z;

        const groundYAtNextPos = this.world.getTerrainHeight(nextX, nextZ);
        const isSwimming = camera.position.y < WATER_LEVEL + (PLAYER_HEIGHT * 0.5);
        
        if (!isSwimming) {
            const targetPlayerY = groundYAtNextPos + PLAYER_HEIGHT;
            if (camera.position.y + moveStep.y <= targetPlayerY) {
                this.velocity.y = 0;
                moveStep.y = targetPlayerY - camera.position.y;
                this.onGround = true;
            } else {
                this.onGround = false;
            }
        } else {
             // Lógica para flutuar para a superfície
            if (this.velocity.y === 0 && camera.position.y < WATER_LEVEL + (PLAYER_HEIGHT * 0.8)) {
                camera.position.y += 0.01; 
            }
        }
        
        camera.position.add(moveStep);
        
        const currentWaterLevel = this.world.waterMesh.position.y;
        if (camera.position.y < currentWaterLevel - 10 ||
            Math.abs(camera.position.x) > ISLAND_SIZE / 2 + 10 ||
            Math.abs(camera.position.z) > ISLAND_SIZE / 2 + 10 ||
            (groundYAtNextPos === 0 && !isSwimming)
        ) {
            camera.position.set(0, this.world.getTerrainHeight(0, 0) + PLAYER_HEIGHT, 0);
            logMessage('Você foi arrastado pela correnteza, caiu muito fundo ou saiu da ilha!', 'danger');
        }
    }
}