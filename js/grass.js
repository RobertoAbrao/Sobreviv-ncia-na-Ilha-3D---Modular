// js/grass.js
import * as THREE from 'three';

/**
 * Cria e configura um MeshStandardMaterial PBR para o terreno de grama.
 * @returns {THREE.MeshStandardMaterial} O material pronto para uso.
 */
export function createTerrainMaterial() {
    // 1. Carregar as texturas da grama
    const textureLoader = new THREE.TextureLoader();
    const grassColorTexture = textureLoader.load('./textures/grass/Grass005_2K-JPG_Color.jpg');
    const grassAoTexture = textureLoader.load('./textures/grass/Grass005_2K-JPG_AmbientOcclusion.jpg');
    const grassNormalTexture = textureLoader.load('./textures/grass/Grass005_2K-JPG_NormalDX.jpg');
    const grassRoughnessTexture = textureLoader.load('./textures/grass/Grass005_2K-JPG_Roughness.jpg');
    
    grassColorTexture.colorSpace = THREE.SRGBColorSpace;
    
    // 2. Configurar a repetição (tiling) para todas as texturas
    const textureRepeat = 50; // Ajuste este valor para mudar a "escala" da grama
    const allTextures = [grassColorTexture, grassAoTexture, grassNormalTexture, grassRoughnessTexture];
    allTextures.forEach(texture => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(textureRepeat, textureRepeat);
    });
    
    // 3. Criar e retornar o material PBR
    const terrainMaterial = new THREE.MeshStandardMaterial({
        map: grassColorTexture,
        aoMap: grassAoTexture,
        normalMap: grassNormalTexture,
        roughnessMap: grassRoughnessTexture
    });

    return terrainMaterial;
}