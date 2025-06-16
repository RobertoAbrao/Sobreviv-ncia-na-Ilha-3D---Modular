export default class Player {
    constructor() {
        this.health = 100;
        this.hunger = 0;
        this.thirst = 0;
        this.inventory = {}; // O inventário começa vazio
        this.hasCampfire = false; // NOVO: Flag para indicar se o jogador tem uma fogueira
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