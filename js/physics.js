// js/physics.js
import * as THREE from 'three';
import { PLAYER_HEIGHT, WATER_LEVEL, ISLAND_SIZE } from './constants.js';
import { logMessage } from './ui.js';

export default class Physics {
    constructor(world, raycaster) {
        this.world = world;
        this.raycaster = raycaster; // Mantemos o raycaster para futuras colisões (ex: com paredes)
        this.velocity = new THREE.Vector3();
        this.onGround = false;
        this.gravity = -30.0;
        this.playerSpeed = 5.0;
        this.jumpSpeed = 8.0;
        this.swimSpeed = 3.0;
    }

    update(camera, keys, deltaTime) {
        // MODIFICADO: A chamada não precisa mais do raycaster
        const currentGroundY = this.world.getTerrainHeight(camera.position.x, camera.position.z);
        const isSwimming = camera.position.y < WATER_LEVEL + (PLAYER_HEIGHT * 0.5); 

        if (isSwimming) {
            this.velocity.y = 0;
            this.onGround = false;

            const swimDirection = new THREE.Vector3(
                (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0), 0,
                (keys['KeyS'] ? 1 : 0) - (keys['KeyW'] ? 1 : 0)
            );
            swimDirection.normalize().applyEuler(camera.rotation);

            this.velocity.x = swimDirection.x * this.swimSpeed;
            this.velocity.z = swimDirection.z * this.swimSpeed;
            
            if (keys['Space']) {
                this.velocity.y = this.swimSpeed;
            } else if (keys['ShiftLeft'] || keys['ControlLeft']) {
                this.velocity.y = -this.swimSpeed;
            } else {
                if (camera.position.y < WATER_LEVEL + (PLAYER_HEIGHT * 0.8)) {
                    this.velocity.y = 0.5;
                } else {
                    this.velocity.y = 0;
                }
            }
        } else {
            this.velocity.y += this.gravity * deltaTime;
            const moveDirection = new THREE.Vector3(
                (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0), 0,
                (keys['KeyS'] ? 1 : 0) - (keys['KeyW'] ? 1 : 0)
            );
            moveDirection.normalize().applyEuler(camera.rotation);

            this.velocity.x = moveDirection.x * this.playerSpeed;
            this.velocity.z = moveDirection.z * this.playerSpeed;
        }
        
        const moveStep = this.velocity.clone().multiplyScalar(deltaTime);
        this.checkCollisionsAndMove(camera, moveStep, keys, isSwimming);
    }
    
    checkCollisionsAndMove(camera, moveStep, keys, isSwimming) {
        const nextX = camera.position.x + moveStep.x;
        const nextZ = camera.position.z + moveStep.z;
        // MODIFICADO: A chamada não precisa mais do raycaster
        const groundYAtNextPos = this.world.getTerrainHeight(nextX, nextZ);

        if (!isSwimming) {
            const targetPlayerY = groundYAtNextPos + PLAYER_HEIGHT;

            if (camera.position.y + moveStep.y < targetPlayerY) {
                this.velocity.y = 0;
                moveStep.y = targetPlayerY - camera.position.y;
                this.onGround = true;
            } else {
                this.onGround = false;
            }

            if (keys['Space'] && this.onGround) {
                this.velocity.y = this.jumpSpeed;
                this.onGround = false;
            }
        } else {
            if (camera.position.y + moveStep.y < WATER_LEVEL + (PLAYER_HEIGHT * 0.5)) {
                moveStep.y = (WATER_LEVEL + (PLAYER_HEIGHT * 0.5)) - camera.position.y;
            }
        }
        
        camera.position.add(moveStep);

        const currentWaterLevel = this.world.waterMesh.position.y;
        if (camera.position.y < currentWaterLevel - 10 ||
            Math.abs(camera.position.x) > ISLAND_SIZE / 2 + 10 ||
            Math.abs(camera.position.z) > ISLAND_SIZE / 2 + 10 ||
            (groundYAtNextPos === 0 && camera.position.y > WATER_LEVEL + 5 && !isSwimming)
        ) {
            camera.position.set(0, this.world.getTerrainHeight(0, 0) + PLAYER_HEIGHT, 0);
            logMessage('Você foi arrastado pela correnteza, caiu muito fundo ou saiu da ilha!', 'danger');
        }
    }
}