// js/player.js
export default class Player {
    constructor() {
        this.health = 100;
        this.hunger = 0;
        this.thirst = 0;
        this.inventory = { // Adicione carne crua e cozida aqui
            'Madeira': 0,
            'Pedra': 0,
            'Carne Crua': 0, 
            'Carne Cozida': 0,
            'Agua Suja': 0, // NOVO: Água Suja
            'Agua Limpa': 0 // NOVO: Água Limpa
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

    // NOVO: Verifica se o jogador possui recursos suficientes para um custo
    hasResources(cost) {
        for (const item in cost) {
            if (this.inventory[item] === undefined || this.inventory[item] < cost[item]) {
                return false;
            }
        }
        return true;
    }

    // NOVO: Consome recursos do inventário
    consumeResources(cost) {
        if (!this.hasResources(cost)) {
            return false;
        }
        for (const item in cost) {
            this.inventory[item] -= cost[item];
        }
        return true;
    }

    // NOVO: Função para consumir carne cozida
    eatCookedMeat(logMessageCallback) {
        if (this.inventory['Carne Cozida'] > 0) {
            this.inventory['Carne Cozida']--;
            this.hunger = Math.max(0, this.hunger - 40); // Reduz a fome
            this.health = Math.min(100, this.health + 5); // Regenera um pouco de vida
            logMessageCallback('Você comeu carne cozida. Que delícia!', 'success');
            return true;
        } else {
            logMessageCallback('Você não tem carne cozida para comer.', 'warning');
            return false;
        }
    }

    // NOVO: Função para beber água limpa
    drinkCleanWater(logMessageCallback) {
        if (this.inventory['Agua Limpa'] > 0) {
            this.inventory['Agua Limpa']--;
            this.thirst = Math.max(0, this.thirst - 50); // Reduz a sede
            this.health = Math.min(100, this.health + 2); // Regenera um pouco de vida
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