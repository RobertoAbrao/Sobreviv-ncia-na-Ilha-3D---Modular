import * as THREE from 'three';
import { PLAYER_HEIGHT, WATER_LEVEL } from './constants.js';

export default class Physics {
    constructor(world, raycaster) {
        this.world = world;
        this.raycaster = raycaster;
        this.velocity = new THREE.Vector3();
        this.onGround = false;
        this.gravity = -30.0;
        this.playerSpeed = 5.0;
        this.jumpSpeed = 8.0;
    }

    update(camera, keys, deltaTime) {
        this.velocity.y += this.gravity * deltaTime;
        const moveDirection = new THREE.Vector3(
            (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0), 0,
            (keys['KeyS'] ? 1 : 0) - (keys['KeyW'] ? 1 : 0)
        );
        moveDirection.normalize().applyEuler(camera.rotation);

        this.velocity.x = moveDirection.x * this.playerSpeed;
        this.velocity.z = moveDirection.z * this.playerSpeed;
        
        const moveStep = this.velocity.clone().multiplyScalar(deltaTime);
        this.checkCollisionsAndMove(camera, moveStep, keys);
    }
    
    checkCollisionsAndMove(camera, moveStep, keys) {
        const groundY = this.world.getTerrainHeight(camera.position.x, camera.position.z, this.raycaster);

        if (camera.position.y + moveStep.y < groundY + PLAYER_HEIGHT) {
            this.velocity.y = 0;
            moveStep.y = groundY + PLAYER_HEIGHT - camera.position.y;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        if (keys['Space'] && this.onGround) {
            this.velocity.y = this.jumpSpeed;
            this.onGround = false;
        }
        
        camera.position.add(moveStep);

        if (camera.position.y < WATER_LEVEL + 0.5) {
            camera.position.set(0, this.world.getTerrainHeight(0, 0, this.raycaster) + PLAYER_HEIGHT, 0);
        }
    }
}