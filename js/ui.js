// js/ui.js
const healthBar = document.getElementById('health-bar');
const hungerBar = document.getElementById('hunger-bar');
const thirstBar = document.getElementById('thirst-bar');
const coldnessBar = document.getElementById('coldness-bar'); // NOVO
const healthValue = document.getElementById('health-value');
const hungerValue = document.getElementById('hunger-value');
const thirstValue = document.getElementById('thirst-value');
const coldnessValue = document.getElementById('coldness-value'); // NOVO
const messageLog = document.getElementById('message-log');
const inventoryList = document.getElementById('inventory-list');
const craftingModal = document.getElementById('crafting-modal');
const craftingList = document.getElementById('crafting-list');

// Elementos do modal de interação
const interactionModal = document.getElementById('interaction-modal');
const interactionList = document.getElementById('interaction-list');

// Elementos do modal da fogueira
const campfireModal = document.getElementById('campfire-modal');
const campfireOptionsList = document.getElementById('campfire-options-list');

// Elementos da hotbar
const hotbarSlot1 = document.getElementById('hotbar-slot-1');
const hotbarSlot2 = document.getElementById('hotbar-slot-2');
const hotbarItemIcon1 = hotbarSlot1.querySelector('.hotbar-item-icon');
const hotbarItemIcon2 = hotbarSlot2.querySelector('.hotbar-item-icon');

// NOVO: Elementos do modal de abrigo
const shelterModal = document.getElementById('shelter-modal');
const shelterOptionsList = document.getElementById('shelter-options-list');


// Emojis para os itens
const itemEmojis = {
    'Madeira': '🪵',
    'Pedra': '🪨',
    'Fogueira': '🔥',
    'Machado': '🪓',
    'Picareta': '⛏️',
    'Carne Crua': '🥩',
    'Carne Cozida': '🍖',
    'Agua Suja': '💧 (Suja)',
    'Agua Limpa': '💧',
    'Peixe Cru': '🐟', 
    'Peixe Cozido': '🐠',
    'Abrigo': '⛺' // NOVO
};

export function updateUI(player) {
    // Atualiza Status
    healthBar.style.width = `${player.health}%`;
    hungerBar.style.width = `${player.hunger}%`;
    thirstBar.style.width = `${player.thirst}%`;
    coldnessBar.style.width = `${player.coldness}%`; // NOVO
    healthValue.textContent = `${Math.ceil(player.health)}/100`;
    hungerValue.textContent = `${Math.ceil(player.hunger)}/100`;
    thirstValue.textContent = `${Math.ceil(player.thirst)}/100`;
    coldnessValue.textContent = `${Math.ceil(player.coldness)}/100`; // NOVO

    // Atualiza Inventário
    inventoryList.innerHTML = '';
    for (const [item, quantity] of Object.entries(player.inventory)) {
        if (quantity > 0) {
            const emoji = itemEmojis[item] || '❔';
            const itemEl = document.createElement('p');
            itemEl.textContent = `${emoji} ${item}: ${quantity}`;
            inventoryList.appendChild(itemEl);
        }
    }
    // Exibe a fogueira no inventário se o jogador a tiver
    if (player.hasCampfire) {
        const campfireEl = document.createElement('p');
        campfireEl.textContent = `${itemEmojis['Fogueira']} Fogueira (Construída)`;
        inventoryList.appendChild(campfireEl);
    }
    // NOVO: Exibe o abrigo no inventário se o jogador o tiver
    if (player.hasShelter) {
        const shelterEl = document.createElement('p');
        shelterEl.textContent = `${itemEmojis['Abrigo']} Abrigo (Construído)`;
        inventoryList.appendChild(shelterEl);
    }

    // Atualiza a Hotbar
    updateHotbar(player);
}

export function logMessage(message, type = 'normal') {
    const colors = { 
        success: 'text-green-300', 
        danger: 'text-red-400', 
        warning: 'text-yellow-300', 
        info: 'text-blue-300', 
        normal: 'text-gray-200' 
    };
    const logEntry = document.createElement('p');
    logEntry.textContent = `> ${message}`;
    logEntry.className = `p-1 text-sm ${colors[type] || 'text-gray-200'}`;
    messageLog.insertBefore(logEntry, messageLog.firstChild);
}

// Funções para o modal de crafting
export function toggleCraftingModal(show) {
    if (show) {
        craftingModal.classList.remove('hidden');
        setTimeout(() => {
            craftingModal.classList.add('show');
        }, 10);
    } else {
        craftingModal.classList.remove('show');
        setTimeout(() => {
            craftingModal.classList.add('hidden');
        }, 300);
    }
}

