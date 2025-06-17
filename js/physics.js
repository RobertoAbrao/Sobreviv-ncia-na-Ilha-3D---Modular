// js/physics.js
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

        // Ajuste para permitir que o jogador entre um pouco na água
        // Se a posição da câmera está abaixo do nível da água, mas acima de um limite "fatal",
        // ainda permita o movimento, mas ajuste a velocidade vertical.
        if (camera.position.y + moveStep.y < groundY + PLAYER_HEIGHT) {
            // Se o jogador está tentando ir para baixo do terreno ou muito abaixo da água
            if (camera.position.y + moveStep.y < WATER_LEVEL - 1.0) { // Um limite mais baixo para "afogamento"
                 camera.position.set(0, this.world.getTerrainHeight(0, 0, this.raycaster) + PLAYER_HEIGHT, 0); // Teletransporte
                 logMessage('Você não conseguiu nadar tão fundo e foi puxado para a superfície!', 'danger'); // Mensagem para o jogador
                 this.velocity.y = 0; // Zera a velocidade vertical após teletransporte
                 this.onGround = true; // Força como se estivesse no chão
                 return; // Sai da função para evitar cálculos adicionais
            } else if (camera.position.y < WATER_LEVEL + PLAYER_HEIGHT) {
                // Se o jogador está na água (ou na beira), reduza a velocidade vertical para simular flutuação
                this.velocity.y = Math.max(this.gravity * deltaTime, -0.5); // Permite afundar um pouco, mas lentamente
                this.onGround = false; // Não está no chão sólido
            }
            
            // Colisão com o chão (ou água se estiver na superfície)
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
    }
}