// js/player.js
export default class Player {
    constructor() {
        this.health = 100;
        this.hunger = 0;
        this.thirst = 0;
        this.coldness = 0; // NOVO: Nível de frio
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
        this.hasShelter = false; // NOVO: Se o jogador tem um abrigo
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
    gameTick(logMessageCallback, isNight, isRaining, isNearShelterOrCampfire) { // Adicionado parâmetros
        if (this.health <= 0) return;

        this.thirst = Math.min(100, this.thirst + 1);
        this.hunger = Math.min(100, this.hunger + 0.5);
        this.coldness = Math.max(0, this.coldness - 0.5); // Reduz frio naturalmente

        if (isNight && !isNearShelterOrCampfire) { // Aumenta o frio à noite, se não estiver protegido
            this.coldness = Math.min(100, this.coldness + 3);
            logMessageCallback('Você está com frio na escuridão da noite!', 'warning');
        } else if (isRaining && !isNearShelterOrCampfire) { // Aumenta o frio na chuva, se não estiver protegido
            this.coldness = Math.min(100, this.coldness + 2);
            logMessageCallback('Você está sentindo o frio da chuva!', 'warning');
        } else if (isNearShelterOrCampfire) { // Reduz o frio se estiver perto de abrigo ou fogueira
            this.coldness = Math.max(0, this.coldness - 5);
        } else { // Se não estiver em nenhuma das condições acima (ex: dia, sem chuva)
            this.coldness = Math.max(0, this.coldness - 1); // Redução menor
        }
        
        // Verifica se há frio excessivo
        if (this.coldness >= 100) {
            this.health = Math.max(0, this.health - 3);
            logMessageCallback('Você está congelando e perdendo vida!', 'danger');
        }

        if (this.hunger >= 100 || this.thirst >= 100) {
            this.health = Math.max(0, this.health - 2);
            logMessageCallback('Você está morrendo de fome ou sede!', 'danger');
        }
    }
}