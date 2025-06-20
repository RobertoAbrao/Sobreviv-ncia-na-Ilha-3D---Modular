import * as THREE from 'three';

// Você pode colocar esta função em um novo arquivo (ex: 'js/rock.js') e exportá-la,
// ou diretamente no seu 'world.js'.

/**
 * Cria uma rocha com material PBR e a adiciona na cena.
 * @param {THREE.Scene} scene - A cena onde a rocha será adicionada.
 * @param {THREE.Vector3} position - A posição (x, y, z) da rocha.
 */
export function createRock(scene, position) {
    // 1. Carregador de Textura (um só para todas as texturas)
    const textureLoader = new THREE.TextureLoader();

    // 2. Carregar todos os mapas de textura da pasta
    const colorTexture = textureLoader.load('./textures/rock/Rock062_2K-JPG_Color.jpg');
    const aoTexture = textureLoader.load('./textures/rock/Rock062_2K-JPG_AmbientOcclusion.jpg');
    const normalTexture = textureLoader.load('./textures/rock/Rock062_2K-JPG_NormalDX.jpg');
    const roughnessTexture = textureLoader.load('./textures/rock/Rock062_2K-JPG_Roughness.jpg');
    // O mapa de Displacement é mais avançado, vamos focar nos outros por enquanto.

    // Garante a correção de cor para a textura principal
    colorTexture.colorSpace = THREE.SRGBColorSpace;

    // 3. Criar uma geometria para a rocha
    // IcosahedronGeometry é uma boa base para uma pedra de aparência irregular.
    // O segundo parâmetro é o "detalhe". Mais detalhes = mais redonda.
    const rockGeometry = new THREE.IcosahedronGeometry(1, 3); 

    // 4. Configurar o Material PBR Standard
    const rockMaterial = new THREE.MeshStandardMaterial({
        map: colorTexture,          // Textura de cor base
        aoMap: aoTexture,           // Textura de Ambient Occlusion
        normalMap: normalTexture,       // Textura de normais para detalhes
        roughnessMap: roughnessTexture  // Textura de rugosidade
    });

    // 5. Criar o Mesh (objeto final)
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);

    // 6. Posição e Sombras
    rock.position.copy(position); // Define a posição da rocha
    rock.castShadow = true;       // A rocha projeta sombras
    rock.receiveShadow = true;  // A rocha recebe sombras de outros objetos

    // Adiciona a rocha à cena
    scene.add(rock);

    return rock;
}