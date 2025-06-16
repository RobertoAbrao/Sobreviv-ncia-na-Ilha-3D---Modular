# Sobrevivência na Ilha 3D - Modular

Um jogo de sobrevivência em primeira pessoa, de mundo aberto, construído com JavaScript e Three.js. Explore uma ilha gerada proceduralmente, colete recursos e gerencie suas necessidades básicas para sobreviver.

![Demonstração do Jogo](img/Captura%20de%20tela%202025-06-16%20162123.png)

## 📖 Sobre o Projeto

Este projeto é uma simulação de sobrevivência em 3D que roda diretamente no navegador. O jogador é colocado em uma ilha e deve lutar contra a fome e a sede enquanto interage com o ambiente. O mundo do jogo, incluindo o terreno, árvores e rochas, é gerado proceduralmente, garantindo que cada nova partida seja uma experiência única.

O código foi estruturado de forma modular para facilitar a manutenção e a adição de novas funcionalidades.

## 🛠️ Tecnologias Utilizadas

* **Motor Gráfico:** [Three.js](https://threejs.org/)
* **Geração de Ruído:** [simplex-noise](https://github.com/jwagner/simplex-noise.js) para a criação do terreno procedural.
* **Linguagem:** JavaScript (ESM - Módulos)
* **Estilização (HUD):** [TailwindCSS](https://tailwindcss.com/) (via CDN)

## ✨ Funcionalidades Atuais

* **Mundo 3D Procedural:** O terreno da ilha é gerado dinamicamente usando Simplex Noise, criando elevações, praias e áreas rochosas.
* **Controles em Primeira Pessoa:** Movimentação padrão com `W`, `A`, `S`, `D`, pulo com a `Barra de Espaço` e controle da câmera com o mouse.
* **Sistema de Sobrevivência:** O jogador possui barras de **Vida**, **Fome** e **Sede**. Fome e sede aumentam com o tempo, e a vida diminui se uma delas chegar ao máximo.
* **Coleta de Recursos:** Interaja com o mundo para coletar recursos. Atualmente, é possível:
    * Coletar **Madeira** de árvores.
    * Coletar **Pedra** de rochas.
* **Inventário Simples:** Os recursos coletados são exibidos em tempo real na interface do jogo.
* **Regeneração de Recursos:** Árvores e pedras que foram coletadas reaparecem na ilha após um certo tempo.
* **IA Básica de Animais:** Animais (representados por esferas) que vagam aleatoriamente pelo terreno.

## 🚀 Como Executar

Por utilizar módulos de JavaScript (`import`/`export`), este projeto precisa ser executado a partir de um servidor web local para funcionar corretamente (devido às políticas de CORS do navegador).

1.  **Clone o repositório:**
    ```bash
    git clone https://[URL-DO-SEU-REPOSITORIO]
    cd [NOME-DA-PASTA]
    ```

2.  **Inicie um servidor local:**
    Se você tiver o Python instalado, a maneira mais fácil é executar um dos seguintes comandos na pasta raiz do projeto:

    ```bash
    # Para Python 3
    python -m http.server

    # Para Python 2
    python -m SimpleHTTPServer
    ```
    Se você tiver o Node.js, pode usar o pacote `live-server`:
    ```bash
    npx live-server
    ```

3.  **Abra no navegador:**
    Acesse o endereço `http://localhost:8000` (ou o endereço que o seu servidor indicar).

## 📂 Estrutura dos Arquivos

O projeto é organizado da seguinte forma:

```
.
├── js/
│   ├── animal.js         # Lógica da IA e comportamento dos animais
│   ├── campfire.js       # (Futuro) Lógica para a fogueira
│   ├── constants.js      # Constantes globais do jogo (tamanho da ilha, etc.)
│   ├── interaction.js    # Gerencia as interações do jogador (coleta)
│   ├── physics.js        # Lógica de física do jogador (gravidade, pulo)
│   ├── player.js         # Classe do jogador, status e inventário
│   ├── ui.js             # Funções para atualizar a interface do usuário
│   └── world.js          # Geração do mundo, terreno, árvores e pedras
├── main.js               # Ponto de entrada principal, orquestra todos os módulos
├── index.html            # Estrutura principal da página
└── style.css             # Estilos para o HUD e a página
```

## 🗺️ Roadmap Futuro

Aqui está um roteiro de possíveis próximos passos para aprimorar o jogo.

### Fase 1: Fundamentos de Crafting e Interação (Curto Prazo)

1.  **Ativar a Fogueira:** Integrar a lógica já existente em `campfire.js` para permitir que o jogador construa uma fogueira usando os recursos coletados. Ela será a base para cozinhar e iluminação.

2.  **Sistema de Crafting Básico:** Introduzir um menu simples onde o jogador possa criar itens novos, como ferramentas, a partir de receitas.

3.  **Criação e Uso de Ferramentas:** Permitir a criação de um machado e uma picareta, que podem ser necessários para coletar madeira e pedra de forma mais eficiente.

4.  **Melhorar Feedback de Interação:** Adicionar um destaque visual ou uma dica de texto quando o jogador estiver olhando para um objeto com o qual pode interagir.

### Fase 2: Expansão do Mundo e Gameplay (Médio Prazo)

1.  **Ciclo Dia/Noite:** Implementar uma mudança gradual na iluminação da cena para simular a passagem do tempo, tornando as noites mais escuras e perigosas.

2.  **Caça e Alimentação:** Permitir que os animais sejam caçados para obter `Carne Crua`, que pode ser cozida na fogueira para restaurar a fome.

3.  **Coleta e Purificação de Água:** Adicionar a mecânica de coletar `Água Suja` de fontes e fervê-la na fogueira para torná-la potável.

4.  **Construção de Abrigos:** Dar ao jogador a capacidade de construir estruturas simples para se proteger.

### Fase 3: Polimento e Conteúdo Avançado (Longo Prazo)

1.  **IA Avançada e Inimigos:** Melhorar a IA dos animais com comportamentos de fuga ou hostilidade e adicionar inimigos que representem uma ameaça durante a noite.

2.  **Efeitos Sonoros e Música:** Adicionar áudio para ações, ambiente e uma trilha sonora para aumentar a imersão.

3.  **Melhorias na UI/UX:** Desenvolver menus mais robustos para inventário, crafting e configurações do jogo.

4.  **Objetivo Final:** Dar ao jogador uma meta a ser alcançada, como construir um barco para escapar da ilha ou sobreviver a um desafio específico.