export function renderCraftingList(craftableItems, player, onCraft) {
    craftingList.innerHTML = '';
    for (const item of craftableItems) {
        const hasTool = (item.name === 'Machado' && player.hasAxe) || (item.name === 'Picareta' && player.hasPickaxe);
        // NOVO: Verifica se o abrigo já foi construído
        const hasShelter = (item.name === 'Abrigo' && player.hasShelter);
        const canCraft = player.hasResources(item.cost) && (!item.requires || player[item.requires]) && !hasTool && !hasShelter; // NOVO

        const itemEl = document.createElement('div');
        itemEl.className = 'crafting-item';
        
        let requirementsHtml = 'Custo: ';
        for (const res in item.cost) {
            const emoji = itemEmojis[res] || '';
            requirementsHtml += `${emoji} ${res}: ${item.cost[res]} / ${player.inventory[res] || 0} `;
        }
        if (item.requires) {
            requirementsHtml += `(Requer: ${item.requires === 'hasCampfire' ? 'Fogueira' : item.requires})`;
        }
        if (hasTool) {
            requirementsHtml = `Você já possui ${item.name}!`;
        }
        // NOVO: Mensagem se o abrigo já foi construído
        if (hasShelter) {
            requirementsHtml = `Você já construiu um ${item.name}!`;
        }

        itemEl.innerHTML = `
            <div>
                <h3 class="font-semibold text-lg">${itemEmojis[item.name] || '❔'} ${item.name}</h3>
                <p class="crafting-requirements">${requirementsHtml}</p>
            </div>
            <button data-item="${item.name}" ${canCraft ? '' : 'disabled'}>Criar</button>
        `;
        craftingList.appendChild(itemEl);

        if (canCraft) {
            itemEl.querySelector('button').addEventListener('click', () => onCraft(item));
        }
    }
}

// Funções para o modal de interação (comer/beber)
export function toggleInteractionModal(show) {
    if (show) {
        interactionModal.classList.remove('hidden');
        setTimeout(() => {
            interactionModal.classList.add('show');
        }, 10);
    } else {
        interactionModal.classList.remove('show');
        setTimeout(() => {
            interactionModal.classList.add('hidden');
        }, 300);
    }
}

export function renderInteractionList(player, onAction) {
    interactionList.innerHTML = '';

    // Botão Comer Carne Cozida
    const eatMeatButton = document.createElement('div');
    eatMeatButton.className = 'crafting-item'; // Reutilizando estilo
    const canEatMeat = player.inventory['Carne Cozida'] > 0;
    eatMeatButton.innerHTML = `
        <div>
            <h3 class="font-semibold text-lg">${itemEmojis['Carne Cozida']} Comer Carne Cozida</h3>
            <p class="crafting-requirements">Em inventário: ${player.inventory['Carne Cozida'] || 0}</p>
        </div>
        <button data-action="eat" ${canEatMeat ? '' : 'disabled'}>Comer</button>
    `;
    interactionList.appendChild(eatMeatButton);
    if (canEatMeat) {
        eatMeatButton.querySelector('button').addEventListener('click', () => onAction('eat'));
    }

    // Botão Comer Peixe Cozido
    const eatFishButton = document.createElement('div'); // NOVO
    eatFishButton.className = 'crafting-item'; 
    const canEatFish = player.inventory['Peixe Cozido'] > 0;
    eatFishButton.innerHTML = `
        <div>
            <h3 class="font-semibold text-lg">${itemEmojis['Peixe Cozido']} Comer Peixe Cozido</h3>
            <p class="crafting-requirements">Em inventário: ${player.inventory['Peixe Cozido'] || 0}</p>
        </div>
        <button data-action="eat-fish" ${canEatFish ? '' : 'disabled'}>Comer</button>
    `;
    interactionList.appendChild(eatFishButton);
    if (canEatFish) {
        eatFishButton.querySelector('button').addEventListener('click', () => onAction('eat-fish'));
    }

    // Botão Beber Água Limpa
    const drinkWaterButton = document.createElement('div');
    drinkWaterButton.className = 'crafting-item'; // Reutilizando estilo
    const canDrinkWater = player.inventory['Agua Limpa'] > 0;
    drinkWaterButton.innerHTML = `
        <div>
            <h3 class="font-semibold text-lg">${itemEmojis['Agua Limpa']} Beber Água Limpa</h3>
            <p class="crafting-requirements">Em inventário: ${player.inventory['Agua Limpa'] || 0}</p>
        </div>
        <button data-action="drink" ${canDrinkWater ? '' : 'disabled'}>Beber</button>
    `;
    interactionList.appendChild(drinkWaterButton);
    if (canDrinkWater) {
        drinkWaterButton.querySelector('button').addEventListener('click', () => onAction('drink'));
    }
}

// Funções para o modal da fogueira
export function toggleCampfireModal(show) {
    if (show) {
        campfireModal.classList.remove('hidden');
        setTimeout(() => {
            campfireModal.classList.add('show');
        }, 10);
    } else {
        campfireModal.classList.remove('show');
        setTimeout(() => {
            campfireModal.classList.add('hidden');
        }, 300);
    }
}

