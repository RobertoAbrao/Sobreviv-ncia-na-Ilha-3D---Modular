// js/physics.js
import * as THREE from 'three';
import { PLAYER_HEIGHT, WATER_LEVEL, ISLAND_SIZE } from './constants.js'; // Importe ISLAND_SIZE
import { logMessage } from './ui.js'; // Importe logMessage para mensagens no console do jogo

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
        // Pega a altura do terreno na posição ATUAL do jogador
        const currentGroundY = this.world.getTerrainHeight(camera.position.x, camera.position.z, this.raycaster);
        // Verifica se o jogador está nadando
        // Considera o jogador "nadando" se a base dele estiver abaixo do nível da água ou ligeiramente acima, submerso até a metade
        const isSwimming = camera.position.y < WATER_LEVEL + (PLAYER_HEIGHT * 0.5); 

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
                // Flutua para a superfície da água se não estiver subindo ou descendo ativamente
                // Garante que o jogador não afunde infinitamente e fique na superfície
                if (camera.position.y < WATER_LEVEL + (PLAYER_HEIGHT * 0.8)) { // Flutua até que 80% do jogador esteja fora da água
                    this.velocity.y = 0.5; // Flutuação lenta
                } else {
                    this.velocity.y = 0; // Para de flutuar ao atingir a superfície
                }
            }
        } else {
            // Aplica gravidade normalmente quando não está nadando
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
        // Pega a altura do terreno na posição FUTURA do jogador (após o movimento horizontal)
        const nextX = camera.position.x + moveStep.x;
        const nextZ = camera.position.z + moveStep.z;
        const groundYAtNextPos = this.world.getTerrainHeight(nextX, nextZ, this.raycaster);

        // Se não estiver nadando, a lógica de colisão com o chão é aplicada
        if (!isSwimming) {
            // Calcula a altura alvo do jogador: altura do terreno + altura do jogador
            const targetPlayerY = groundYAtNextPos + PLAYER_HEIGHT;

            // Se o jogador estiver abaixo da altura alvo (ou caindo para lá)
            if (camera.position.y + moveStep.y < targetPlayerY) {
                this.velocity.y = 0; // Zera a velocidade vertical para parar a queda
                moveStep.y = targetPlayerY - camera.position.y; // Ajusta o passo vertical para levá-lo exatamente ao topo
                this.onGround = true; // Marca que está no chão
            } else {
                this.onGround = false; // Se estiver no ar, não está no chão
            }

            if (keys['Space'] && this.onGround) {
                this.velocity.y = this.jumpSpeed;
                this.onGround = false;
            }
        } else {
            // Se estiver nadando, ajusta a posição Y para manter o jogador na superfície da água
            // A flutuação já é controlada no update, aqui apenas garantimos que não vá abaixo da água
            if (camera.position.y + moveStep.y < WATER_LEVEL + (PLAYER_HEIGHT * 0.5)) {
                moveStep.y = (WATER_LEVEL + (PLAYER_HEIGHT * 0.5)) - camera.position.y;
            }
        }
        
        camera.position.add(moveStep);

        // Teletransporte apenas se o jogador cair MUITO abaixo do nível da água
        // ou for longe demais no mar, ou se for para uma área inválida no terreno
        const currentWaterLevel = this.world.waterMesh.position.y;
        if (camera.position.y < currentWaterLevel - 10 || // Cair muito fundo na água
            Math.abs(camera.position.x) > ISLAND_SIZE / 2 + 10 || // Sair da ilha no eixo X
            Math.abs(camera.position.z) > ISLAND_SIZE / 2 + 10 ||    // Sair da ilha no eixo Z
            (groundYAtNextPos === 0 && camera.position.y > WATER_LEVEL + 5 && !isSwimming) // Caso caia em um buraco no terreno (fora d'água)
        ) {
            // Reposiciona o jogador para um ponto seguro
            camera.position.set(0, this.world.getTerrainHeight(0, 0, this.raycaster) + PLAYER_HEIGHT, 0);
            logMessage('Você foi arrastado pela correnteza, caiu muito fundo ou saiu da ilha!', 'danger');
        }
    }
}