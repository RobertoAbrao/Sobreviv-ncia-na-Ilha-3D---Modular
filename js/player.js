// js/player.js
export default class Player {
    constructor() {
        this.health = 100;
        this.hunger = 0;
        this.thirst = 0;
        this.inventory = { 
            'Madeira': 0,
            'Pedra': 0,
            'Carne Crua': 0, 
            'Carne Cozida': 0,
            'Peixe Cru': 0, // NOVO
            'Peixe Cozido': 0, // NOVO
            'Agua Suja': 0, 
            'Agua Limpa': 0 
        }; 
        this.hasCampfire = false;
        this.hasAxe = false;
        this.hasPickaxe = false;
        this.equippedTool = null;
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

    // NOVO: Função para consumir peixe cozido
    eatCookedFish(logMessageCallback) {
        if (this.inventory['Peixe Cozido'] > 0) {
            this.inventory['Peixe Cozido']--;
            this.hunger = Math.max(0, this.hunger - 30); // Restaura menos fome que carne
            this.health = Math.min(100, this.health + 3); // Restaura menos vida que carne
            logMessageCallback('Você comeu peixe cozido. É bom!', 'success');
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
    gameTick(logMessageCallback) {
        if (this.health <= 0) return;

        this.thirst = Math.min(100, this.thirst + 1);
        this.hunger = Math.min(100, this.hunger + 0.5);

        if (this.hunger >= 100 || this.thirst >= 100) {
            this.health = Math.max(0, this.health - 2);
            logMessageCallback('Você está morrendo de fome ou sede!', 'danger');
        }
    }
}