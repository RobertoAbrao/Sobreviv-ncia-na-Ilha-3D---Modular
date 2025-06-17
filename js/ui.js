// js/ui.js
const healthBar = document.getElementById('health-bar');
const hungerBar = document.getElementById('hunger-bar');
const thirstBar = document.getElementById('thirst-bar');
const healthValue = document.getElementById('health-value');
const hungerValue = document.getElementById('hunger-value');
const thirstValue = document.getElementById('thirst-value');
const messageLog = document.getElementById('message-log');
const inventoryList = document.getElementById('inventory-list');
const craftingModal = document.getElementById('crafting-modal');
const craftingList = document.getElementById('crafting-list');

// Elementos da hotbar
const hotbarSlot1 = document.getElementById('hotbar-slot-1');
const hotbarSlot2 = document.getElementById('hotbar-slot-2');
const hotbarItemIcon1 = hotbarSlot1.querySelector('.hotbar-item-icon');
const hotbarItemIcon2 = hotbarSlot2.querySelector('.hotbar-item-icon');

// Emojis para os itens
const itemEmojis = {
    'Madeira': '🪵',
    'Pedra': '🪨',
    'Fogueira': '🔥',
    'Machado': '🪓',
    'Picareta': '⛏️',
    'Carne Crua': '🥩',
    'Carne Cozida': '🍖',
    'Agua Suja': ' tainted💧', // NOVO: Emoji para água suja
    'Agua Limpa': '💧' // NOVO: Emoji para água limpa
};

export function updateUI(player) {
    // Atualiza Status
    healthBar.style.width = `${player.health}%`;
    hungerBar.style.width = `${player.hunger}%`;
    thirstBar.style.width = `${player.thirst}%`;
    healthValue.textContent = `${Math.ceil(player.health)}/100`;
    hungerValue.textContent = `${Math.ceil(player.hunger)}/100`;
    thirstValue.textContent = `${Math.ceil(player.thirst)}/100`;

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

    // Adiciona um botão "Beber Água Limpa" diretamente no inventário se tiver água
    if (player.inventory['Agua Limpa'] > 0) {
        const drinkWaterButton = document.createElement('button');
        drinkWaterButton.textContent = `Beber Água Limpa (${player.inventory['Agua Limpa']})`;
        drinkWaterButton.className = 'mt-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded w-full';
        drinkWaterButton.onclick = () => {
            if (player.drinkCleanWater(logMessage)) {
                updateUI(player); // Atualiza a UI após beber
            }
        };
        inventoryList.appendChild(drinkWaterButton);
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
        const canCraft = player.hasResources(item.cost) && (!item.requires || player[item.requires]) && !hasTool;

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