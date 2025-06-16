const healthBar = document.getElementById('health-bar');
const hungerBar = document.getElementById('hunger-bar');
const thirstBar = document.getElementById('thirst-bar');
const healthValue = document.getElementById('health-value');
const hungerValue = document.getElementById('hunger-value');
const thirstValue = document.getElementById('thirst-value');
const messageLog = document.getElementById('message-log');
const inventoryList = document.getElementById('inventory-list');
const craftingModal = document.getElementById('crafting-modal'); // NOVO
const craftingList = document.getElementById('crafting-list'); // NOVO

// NOVO: Elementos da hotbar
const hotbarSlot1 = document.getElementById('hotbar-slot-1');
const hotbarSlot2 = document.getElementById('hotbar-slot-2');
const hotbarItemIcon1 = hotbarSlot1.querySelector('.hotbar-item-icon');
const hotbarItemIcon2 = hotbarSlot2.querySelector('.hotbar-item-icon');

// NOVO: Emojis para os itens
const itemEmojis = {
    'Madeira': '🪵',
    'Pedra': '🪨',
    'Fogueira': '🔥', // NOVO
    'Machado': '🪓', // NOVO
    'Picareta': '⛏️'  // NOVO
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
            const emoji = itemEmojis[item] || '❔'; // Usa um emoji padrão se não encontrar
            const itemEl = document.createElement('p');
            itemEl.textContent = `${emoji} ${item}: ${quantity}`;
            inventoryList.appendChild(itemEl);
        }
    }
    // NOVO: Exibe a fogueira no inventário se o jogador a tiver
    if (player.hasCampfire) {
        const campfireEl = document.createElement('p');
        campfireEl.textContent = `${itemEmojis['Fogueira']} Fogueira (Construída)`;
        inventoryList.appendChild(campfireEl);
    }

    // NOVO: Atualiza a Hotbar
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

// NOVO: Funções para o modal de crafting
export function toggleCraftingModal(show) {
    if (show) {
        craftingModal.classList.remove('hidden'); // Garante que a classe 'hidden' seja removida
        setTimeout(() => { // Pequeno atraso para permitir que 'hidden' seja removido antes de adicionar 'show'
            craftingModal.classList.add('show');
        }, 10);
    } else {
        craftingModal.classList.remove('show');
        setTimeout(() => { // Pequeno atraso para a transição terminar antes de adicionar 'hidden'
            craftingModal.classList.add('hidden');
        }, 300); // Duração da transição CSS
    }
}

export function renderCraftingList(craftableItems, player, onCraft) {
    craftingList.innerHTML = '';
    for (const item of craftableItems) {
        // Ajuste para desabilitar o crafting se já tiver a ferramenta
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
        // Adiciona mensagem se já tiver a ferramenta
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

// NOVO: Função para atualizar a hotbar visualmente
function updateHotbar(player) {
    // Slot 1: Machado
    if (player.hasAxe) {
        hotbarItemIcon1.textContent = itemEmojis['Machado'];
        hotbarItemIcon1.style.opacity = 1;
    } else {
        hotbarItemIcon1.textContent = '';
        hotbarItemIcon1.style.opacity = 0.5;
    }

    // Slot 2: Picareta
    if (player.hasPickaxe) {
        hotbarItemIcon2.textContent = itemEmojis['Picareta'];
        hotbarItemIcon2.style.opacity = 1;
    } else {
        hotbarItemIcon2.textContent = '';
        hotbarItemIcon2.style.opacity = 0.5;
    }

    // Marca o slot selecionado
    hotbarSlot1.classList.remove('selected');
    hotbarSlot2.classList.remove('selected');

    if (player.equippedTool === 'Machado') {
        hotbarSlot1.classList.add('selected');
    } else if (player.equippedTool === 'Picareta') {
        hotbarSlot2.classList.add('selected');
    }
}

// NOVO: Função para selecionar uma ferramenta
export function selectTool(player, toolName) {
    // Se o jogador já tem a ferramenta e ela não está equipada, equipa
    // Se a ferramenta já está equipada, desequipa
    if (toolName === 'Machado' && player.hasAxe) {
        player.equippedTool = (player.equippedTool === 'Machado') ? null : 'Machado';
        logMessage(player.equippedTool === 'Machado' ? 'Machado equipado.' : 'Machado desequipado.', 'info');
    } else if (toolName === 'Picareta' && player.hasPickaxe) {
        player.equippedTool = (player.equippedTool === 'Picareta') ? null : 'Picareta';
        logMessage(player.equippedTool === 'Picareta' ? 'Picareta equipada.' : 'Picareta desequipado.', 'info');
    } else {
        logMessage(`Você não possui ${toolName}.`, 'warning');
        player.equippedTool = null; // Garante que nada está equipado se tentar equipar algo que não tem
    }
    updateUI(player); // Atualiza a hotbar para mostrar a seleção
}