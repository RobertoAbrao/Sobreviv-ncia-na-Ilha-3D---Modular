// js/physics.js
import * as THREE from 'three';
import { PLAYER_HEIGHT, WATER_LEVEL, ISLAND_SIZE } from './constants.js'; // Importe ISLAND_SIZE

export default class Physics {
    constructor(world, raycaster) {
        this.world = world;
        this.raycaster = raycaster;
        this.velocity = new THREE.Vector3();
        this.onGround = false;
        this.gravity = -30.0;
        this.playerSpeed = 5.0;
        this.jumpSpeed = 8.0;
        this.swimSpeed = 3.0; // NOVO: Velocidade de natação
    }

    update(camera, keys, deltaTime) {
        const currentGroundY = this.world.getTerrainHeight(camera.position.x, camera.position.z, this.raycaster);
        const isSwimming = camera.position.y < currentGroundY + PLAYER_HEIGHT - 0.5; // Aproximadamente metade do jogador submerso

        if (isSwimming) {
            this.velocity.y = 0; // Remove gravidade ao nadar
            this.onGround = false; // Não está no chão
            // Ajusta a velocidade do jogador ao nadar
            const swimDirection = new THREE.Vector3(
                (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0), 0,
                (keys['KeyS'] ? 1 : 0) - (keys['KeyW'] ? 1 : 0)
            );
            swimDirection.normalize().applyEuler(camera.rotation);

            this.velocity.x = swimDirection.x * this.swimSpeed;
            this.velocity.z = swimDirection.z * this.swimSpeed;
            
            // Permite subir e descer na água com espaço e shift/ctrl (ou outra tecla)
            if (keys['Space']) {
                this.velocity.y = this.swimSpeed;
            } else if (keys['ShiftLeft'] || keys['ControlLeft']) { // Exemplo: nadar para baixo
                this.velocity.y = -this.swimSpeed;
            } else {
                // Flutua para a superfície se não estiver subindo ou descendo ativamente
                if (camera.position.y < currentGroundY + PLAYER_HEIGHT - 0.2) {
                    this.velocity.y = 0.5; // Flutuação lenta
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
        this.checkCollisionsAndMove(camera, moveStep, keys, isSwimming); // Passa isSwimming
    }
    
    checkCollisionsAndMove(camera, moveStep, keys, isSwimming) {
        const groundY = this.world.getTerrainHeight(camera.position.x, camera.position.z, this.raycaster);

        // Lógica de colisão com o chão (apenas fora da água)
        if (!isSwimming && camera.position.y + moveStep.y < groundY + PLAYER_HEIGHT) {
            this.velocity.y = 0;
            moveStep.y = groundY + PLAYER_HEIGHT - camera.position.y;
            this.onGround = true;
        } else if (!isSwimming) { // Se não está nadando, pode cair
            this.onGround = false;
        }

        if (keys['Space'] && this.onGround) {
            this.velocity.y = this.jumpSpeed;
            this.onGround = false;
        }
        
        camera.position.add(moveStep);

        // NOVO: Teletransporte apenas se o jogador cair MUITO abaixo do nível da água ou for longe demais no mar
        const currentWaterLevel = this.world.waterMesh.position.y;
        if (camera.position.y < currentWaterLevel - 5 || // Cair muito fundo na água
            Math.abs(camera.position.x) > ISLAND_SIZE / 2 + 10 || // Sair da ilha no eixo X
            Math.abs(camera.position.z) > ISLAND_SIZE / 2 + 10    // Sair da ilha no eixo Z
        ) {
            camera.position.set(0, this.world.getTerrainHeight(0, 0, this.raycaster) + PLAYER_HEIGHT, 0);
            logMessage('Você foi arrastado pela correnteza ou caiu muito fundo!', 'danger');
        }
    }
}