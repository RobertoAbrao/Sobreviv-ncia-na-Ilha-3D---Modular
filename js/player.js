// js/player.js
export default class Player {
    constructor() {
        this.health = 100;
        this.hunger = 0;
        this.thirst = 0;
        this.coldness = 0;
        this.inventory = {
            'Madeira': 20,
            'Pedra': 20,
            'Carne Crua': 0,
            'Carne Cozida': 0,
            'Peixe Cru': 0,
            'Peixe Cozido': 0,
            'Agua Suja': 0,
            'Agua Limpa': 0
        };
        this.hasCampfire = false;
        this.campfireLocation = null; // NOVO: Propriedade para armazenar a localização da fogueira
        this.hasShelter = false;
        this.equippedTool = null;
        // Adicionar quaisquer outras propriedades que você queira persistir
        // Por exemplo, posição do jogador, mas isso seria mais complexo com 3D
        // this.position = { x: 0, y: 0, z: 0 };
    }

    // Adiciona um item ao inventário
    addToInventory(item, quantity) {
        if (this.inventory[item] === undefined) {
            this.inventory[item] = 0;
        }
        this.inventory[item] += quantity;
    }

    // Verifica se o jogador possui recursos suficientes para um custo
    hasResources(cost) {
        for (const item in cost) {
            if (this.inventory[item] === undefined || this.inventory[item] < cost[item]) {
                return false;
            }
        }
        return true;
    }

    // Consome recursos do inventário
    consumeResources(cost) {
        if (!this.hasResources(cost)) {
            return false;
        }
        for (const item in cost) {
            this.inventory[item] -= cost[item];
        }
        return true;
    }

    // Função para consumir carne cozida
    eatCookedMeat(logMessageCallback) {
        if (this.inventory['Carne Cozida'] > 0) {
            this.inventory['Carne Cozida']--;
            this.hunger = Math.max(0, this.hunger - 40);
            this.health = Math.min(100, this.health + 5);
            logMessageCallback('Você comeu carne cozida. Que delícia!', 'success');
            return true;
        } else {
            logMessageCallback('Você não tem carne cozida para comer.', 'warning');
            return false;
        }
    }

    // Função para consumir peixe cozido
    eatCookedFish(logMessageCallback) {
        if (this.inventory['Peixe Cozido'] > 0) {
            this.inventory['Peixe Cozido']--;
            this.hunger = Math.max(0, this.hunger - 30);
            this.health = Math.min(100, this.health + 3);
            logMessageCallback('Você comeu peixe cozida. É bom!', 'success');
            return true;
        } else {
            logMessageCallback('Você não tem peixe cozido para comer.', 'warning');
            return false;
        }
    }

    // Função para beber água limpa
    drinkCleanWater(logMessageCallback) {
        if (this.inventory['Agua Limpa'] > 0) {
            this.inventory['Agua Limpa']--;
            this.thirst = Math.max(0, this.thirst - 50);
            this.health = Math.min(100, this.health + 2);
            logMessageCallback('Você bebeu água limpa e refrescante!', 'success');
            return true;
        } else {
            logMessageCallback('Você não tem água limpa para beber.', 'warning');
            return false;
        }
    }

    // A lógica do "tick" do jogo que afeta o jogador
    gameTick(logMessageCallback, isNight, isRaining, isNearShelterOrCampfire) {
        if (this.health <= 0) return;

        this.thirst = Math.min(100, this.thirst + 1);
        this.hunger = Math.min(100, this.hunger + 0.5);
        this.coldness = Math.max(0, this.coldness - 0.5);

        if (isNight && !isNearShelterOrCampfire) {
            this.coldness = Math.min(100, this.coldness + 3);
            logMessageCallback('Você está com frio na escuridão da noite!', 'warning');
        } else if (isRaining && !isNearShelterOrCampfire) {
            this.coldness = Math.min(100, this.coldness + 2);
            logMessageCallback('Você está sentindo o frio da chuva!', 'warning');
        } else if (isNearDryShelterOrCampfire) { // Verifica se está em abrigo seco ou perto da fogueira
            this.coldness = Math.max(0, this.coldness - 5);
        } else {
            this.coldness = Math.max(0, this.coldness - 1);
        }

        if (this.coldness >= 100) {
            this.health = Math.max(0, this.health - 3);
            logMessageCallback('Você está congelando e perdendo vida!', 'danger');
        }

        if (this.hunger >= 100 || this.thirst >= 100) {
            this.health = Math.max(0, this.health - 2);
            logMessageCallback('Você está morrendo de fome ou sede!', 'danger');
        }
    }

    // Método para salvar o estado do jogador
    saveState() {
        return {
            health: this.health,
            hunger: this.hunger,
            thirst: this.thirst,
            coldness: this.coldness,
            inventory: { ...this.inventory }, // Copia o inventário
            hasCampfire: this.hasCampfire,
            campfireLocation: this.campfireLocation, // NOVO: Salva a localização da fogueira
            hasShelter: this.hasShelter,
            equippedTool: this.equippedTool,
            // position: { x: this.position.x, y: this.position.y, z: this.position.z }
        };
    }

    // Método para carregar o estado do jogador
    loadState(state) {
        this.health = state.health !== undefined ? state.health : 100;
        this.hunger = state.hunger !== undefined ? state.hunger : 0;
        this.thirst = state.thirst !== undefined ? state.thirst : 0;
        this.coldness = state.coldness !== undefined ? state.coldness : 0;
        this.inventory = state.inventory ? { ...state.inventory } : {
            'Madeira': 20, 'Pedra': 20, 'Carne Crua': 0, 'Carne Cozida': 0,
            'Peixe Cru': 0, 'Peixe Cozido': 0, 'Agua Suja': 0, 'Agua Limpa': 0
        };
        this.hasCampfire = state.hasCampfire !== undefined ? state.hasCampfire : false;
        this.campfireLocation = state.campfireLocation || null; // NOVO: Carrega a localização da fogueira
        this.hasShelter = state.hasShelter !== undefined ? state.hasShelter : false;
        this.equippedTool = state.equippedTool !== undefined ? state.equippedTool : null;
        // if (state.position) {
        //     this.position.x = state.position.x;
        //     this.position.y = state.position.y;
        //     this.position.z = state.position.z;
        // }
    }
}