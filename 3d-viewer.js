/* ═══════════════════════════════════════════════════════════════════
   3D VIEWER - Three.js pour Configurateur LYNKA
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';

export class VO390Viewer {
  constructor(containerElementId) {
    this.container = document.getElementById(containerElementId);
    if (!this.container) {
      console.error(`Container ${containerElementId} not found`);
      return;
    }

    // Three.js basics
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f1520);
    
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 1.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    this.setupLighting();

    // Controls (Orbit - Rotation/Zoom)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 3;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 1.0;

    // Model state
    this.model = null;
    this.morphTargets = {};
    this.currentNbCuves = 1;
    this.loader = new GLTFLoader();

    // Animation loop
    this.animate();

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Directional light (key light)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0x4a90e2, 0.4);
    fillLight.position.set(-5, 5, 5);
    this.scene.add(fillLight);

    // Rim light
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
    rimLight.position.set(0, 5, -5);
    this.scene.add(rimLight);
  }

  async loadModel(nbCuves) {
    try {
      // Construire le chemin du modèle
      const modelPath = `3D - Models/VO390/VO390_${nbCuves}.glb`;
      // Encoder l'URL pour gérer les espaces et caractères spéciaux
      const modelUrl = encodeURI(modelPath);

      console.log(`[3D Viewer] Chargement du modèle: ${modelUrl}`);

      // Charger le modèle (utiliser l'URL encodée)
      const gltf = await new Promise((resolve, reject) => {
        this.loader.load(modelUrl, resolve, undefined, reject);
      });

      // Retirer l'ancien modèle
      if (this.model) {
        this.scene.remove(this.model);
      }

      // Ajouter le nouveau modèle
      this.model = gltf.scene;
      this.scene.add(this.model);

      // Centrer et scaler le modèle
      const box = new THREE.Box3().setFromObject(this.model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1 / maxDim;
      this.model.scale.multiplyScalar(scale);
      this.model.position.sub(center.multiplyScalar(scale));

      // Réinitialiser les contrôles
      this.controls.reset();
      this.camera.position.set(0, 0, 1.5);

      // Extraire et mapper les morph targets
      this.extractMorphTargets();

      this.currentNbCuves = nbCuves;

      console.log(`[3D Viewer] Modèle VO390_${nbCuves} chargé avec succès`);

      return true;
    } catch (error) {
      console.error(`[3D Viewer] Erreur lors du chargement du modèle:`, error);
      this.showError(`Impossible de charger VO390_${nbCuves}`);
      return false;
    }
  }

  extractMorphTargets() {
    this.morphTargets = {};

    if (!this.model) return;

    this.model.traverse((child) => {
      if (child.isMesh && child.morphTargetInfluences) {
        console.log(`[3D Viewer] Mesh trouvé avec ${child.morphTargetInfluences.length} morphs`);

        // Mapper chaque morph target
        child.morphTargetDictionary?.forEach((index, name) => {
          this.morphTargets[name] = {
            mesh: child,
            index: index,
          };
          console.log(`  - Morph: ${name} (index: ${index})`);
        });
      }
    });

    console.log(`[3D Viewer] ${Object.keys(this.morphTargets).length} morphs targets trouvés`);
  }

  /**
   * Mettre à jour les morphs targets avec les valeurs des sliders
   * @param {number} length - Longueur (0-1)
   * @param {number} depth - Profondeur (0-1)
   * @param {number} height - Hauteur (0-1)
   */
  updateMorphTargets(length, depth, height) {
    // Appliquer les morph targets en fonction des valeurs
    Object.entries(this.morphTargets).forEach(([name, target]) => {
      let influence = 0;

      // Déterminer l'influence basée sur le nom du morph target
      if (name.toLowerCase().includes('length')) {
        influence = length;
      } else if (name.toLowerCase().includes('depth')) {
        influence = depth;
      } else if (name.toLowerCase().includes('height')) {
        influence = height;
      }

      // Appliquer avec une transition douce
      if (target.mesh.morphTargetInfluences[target.index] !== undefined) {
        target.mesh.morphTargetInfluences[target.index] = influence;
      }
    });
  }

  showError(message) {
    console.error(`[3D Viewer] ${message}`);
    // Optionnel: afficher un message d'erreur à l'écran
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Définir l'auto-rotation
   */
  setAutoRotate(enabled) {
    this.controls.autoRotate = enabled;
  }

  /**
   * Réinitialiser la vue
   */
  resetView() {
    this.controls.reset();
    this.camera.position.set(0, 0, 1.5);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Prendre une capture d'écran du modèle 3D
   */
  screenshot() {
    return this.renderer.domElement.toDataURL('image/png');
  }
}

console.log('[3D Viewer] Module chargé - Prêt pour Three.js');
