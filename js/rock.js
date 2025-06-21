// js/rock.js
import * as THREE from 'three';

/**
 * Cria uma rocha com material PBR e a adiciona na cena.
 * @param {THREE.Scene} scene - A cena onde a rocha será adicionada.
 * @param {THREE.Vector3} position - A posição (x, y, z) da rocha.
 * @param {THREE.LoadingManager} manager - O gerenciador de carregamento central.
 */
export function createRock(scene, position, manager) {
    // O loader de textura agora usa o gerenciador passado como argumento
    const textureLoader = new THREE.TextureLoader(manager);

    const colorTexture = textureLoader.load('./textures/rock/Rock062_2K-JPG_Color.jpg');
    const aoTexture = textureLoader.load('./textures/rock/Rock062_2K-JPG_AmbientOcclusion.jpg');
    const normalTexture = textureLoader.load('./textures/rock/Rock062_2K-JPG_NormalDX.jpg');
    const roughnessTexture = textureLoader.load('./textures/rock/Rock062_2K-JPG_Roughness.jpg');

    colorTexture.colorSpace = THREE.SRGBColorSpace;

    const rockGeometry = new THREE.IcosahedronGeometry(1, 3); 

    const rockMaterial = new THREE.MeshStandardMaterial({
        map: colorTexture,
        aoMap: aoTexture,
        normalMap: normalTexture,
        roughnessMap: roughnessTexture
    });

    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.copy(position);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);

    return rock;
}