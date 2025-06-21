// js/grass.js
import * as THREE from 'three';

/**
 * Cria e configura um MeshStandardMaterial PBR para o terreno de grama.
 * @param {THREE.LoadingManager} manager - O gerenciador de carregamento central.
 * @returns {THREE.MeshStandardMaterial} O material pronto para uso.
 */
export function createTerrainMaterial(manager) {
    // O loader de textura agora usa o gerenciador passado como argumento
    const textureLoader = new THREE.TextureLoader(manager);
    const grassColorTexture = textureLoader.load('./textures/grass/Grass005_2K-JPG_Color.jpg');
    const grassAoTexture = textureLoader.load('./textures/grass/Grass005_2K-JPG_AmbientOcclusion.jpg');
    const grassNormalTexture = textureLoader.load('./textures/grass/Grass005_2K-JPG_NormalDX.jpg');
    const grassRoughnessTexture = textureLoader.load('./textures/grass/Grass005_2K-JPG_Roughness.jpg');
    
    grassColorTexture.colorSpace = THREE.SRGBColorSpace;
    
    const textureRepeat = 50;
    const allTextures = [grassColorTexture, grassAoTexture, grassNormalTexture, grassRoughnessTexture];
    allTextures.forEach(texture => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(textureRepeat, textureRepeat);
    });
    
    const terrainMaterial = new THREE.MeshStandardMaterial({
        map: grassColorTexture,
        aoMap: grassAoTexture,
        normalMap: grassNormalTexture,
        roughnessMap: grassRoughnessTexture
    });

    return terrainMaterial;
}