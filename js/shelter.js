// js/shelter.js
import * as THREE from 'three';

export const shelterCost = {
    'Madeira': 20,
    'Pedra': 10
};

export class Shelter {
    constructor(position) {
        this.mesh = new THREE.Group();

        // Base/Piso
        const baseGeo = new THREE.BoxGeometry(3.5, 0.2, 3.5);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Cor de madeira
        const baseMesh = new THREE.Mesh(baseGeo, baseMaterial);
        baseMesh.position.y = 0.1;
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        this.mesh.add(baseMesh);

        // Paredes (simples)
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xA0522D }); // Cor de madeira mais clara
        
        // Parede traseira
        const backWallGeo = new THREE.BoxGeometry(3.5, 2.5, 0.1);
        const backWallMesh = new THREE.Mesh(backWallGeo, wallMaterial);
        backWallMesh.position.set(0, 1.35, -1.7);
        backWallMesh.castShadow = true;
        backWallMesh.receiveShadow = true;
        this.mesh.add(backWallMesh);

        // Paredes laterais
        const sideWallGeo = new THREE.BoxGeometry(0.1, 2.5, 3.5);
        const leftWallMesh = new THREE.Mesh(sideWallGeo, wallMaterial);
        leftWallMesh.position.set(-1.7, 1.35, 0);
        leftWallMesh.castShadow = true;
        leftWallMesh.receiveShadow = true;
        this.mesh.add(leftWallMesh);

        const rightWallMesh = new THREE.Mesh(sideWallGeo, wallMaterial);
        rightWallMesh.position.set(1.7, 1.35, 0);
        rightWallMesh.castShadow = true;
        rightWallMesh.receiveShadow = true;
        this.mesh.add(rightWallMesh);

        // Teto (telhado inclinado simplificado)
        const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x5C4033 }); // Marrom escuro para o telhado
        const roofGeo = new THREE.BoxGeometry(3.8, 0.1, 4); 
        const roofMesh = new THREE.Mesh(roofGeo, roofMaterial);
        roofMesh.rotation.x = -Math.PI / 12; // Leve inclinação
        roofMesh.position.set(0, 2.5, -0.2); 
        roofMesh.castShadow = true;
        roofMesh.receiveShadow = true;
        this.mesh.add(roofMesh);

        this.mesh.position.copy(position);
    }
}