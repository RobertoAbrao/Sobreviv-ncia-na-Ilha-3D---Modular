const healthBar = document.getElementById('health-bar');
const hungerBar = document.getElementById('hunger-bar');
const thirstBar = document.getElementById('thirst-bar');
const healthValue = document.getElementById('health-value');
const hungerValue = document.getElementById('hunger-value');
const thirstValue = document.getElementById('thirst-value');
const messageLog = document.getElementById('message-log');
const inventoryList = document.getElementById('inventory-list');

// NOVO: Emojis para os itens
const itemEmojis = {
    'Madeira': '🪵',
    'Pedra': '🪨'
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