export function renderCampfireOptions(player, onCookMeat, onBoilWater, onCookFish) { // Adicionado onCookFish
    campfireOptionsList.innerHTML = '';

    // Opção: Cozinhar Carne Crua
    const cookMeatOption = document.createElement('div');
    cookMeatOption.className = 'crafting-item';
    const canCookMeat = player.inventory['Carne Crua'] > 0;
    cookMeatOption.innerHTML = `
        <div>
            <h3 class="font-semibold text-lg">${itemEmojis['Carne Crua']} Cozinhar Carne</h3>
            <p class="crafting-requirements">Em inventário: ${player.inventory['Carne Crua'] || 0}</p>
        </div>
        <button data-action="cook-meat" ${canCookMeat ? '' : 'disabled'}>Cozinhar</button>
    `;
    campfireOptionsList.appendChild(cookMeatOption);
    if (canCookMeat) {
        cookMeatOption.querySelector('button').addEventListener('click', onCookMeat);
    }

    // Opção: Cozinhar Peixe Cru
    const cookFishOption = document.createElement('div');
    cookFishOption.className = 'crafting-item';
    const canCookFish = player.inventory['Peixe Cru'] > 0;
    cookFishOption.innerHTML = `
        <div>
            <h3 class="font-semibold text-lg">${itemEmojis['Peixe Cru']} Cozinhar Peixe</h3>
            <p class="crafting-requirements">Em inventário: ${player.inventory['Peixe Cru'] || 0}</p>
        </div>
        <button data-action="cook-fish" ${canCookFish ? '' : 'disabled'}>Cozinhar</button>
    `;
    campfireOptionsList.appendChild(cookFishOption);
    if (canCookFish) {
        cookFishOption.querySelector('button').addEventListener('click', onCookFish); // Chama onCookFish
    }

    // Opção: Ferver Água Suja
    const boilWaterOption = document.createElement('div');
    boilWaterOption.className = 'crafting-item';
    const canBoilWater = player.inventory['Agua Suja'] > 0;
    boilWaterOption.innerHTML = `
        <div>
            <h3 class="font-semibold text-lg">${itemEmojis['Agua Suja']} Ferver Água</h3>
            <p class="crafting-requirements">Em inventário: ${player.inventory['Agua Suja'] || 0}</p>
        </div>
        <button data-action="boil-water" ${canBoilWater ? '' : 'disabled'}>Ferver</button>
    `;
    campfireOptionsList.appendChild(boilWaterOption);
    if (canBoilWater) {
        boilWaterOption.querySelector('button').addEventListener('click', onBoilWater);
    }
}


// NOVO: Funções para o modal de abrigo
export function toggleShelterModal(show) {
    if (show) {
        shelterModal.classList.remove('hidden');
        setTimeout(() => {
            shelterModal.classList.add('show');
        }, 10);
    } else {
        shelterModal.classList.remove('show');
        setTimeout(() => {
            shelterModal.classList.add('hidden');
        }, 300);
    }
}

export function renderShelterOptions(player, onSleep) {
    shelterOptionsList.innerHTML = '';

    // Opção: Dormir na barraca
    const sleepOption = document.createElement('div');
    sleepOption.className = 'crafting-item';
    // Condição para dormir: Só pode dormir à noite
    const canSleep = true; // A condição de ser noite será verificada na função `onSleep`
    sleepOption.innerHTML = `
        <div>
            <h3 class="font-semibold text-lg">😴 Dormir na Barraca</h3>
            <p class="crafting-requirements">Pula para o próximo dia.</p>
        </div>
        <button data-action="sleep" ${canSleep ? '' : 'disabled'}>Dormir</button>
    `;
    shelterOptionsList.appendChild(sleepOption);
    if (canSleep) {
        sleepOption.querySelector('button').addEventListener('click', onSleep);
    }
}

// Função para atualizar a hotbar visualmente
function updateHotbar(player) {
    if (player.hasAxe) {
        hotbarItemIcon1.textContent = itemEmojis['Machado'];
        hotbarItemIcon1.style.opacity = 1;
    } else {
        hotbarItemIcon1.textContent = '';
        hotbarItemIcon1.style.opacity = 0.5;
    }

    if (player.hasPickaxe) {
        hotbarItemIcon2.textContent = itemEmojis['Picareta'];
        hotbarItemIcon2.style.opacity = 1;
    } else {
        hotbarItemIcon2.textContent = '';
        hotbarItemIcon2.style.opacity = 0.5;
    ;
    }

    hotbarSlot1.classList.remove('selected');
    hotbarSlot2.classList.remove('selected');

    if (player.equippedTool === 'Machado') {
        hotbarSlot1.classList.add('selected');
    } else if (player.equippedTool === 'Picareta') {
        hotbarSlot2.classList.add('selected');
    }
}

// Função para selecionar uma ferramenta
export function selectTool(player, toolName) {
    if (toolName === 'Machado' && player.hasAxe) {
        player.equippedTool = (player.equippedTool === 'Machado') ? null : 'Machado';
        logMessage(player.equippedTool === 'Machado' ? 'Machado equipado.' : 'Machado desequipado.', 'info');
    } else if (toolName === 'Picareta' && player.hasPickaxe) {
        player.equippedTool = (player.equippedTool === 'Picareta') ? null : 'Picareta';
        logMessage(player.equippedTool === 'Picareta' ? 'Picareta equipada.' : 'Picareta desequipado.', 'info');
    } else {
        logMessage(`Você não possui ${toolName}.`, 'warning');
        player.equippedTool = null;
    }
    updateUI(player);
}