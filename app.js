/* ═══════════════════════════════════════════════════
   CONFIGURATEUR LYNKA — JavaScript (Dynamique)
   ═══════════════════════════════════════════════════ */

'use strict';

window.addEventListener('error', function(e) {
  const errDiv = document.createElement('div');
  errDiv.style.cssText = 'position:fixed; top:0; left:0; width:100%; background:red; color:white; z-index:9999; padding: 20px; font-size:16px; font-weight:bold;';
  errDiv.innerHTML = `ERREUR JS: ${e.message} à la ligne ${e.lineno}`;
  document.body.appendChild(errDiv);
});

window.addEventListener('unhandledrejection', function(e) {
  const errDiv = document.createElement('div');
  errDiv.style.cssText = 'position:fixed; top:80px; left:0; width:100%; background:darkred; color:white; z-index:9999; padding: 20px; font-size:16px; font-weight:bold;';
  errDiv.innerHTML = `ERREUR ASYNC: ${e.reason}`;
  document.body.appendChild(errDiv);
});

import * as THREE from 'https://esm.sh/three@0.160.0';
window.THREE = THREE;
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'https://esm.sh/three@0.160.0/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'https://esm.sh/three@0.160.0/examples/jsm/utils/SkeletonUtils.js';
import './blueprint.js';

function applyStandardMeshSettings(child) {
  if (!child.isMesh) return;
  child.castShadow = true;
  child.receiveShadow = true;
  if (child.material) {
    if (Array.isArray(child.material)) {
      child.material.forEach(m => {
        m.side = THREE.DoubleSide;
        m.transparent = false;
        m.opacity = 1;
      });
    } else {
      child.material.side = THREE.DoubleSide;
      child.material.transparent = false;
      child.material.opacity = 1;
    }
  }
}

const G_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1atF6VK20aO1ONcRJFAuEK5VrqeTzwhl2VKbotdRhBBM/gviz/tq?tqx=out:json&gid=943156125';

/* ══════════════════════════════════
   CATALOGUE LYNKA (Rempli dynamiquement)
══════════════════════════════════ */
let cuvesData = {};

/* ══════════════════════════════════
   STATE
══════════════════════════════════ */
const state = {
  step:        1,
  model:       '',
  support:     'SANS',  // 'SANS', 'TH', 'THAL', 'THALLIS', 'THALLISOL'
  length:      80,
  position:    40,
  plageEntreCuves: 10,
  height:      14,
  finition:    'blanc-mat',
  tropPlein:   true,  // true = Avec, false = Sans (-STP)
  credence:    '',    // '', 'C', 'P', 'M', 'T'
  mur:         'aucun',// 'aucun', 'entre', 'gauche', 'droite'
  nbCuves:     '1',    // '1', '2', ... '8'

};

window.state = state;
window.cuvesData = cuvesData;

/* ══════════════════════════════════
   DOM CACHE
══════════════════════════════════ */
const $ = id => document.getElementById(id);

// Sliders
const sliderItemPlageG = $('slider-item-plage-g');
const sliderItemPlageD = $('slider-item-plage-d');
const sliderLength = $('slider-length');
const sliderPlageG = $('slider-plage-g');
const sliderPlageD = $('slider-plage-d');
const sliderItemPlageEntre = $('slider-item-plage-entre');
const sliderPlageEntre = $('slider-plage-entre');
const sliderHeight = $('slider-height');
const valLength    = $('val-length');
const valPlageG    = $('val-plage-g');
const valPlageD    = $('val-plage-d');
const valPlageEntre= $('val-plage-entre');
const valHeight    = $('val-height');
const fillLength   = $('fill-length');
const fillPlageG   = $('fill-plage-g');
const fillPlageD   = $('fill-plage-d');
const fillPlageEntre=$('fill-plage-entre');
const fillHeight   = $('fill-height');
const mtLength     = $('mt-length');
const mtHeight     = $('mt-height');

// Viewer
const mainPreviewImg = $('main-preview-img');
const viewerModelTag = $('viewer-model-tag');
const viewerLoading  = $('viewer-loading');
const btnReset       = $('btn-reset');

// Summary
const lynkaRef     = $('lynka-ref');
const lynkaSubref  = $('lynka-subref');
const sumModel     = $('sum-model');
const sumStp       = $('sum-stp');
const sumMur       = $('sum-mur');
const sumCredence  = $('sum-credence');
const sumItemCuves = $('sum-item-cuves');
const sumNbCuves   = $('sum-nb-cuves');

// Options & Selects
const toggleTropplein = $('toggle-tropplein');
const groupNbCuves    = $('group-nb-cuves');
const selectNbCuves   = $('select-nb-cuves');
const selectModel     = $('select-model');
const selectSupport   = $('select-support');


// 3D Viewer
const threeCanvas     = $('three-canvas');
const viewerCanvas    = $('viewer-canvas');
let scene, camera, renderer, controls, fbxLoader, current3DObject = null;
let loadedModelCount = null;
let baseCuveModel = null;
let cuveInstances = [];
let supportModel = null;  // Variable pour stocker le modèle de support
let supportScaleMeshes = [];
let supportMoveMeshes = [];
let supportBaseLocalX = new Map();
let supportLeftBones = [];    // Liste des os Bone_Long_G dans le support
let supportRightBones = [];   // Liste des os Bone_Long_D dans le support
let supportLeftBonesBasePos = new Map();  // Positions 3D initiales de chaque os G (Vector3) dans l'espace du support
let supportRightBonesBasePos = new Map(); // Positions 3D initiales de chaque os D (Vector3) dans l'espace du support
let basePorteModel = null;        // Modèle 3D de porte de base chargé pour le support THALLISOL
let baseSepModel = null;          // Modèle 3D de séparation de base chargé pour le support THALLISOL
let supportPortesGroup = null;    // Groupe contenant toutes les instances de portes (THREE.Group)



let plateauBones = {
  leftBone: null,
  rightBone: null,
  leftMesh: null,
  rightMesh: null,
  frontMesh: null
};
let baseFrontLength = 800; // Valeur par défaut en mm
let initialCameraState = {
  position: new THREE.Vector3(0, 1.15, 2.3),
  target: new THREE.Vector3(0, 0.4, 0)
};

function init3DViewer() {
  if (!threeCanvas) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080b12);

  camera = new THREE.PerspectiveCamera(38, threeCanvas.clientWidth / threeCanvas.clientHeight, 0.1, 2000);
  camera.position.set(0, 1.15, 2.3);

  renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(threeCanvas.clientWidth, threeCanvas.clientHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.minDistance = 0;
  controls.maxDistance = Infinity;
  controls.target.copy(initialCameraState.target);
  controls.update();

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xaabbcc, 0.8); // Bleu gris clair depuis le sol
  scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 7);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 30;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);

  // Ajout d'une lumière de remplissage pour déboucher les ombres sous le plan vasque
  const bottomFillLight = new THREE.DirectionalLight(0xffffff, 0.45);
  bottomFillLight.position.set(0, -10, 8); // Vient du bas et de l'avant
  scene.add(bottomFillLight);

  // Sol avec ombre retiré à la demande de l'utilisateur

  const markerMaterial = new THREE.LineBasicMaterial({ color: 0xffd700, toneMapped: false });
  const markerGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.2, 0.001, 0),
    new THREE.Vector3(0.2, 0.001, 0),
    new THREE.Vector3(0, 0.001, -0.2),
    new THREE.Vector3(0, 0.001, 0.2)
  ]);
  const centerMarker = new THREE.LineSegments(markerGeometry, markerMaterial);
  scene.add(centerMarker);

  const centerDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd700 })
  );
  centerDot.position.set(0, 0.001, 0);
  scene.add(centerDot);

  // Axe XYZ pour repère visuel (Rouge=X, Vert=Y, Bleu=Z)
  const axesHelper = new THREE.AxesHelper(1);
  scene.add(axesHelper);

  // Fonction pour créer un label texte 3D
  function makeTextSprite(message, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.font = 'Bold 40px Arial';
    context.fillStyle = color;
    context.textAlign = 'center';
    context.fillText(message, 32, 48);
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.15, 0.15, 0.15);
    return sprite;
  }

  const spriteX = makeTextSprite('X', '#ff0000');
  spriteX.position.set(1.1, 0, 0);
  scene.add(spriteX);

  const spriteY = makeTextSprite('Y', '#00ff00');
  spriteY.position.set(0, 1.1, 0);
  scene.add(spriteY);

  const spriteZ = makeTextSprite('Z', '#0000ff');
  spriteZ.position.set(0, 0, 1.1);
  scene.add(spriteZ);

  fbxLoader = new FBXLoader();
  window.addEventListener('resize', handleWindowResize);

  renderScene();
}

window.captureIsometricView = function(callback) {
  if (!camera || !renderer || !scene) return;
  const oldPos = camera.position.clone();
  const oldTarget = controls.target.clone();
  
  // Set camera to isometric position
  camera.position.set(1.6, 1.2, 1.6);
  controls.target.set(0, 0.35, 0);
  controls.update();
  
  // Temporarily hide helpers
  scene.traverse(child => {
    if (child instanceof THREE.AxesHelper || child instanceof THREE.Sprite || child instanceof THREE.LineSegments || (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry)) {
      child.visible = false;
    }
  });
  
  // Force render
  renderer.render(scene, camera);
  
  // Capture
  const imgDataUrl = renderer.domElement.toDataURL('image/png');
  
  // Restore helpers
  scene.traverse(child => {
    if (child instanceof THREE.AxesHelper || child instanceof THREE.Sprite || child instanceof THREE.LineSegments || (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry)) {
      child.visible = true;
    }
  });
  
  // Restore camera
  camera.position.copy(oldPos);
  controls.target.copy(oldTarget);
  controls.update();
  renderer.render(scene, camera);
  
  callback(imgDataUrl);
};

// --- Hatch Texture for Cross Section ---
function createHatchTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#ffffff'; 
  ctx.fillRect(0, 0, 64, 64);
  
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  
  ctx.beginPath();
  for (let i = -64; i < 128; i += 8) {
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 64, 64);
  }
  ctx.stroke();
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(50, 50); // Scale the hatching
  return texture;
}

window.captureMiseEnPlanViews = function(callback) {
  if (!scene || !camera || !renderer) {
    if (callback) callback(null);
    return;
  }

  const results = {};
  
  // Save original camera, target, and renderer size
  const oldPos = camera.position.clone();
  const oldTarget = controls.target.clone();
  const originalSize = new THREE.Vector2();
  renderer.getSize(originalSize);
  
  // Save helper visibilities and hide them
  const helpersToRestore = [];
  scene.traverse(child => {
    if (child instanceof THREE.AxesHelper || child instanceof THREE.GridHelper || child instanceof THREE.Sprite || child instanceof THREE.LineSegments || (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry)) {
      if (child.visible) {
        helpersToRestore.push(child);
        child.visible = false;
      }
    }
  });

  // Helper to hide non-support meshes
  const hiddenMeshes = [];
  const hideNonSupport = () => {
    if (!supportModel) return;
    current3DObject.traverse(child => {
      let isSupport = false;
      let p = child;
      while (p) {
        if (p === supportModel) {
          isSupport = true;
          break;
        }
        p = p.parent;
      }
      if (!isSupport && child !== current3DObject && child.visible) {
        hiddenMeshes.push(child);
        child.visible = false;
      }
    });
    cuveInstances.forEach(inst => {
      if (inst.visible) {
        hiddenMeshes.push(inst);
        inst.visible = false;
      }
    });
  };

  const restoreNonSupport = () => {
    hiddenMeshes.forEach(m => {
      m.visible = true;
    });
    hiddenMeshes.length = 0;
  };

  // Temporarily set transparent background and adjust lighting for better contrast on white paper
  const originalBackground = scene.background;
  scene.background = null;

  // Find lights to adjust intensity
  let hemiLight, ambientLight;
  const dirLights = [];
  scene.traverse(child => {
    if (child.isHemisphereLight) hemiLight = child;
    if (child.isAmbientLight) ambientLight = child;
    if (child.isDirectionalLight) dirLights.push(child);
  });

  const oldHemiIntensity = hemiLight ? hemiLight.intensity : 0;
  const oldAmbientIntensity = ambientLight ? ambientLight.intensity : 0;
  const oldDirIntensities = new Map();

  // Lower intensities so white materials appear grey-ish and stand out against white paper
  if (hemiLight) hemiLight.intensity = 0.5;
  if (ambientLight) ambientLight.intensity = 0.3;
  dirLights.forEach(dl => {
    oldDirIntensities.set(dl, dl.intensity);
    dl.intensity = 0.6;
    dl.castShadow = false; // Disable cast shadows on plan
  });

  // Temporarily disable frustum culling and override colors for the plan
  const originalFrustumStates = new Map();
  const originalColors = new Map();
  
  scene.traverse(child => {
    if (child.isMesh) {
      originalFrustumStates.set(child, child.frustumCulled);
      child.frustumCulled = false;
      
      if (child.material) {
        // Determine if this mesh belongs to the support
        let isSupport = false;
        if (typeof supportModel !== 'undefined' && supportModel) {
          let current = child;
          while (current) {
            if (current === supportModel) { isSupport = true; break; }
            current = current.parent;
          }
        }
        
        // Target colors
        const targetHex = isSupport ? 0x9ca3af : 0xe5e7eb; // Architectural grey-blue for support, light grey for basin
        
        if (Array.isArray(child.material)) {
          child.material.forEach(m => {
            if (m.color) {
              if (!originalColors.has(m)) originalColors.set(m, m.color.getHex());
              m.color.setHex(targetHex);
              m.polygonOffset = true;
              m.polygonOffsetFactor = 1;
              m.polygonOffsetUnits = 1;
            }
          });
        } else {
          if (child.material.color) {
            if (!originalColors.has(child.material)) originalColors.set(child.material, child.material.color.getHex());
            child.material.color.setHex(targetHex);
            child.material.polygonOffset = true;
            child.material.polygonOffsetFactor = 1;
            child.material.polygonOffsetUnits = 1;
          }
        }
      }
    }
  });

  const edgeHelpers = [];
  scene.traverse(child => {
    if (child.isMesh && !child.userData.isEdgeHelper && !child.name.includes("ClippingPlane") && !child.name.includes("StencilCap")) {
      
      let geomToEdge = child.geometry;
      let clonedGeom = null;

      // GPU bone deformations (SkinnedMesh) must be calculated on the CPU for EdgesGeometry
      if (child.isSkinnedMesh && child.skeleton) {
        clonedGeom = child.geometry.clone();
        child.skeleton.update();
        const posAttr = clonedGeom.attributes.position;
        const skinIndexAttr = clonedGeom.attributes.skinIndex;
        const skinWeightAttr = clonedGeom.attributes.skinWeight;

        if (skinIndexAttr && skinWeightAttr) {
          const bindMatrix = child.bindMatrix;
          const bindMatrixInverse = child.bindMatrixInverse;
          const boneMatrices = child.skeleton.boneMatrices;

          const vertex = new THREE.Vector3();
          const skinMatrix = new THREE.Matrix4();
          const boneMatrix = new THREE.Matrix4();

          for (let i = 0; i < posAttr.count; i++) {
            vertex.fromBufferAttribute(posAttr, i);
            vertex.applyMatrix4(bindMatrix);

            skinMatrix.elements.fill(0);

            for (let j = 0; j < 4; j++) {
              const weight = skinWeightAttr.getComponent(i, j);
              if (weight > 0) {
                const boneIndex = skinIndexAttr.getComponent(i, j);
                boneMatrix.fromArray(boneMatrices, boneIndex * 16);
                for (let k = 0; k < 16; k++) {
                  skinMatrix.elements[k] += boneMatrix.elements[k] * weight;
                }
              }
            }

            vertex.applyMatrix4(skinMatrix);
            vertex.applyMatrix4(bindMatrixInverse);
            posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
          }
        }
        geomToEdge = clonedGeom;
      }

      // Handle morph targets for the plan vasque so edges match the stretched geometry
      if (child.morphTargetInfluences && child.morphTargetInfluences.length > 0) {
        let hasActiveMorphTargets = false;
        for (let i = 0; i < child.morphTargetInfluences.length; i++) {
          if (Math.abs(child.morphTargetInfluences[i]) > 0.001) {
            hasActiveMorphTargets = true; break;
          }
        }
        
        if (hasActiveMorphTargets && child.geometry.morphAttributes && child.geometry.morphAttributes.position) {
          clonedGeom = child.geometry.clone();
          const positionAttribute = clonedGeom.attributes.position;
          const morphAttributes = clonedGeom.morphAttributes.position;
          
          for (let i = 0; i < child.morphTargetInfluences.length; i++) {
            const influence = child.morphTargetInfluences[i];
            if (Math.abs(influence) > 0.001 && morphAttributes[i]) {
              for (let j = 0; j < positionAttribute.count; j++) {
                positionAttribute.setXYZ(
                  j,
                  positionAttribute.getX(j) + morphAttributes[i].getX(j) * influence,
                  positionAttribute.getY(j) + morphAttributes[i].getY(j) * influence,
                  positionAttribute.getZ(j) + morphAttributes[i].getZ(j) * influence
                );
              }
            }
          }
          geomToEdge = clonedGeom;
        }
      }

      // Add edges helper for better visibility in plans
      const edges = new THREE.EdgesGeometry(geomToEdge, 10);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 }));
      line.userData.isEdgeHelper = true;
      child.add(line);
      edgeHelpers.push({ parent: child, line: line, geomToDispose: clonedGeom });
    }
  });

  // Calculate true bounding box to guarantee perfect framing
  const box = new THREE.Box3();
  if (current3DObject) {
    box.setFromObject(current3DObject);
  } else {
    box.set(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 1, 1));
  }
  
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);

  const halfWidth = size.x / 2;
  const halfHeight = size.y / 2;
  const halfDepth = size.z / 2;
  
  // Add some padding
  const pad = 0.1;

  // Let's define the 5 standard CAO views dynamically based on the exact bounding box
  const views = [
    {
      name: 'face',
      isOrtho: true,
      orthoBounds: { left: -(halfWidth + pad), right: (halfWidth + pad), bottom: -(halfHeight + pad), top: (halfHeight + pad) },
      cameraPos: { x: center.x, y: center.y, z: box.max.z + 2.0 },
      cameraTarget: { x: center.x, y: center.y, z: center.z },
      hideTop: false
    },
    {
      name: 'dessus',
      isOrtho: true,
      orthoBounds: { left: -(halfWidth + pad), right: (halfWidth + pad), bottom: -(halfDepth + pad), top: (halfDepth + pad) },
      cameraPos: { x: center.x, y: box.max.y + 2.0, z: center.z },
      cameraTarget: { x: center.x, y: center.y, z: center.z },
      hideTop: false
    },
    {
      name: 'dessous',
      isOrtho: true,
      orthoBounds: { left: -(halfWidth + pad), right: (halfWidth + pad), bottom: -(halfDepth + pad), top: (halfDepth + pad) },
      cameraPos: { x: center.x, y: box.min.y - 2.0, z: center.z },
      cameraTarget: { x: center.x, y: center.y, z: center.z },
      hideTop: false
    },
    {
      name: 'cote',
      isOrtho: true,
      orthoBounds: { left: -(halfDepth + pad), right: (halfDepth + pad), bottom: -(halfHeight + pad), top: (halfHeight + pad) },
      cameraPos: { x: box.max.x + 2.0, y: center.y, z: center.z },
      cameraTarget: { x: center.x, y: center.y, z: center.z },
      hideTop: false
    },
    {
      name: 'cote_zoom',
      isOrtho: true,
      // Full height for zoom view
      orthoBounds: { left: -(halfDepth + pad), right: (halfDepth + pad), bottom: -(halfHeight + pad), top: (halfHeight + pad) },
      cameraPos: { x: box.max.x + 2.0, y: center.y, z: center.z },
      cameraTarget: { x: center.x, y: center.y, z: center.z },
      hideTop: false
    },
    {
      name: 'iso',
      isOrtho: false,
      cameraPos: { 
        x: center.x + size.x * 0.8, 
        y: box.max.y + size.y * 1.3, // Elevated more for top view
        z: box.max.z + Math.max(size.x, size.z) * 1.5 
      },
      cameraTarget: { x: center.x, y: center.y, z: center.z },
      hideTop: false
    }
  ];

  const hatchTexture = createHatchTexture();
  const clippingPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), center.x);

  const backMat = new THREE.MeshBasicMaterial();
  backMat.depthWrite = false;
  backMat.depthTest = false;
  backMat.colorWrite = false;
  backMat.stencilWrite = true;
  backMat.stencilRef = 1;
  backMat.stencilFunc = THREE.AlwaysStencilFunc;
  backMat.stencilFail = THREE.ReplaceStencilOp;
  backMat.stencilZFail = THREE.ReplaceStencilOp;
  backMat.stencilZPass = THREE.ReplaceStencilOp;
  backMat.clippingPlanes = [ clippingPlane ];
  backMat.side = THREE.BackSide;

  const frontMat = new THREE.MeshBasicMaterial();
  frontMat.depthWrite = false;
  frontMat.depthTest = false;
  frontMat.colorWrite = false;
  frontMat.stencilWrite = true;
  frontMat.stencilRef = 1;
  frontMat.stencilFunc = THREE.AlwaysStencilFunc;
  frontMat.stencilFail = THREE.DecrementWrapStencilOp;
  frontMat.stencilZFail = THREE.DecrementWrapStencilOp;
  frontMat.stencilZPass = THREE.DecrementWrapStencilOp;
  frontMat.clippingPlanes = [ clippingPlane ];
  frontMat.side = THREE.FrontSide;

  const capMat = new THREE.MeshBasicMaterial({ map: hatchTexture });
  capMat.stencilWrite = true;
  capMat.stencilRef = 1;
  capMat.stencilFunc = THREE.EqualStencilFunc;
  // Ensure the cap plane renders even if it is behind the far plane of orthogonal camera? No, it's inside the frustum.

  const stencilMeshes = [];

  views.forEach(view => {
    // Configure visibility
    if (view.hideTop) {
      hideNonSupport();
    } else {
      restoreNonSupport();
    }

    let activeCamera;
    if (view.isOrtho) {
      const { left, right, bottom, top } = view.orthoBounds;
      const boundsAspect = (right - left) / (top - bottom);
      
      const targetHeight = 500;
      const targetWidth = Math.round(targetHeight * boundsAspect);
      renderer.setSize(targetWidth, targetHeight, false);
      
      activeCamera = new THREE.OrthographicCamera(left, right, top, bottom, 0.1, 100);
      activeCamera.position.set(view.cameraPos.x, view.cameraPos.y, view.cameraPos.z);
      activeCamera.lookAt(view.cameraTarget.x, view.cameraTarget.y, view.cameraTarget.z);
      
      if (view.name === 'face') {
        console.log("Face Camera Pos:", activeCamera.position);
        console.log("Face Camera Target:", view.cameraTarget);
        console.log("Face Frustum (l,r,t,b):", left, right, top, bottom);
      }
    } else {
      // Perspective camera (use fixed size for consistent framing, high res)
      renderer.setSize(933, 600, false);
      
      activeCamera = camera;
      camera.position.set(view.cameraPos.x, view.cameraPos.y, view.cameraPos.z);
      controls.target.set(view.cameraTarget.x, view.cameraTarget.y, view.cameraTarget.z);
      controls.update();
    }

    // Setup Cross Section Stencil
    if (view.name === 'cote_zoom') {
      renderer.localClippingEnabled = true;

      // Add clipping plane to existing materials
      scene.traverse(child => {
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.clippingPlanes = [ clippingPlane ]);
          } else {
            child.material.clippingPlanes = [ clippingPlane ];
          }
        }
        
        if (child.isMesh && child.material && !child.userData.isEdgeHelper) {
          // Only create stencil for things that are cut
          const backMesh = new THREE.Mesh(child.geometry, backMat);
          backMesh.matrix.copy(child.matrixWorld);
          backMesh.matrixWorld.copy(child.matrixWorld);
          backMesh.matrixAutoUpdate = false;
          
          const frontMesh = new THREE.Mesh(child.geometry, frontMat);
          frontMesh.matrix.copy(child.matrixWorld);
          frontMesh.matrixWorld.copy(child.matrixWorld);
          frontMesh.matrixAutoUpdate = false;

          scene.add(backMesh);
          scene.add(frontMesh);
          stencilMeshes.push(backMesh, frontMesh);
        }
      });

      // Add the cap mesh
      const capGeom = new THREE.PlaneGeometry(5000, 5000);
      const capMesh = new THREE.Mesh(capGeom, capMat);
      capMesh.position.x = center.x;
      capMesh.rotation.y = Math.PI / 2; // Facing the camera
      scene.add(capMesh);
      stencilMeshes.push(capMesh);
    }

    // Render view
    renderer.render(scene, activeCamera);
    
    // Clean up Cross Section Stencil
    if (view.name === 'cote_zoom') {
      renderer.localClippingEnabled = false;
      stencilMeshes.forEach(m => scene.remove(m));
      stencilMeshes.length = 0;
      
      scene.traverse(child => {
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.clippingPlanes = null);
          } else {
            child.material.clippingPlanes = null;
          }
        }
      });
    }

    // Capture data URL
  // Capture data URL
    results[view.name] = renderer.domElement.toDataURL('image/png');
  });

  // Restore everything
  scene.background = originalBackground;

  // Restore lighting
  if (hemiLight) hemiLight.intensity = oldHemiIntensity;
  if (ambientLight) ambientLight.intensity = oldAmbientIntensity;
  dirLights.forEach(dl => {
    if (oldDirIntensities.has(dl)) {
      dl.intensity = oldDirIntensities.get(dl);
      dl.castShadow = true;
    }
  });

  // Restore frustum culling and original colors
  originalFrustumStates.forEach((state, child) => {
    child.frustumCulled = state;
  });
  originalColors.forEach((color, material) => {
    material.color.setHex(color);
    material.polygonOffset = false;
    material.polygonOffsetFactor = 0;
    material.polygonOffsetUnits = 0;
  });

  // Remove edge helpers
  edgeHelpers.forEach(({parent, line, geomToDispose}) => {
    parent.remove(line);
    line.geometry.dispose();
    line.material.dispose();
    if (geomToDispose) {
      geomToDispose.dispose();
    }
  });

  restoreNonSupport();
  helpersToRestore.forEach(h => { h.visible = true; });
  camera.position.copy(oldPos);
  controls.target.copy(oldTarget);
  controls.update();
  
  // Restore original renderer size
  renderer.setSize(originalSize.x, originalSize.y, false);

  const resultData = {
    images: results,
    dims: {
      x: (size.x + 2 * pad) * 100, // Include padding and scale 100 to mm!
      y: (size.y + 2 * pad) * 100,
      z: (size.z + 2 * pad) * 100,
      boxY: size.y * 100,
      boxZ: size.z * 100
    }
  };
  
  // Re-render final scene
  renderer.render(scene, camera);

  if (callback) callback(resultData);
};


function handleWindowResize() {
  if (!camera || !renderer || !threeCanvas) return;
  camera.aspect = threeCanvas.clientWidth / threeCanvas.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(threeCanvas.clientWidth, threeCanvas.clientHeight, false);
}

function renderScene() {
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
  requestAnimationFrame(renderScene);
}

// Retourne le nom de base du modèle sans suffixe -STP
function getBaseModelName() {
  return (state.model || '').replace(/-STP$/, '');
}

// Retourne true si le modèle sélectionné est STP (sans trop-plein)
function isSTPModel() {
  return (state.model || '').endsWith('-STP');
}

// Retourne true si on a un modèle 3D disponible (VO390 pour l'instant)
function is3DModel() {
  const base = getBaseModelName();
  return base === 'VO390';
}

function extract3DParameters(object) {
  // Log ALL objects to find exact bone names
  console.log('=== ALL OBJECTS IN FBX ===');
  object.traverse(child => {
    console.log(`[${child.type}] ${child.name} | pos.x=${child.position.x.toFixed(1)}`);
  });
  console.log('=========================');

  plateauBones.leftBone = object.getObjectByName('Bone_Long_G');
  plateauBones.rightBone = object.getObjectByName('Bone_Long_D');
  plateauBones.leftMesh = object.getObjectByName('Rive_G');
  plateauBones.rightMesh = object.getObjectByName('Rive_D');
  plateauBones.frontMesh = object.getObjectByName('Rive_Av');
  
  plateauBones.cuveBones = [];
  plateauBones.baseCuveBoneX = [];
  for (let i = 1; i <= 4; i++) {
    const b = object.getObjectByName(`Bone_Cuve${i}`);
    if (b) {
      plateauBones.cuveBones.push(b);
      plateauBones.baseCuveBoneX.push(b.position.x);
    }
  }
  console.log('Cuve bones found:', plateauBones.cuveBones.map((b,i) => b.name + ' x=' + plateauBones.baseCuveBoneX[i]));

  // Sauvegarde des positions initiales pour les offsets relatifs
  plateauBones.baseLeftBoneX = plateauBones.leftBone ? plateauBones.leftBone.position.x : -400;
  plateauBones.baseRightBoneX = plateauBones.rightBone ? plateauBones.rightBone.position.x : 400;
  
  if (plateauBones.leftMesh) plateauBones.baseLeftMeshX = plateauBones.leftMesh.position.x;
  if (plateauBones.rightMesh) plateauBones.baseRightMeshX = plateauBones.rightMesh.position.x;
  
  if (plateauBones.frontMesh) {
    plateauBones.baseFrontMeshX = plateauBones.frontMesh.position.x;
    if (plateauBones.frontMesh.geometry) {
      plateauBones.frontMesh.geometry.computeBoundingBox();
      const bbox = plateauBones.frontMesh.geometry.boundingBox;
      if (bbox) {
        baseFrontLength = bbox.max.x - bbox.min.x;
      }
    }
  }
}

function show3DPreview() {
  if (threeCanvas) threeCanvas.style.display = 'block';
  if (mainPreviewImg) mainPreviewImg.style.display = 'none';
  load3DModelForSelection();
}

function showImagePreview(url) {
  if (threeCanvas) threeCanvas.style.display = 'none';
  if (mainPreviewImg) {
    mainPreviewImg.style.display = 'block';
    
    if (!url || url === 'Image') {
      mainPreviewImg.style.opacity = 0;
      if (viewerLoading) viewerLoading.classList.remove('show');
      return;
    }

    if (mainPreviewImg.getAttribute('src') !== url) {
      if (viewerLoading) viewerLoading.classList.add('show');
      mainPreviewImg.style.opacity = 0;
      mainPreviewImg.src = url;
    } else {
      if (viewerLoading) viewerLoading.classList.remove('show');
      mainPreviewImg.style.opacity = 1;
    }
  }
}

function update3DScale() {
  if (!current3DObject) return;

  const baseScale = 0.01;
  const yScale = state.height / 14;
  const objectYScale = is3DModel() ? 1 : yScale;

  // Parent remains centered on origin (fixed XYZ frame)
  current3DObject.scale.set(baseScale, baseScale * objectYScale, baseScale);
  current3DObject.position.set(0, 0, 0);

  if (is3DModel()) {
    const lengthMm = state.length * 10;
    const halfLength = lengthMm / 2;

    const data = cuvesData[state.model] || {};
    const cLengthMm = data.cuveLength || 390;
    const gapMm = state.plageEntreCuves * 10;
    const nb = parseInt(state.nbCuves) || 1;

    // Plan is centered around 0, basins move in absolute units
    const plageGaucheMm = state.position * 10;

    // Moving basin bones
    if (plateauBones.cuveBones && plateauBones.cuveBones.length > 0) {
      for (let i = 0; i < plateauBones.cuveBones.length; i++) {
        if (i < nb) {
          const cuveX = -halfLength + plageGaucheMm + i * (cLengthMm + gapMm) + cLengthMm / 2;
          plateauBones.cuveBones[i].position.x = cuveX;
        }
      }
    }

    // Moving plan side bones
    if (plateauBones.leftBone) plateauBones.leftBone.position.x = -halfLength;
    if (plateauBones.rightBone) plateauBones.rightBone.position.x = halfLength;

    // Scale side meshes (Rive_G and Rive_D)
    if (plateauBones.leftMesh) {
      plateauBones.leftMesh.scale.set(1, 1, yScale);
    }
    if (plateauBones.rightMesh) {
      plateauBones.rightMesh.scale.set(1, 1, yScale);
    }
    
    // Scale front apron (Rive_Av)
    if (plateauBones.frontMesh) {
      const frontScaleX = lengthMm / baseFrontLength;
      plateauBones.frontMesh.scale.set(frontScaleX, 1, yScale);
      plateauBones.frontMesh.position.x = 0;
    }

    // Manage 3D basin instances
    cuveInstances.forEach(inst => {
      if (current3DObject) current3DObject.remove(inst);
    });
    cuveInstances = [];

    if (baseCuveModel && current3DObject) {
      for (let i = 0; i < nb; i++) {
        const cuveInst = baseCuveModel.clone();
        const cuveX = -halfLength + plageGaucheMm + i * (cLengthMm + gapMm) + cLengthMm / 2;
        cuveInst.position.x = cuveX;
        current3DObject.add(cuveInst);
        cuveInstances.push(cuveInst);
      }
    }

    // Scale and position specific support pieces
    if (supportModel) {
      window.supportModel = supportModel;
      window.supportScaleMeshes = supportScaleMeshes;
      const lengthMm = state.length * 10;
      const halfLength = lengthMm / 2;
      
      const baseHalfLength = 300;
      
      supportScaleMeshes.forEach(item => {
        const { mesh, baseSize, retrait } = item;
        let scaleX = 1;
        if (baseSize > 0) {
          scaleX = (lengthMm - retrait) / baseSize;
        }
        mesh.scale.x = scaleX;
        console.log(`Scale mesh "${mesh.name}": scaleX=${scaleX.toFixed(4)} (lengthMm=${lengthMm}, retrait=${retrait}, baseSize=${baseSize.toFixed(2)})`);
      });

      // Symmetric translation of left and right support sections
      const displacement = halfLength - baseHalfLength;
      
      // S'assurer que les matrices mondiales du support sont à jour
      supportModel.updateMatrixWorld(true);

      supportLeftBones.forEach(bone => {
        const basePos = supportLeftBonesBasePos.get(bone.uuid);
        if (basePos && bone.parent) {
          // Le déplacement cible dans le repère local de supportModel
          const targetPosInSupport = basePos.clone();
          targetPosInSupport.x -= displacement;

          // Conversion de supportModel local vers monde
          const targetWorldPos = targetPosInSupport.clone().applyMatrix4(supportModel.matrixWorld);

          // Conversion de monde vers local parent de l'os
          bone.parent.updateMatrixWorld(true);
          const invParentMatrix = new THREE.Matrix4().copy(bone.parent.matrixWorld).invert();
          const targetLocalPos = targetWorldPos.clone().applyMatrix4(invParentMatrix);

          bone.position.copy(targetLocalPos);
        }
      });

      supportRightBones.forEach(bone => {
        const basePos = supportRightBonesBasePos.get(bone.uuid);
        if (basePos && bone.parent) {
          // Le déplacement cible dans le repère local de supportModel
          const targetPosInSupport = basePos.clone();
          targetPosInSupport.x += displacement;

          // Conversion de supportModel local vers monde
          const targetWorldPos = targetPosInSupport.clone().applyMatrix4(supportModel.matrixWorld);

          // Conversion de monde vers local parent de l'os
          bone.parent.updateMatrixWorld(true);
          const invParentMatrix = new THREE.Matrix4().copy(bone.parent.matrixWorld).invert();
          const targetLocalPos = targetWorldPos.clone().applyMatrix4(invParentMatrix);

          bone.position.copy(targetLocalPos);
        }
      });

      // ---- Ajout des équerres supplémentaires ----
      if (!window.extraBrackets) window.extraBrackets = [];

      if (state.nbCuves > 1) {
        const boneG = supportLeftBones.length > 0 ? supportLeftBones[0] : null;
        const boneD = supportRightBones.length > 0 ? supportRightBones[0] : null;

        if (boneG && boneD) {
          const cLengthMm = cuvesData[state.model]?.cuveLength || 390;
          const gapMm = state.plageEntreCuves * 10;
          const plageGaucheMm = state.position * 10;
          const numNeeded = state.nbCuves - 1;

          // Retirer les équerres en trop
          while (window.extraBrackets.length > numNeeded) {
            const b = window.extraBrackets.pop();
            if (b.parent) b.parent.remove(b);
            b.traverse(child => {
              if (child.isMesh && child.userData.customMaterial) {
                if (Array.isArray(child.userData.customMaterial)) {
                  child.userData.customMaterial.forEach(m => m.dispose());
                } else {
                  child.userData.customMaterial.dispose();
                }
              }
            });
          }

          for (let i = 0; i < numNeeded; i++) {
            const cuve1X = -halfLength + plageGaucheMm + i * (cLengthMm + gapMm) + cLengthMm / 2;
            const cuve2X = cuve1X + cLengthMm + gapMm;
            const centerX = (cuve1X + cuve2X) / 2;

            // Choose bracket based on center
            const isLeft = centerX < 0;
            const srcBone = isLeft ? boneG : boneD;
            const boneType = isLeft ? 'G' : 'D';
            
            // Calculer le décalage relatif à l'os source
            // L'os gauche est actuellement placé pour correspondre à -halfLength
            // L'os droit est placé pour correspondre à +halfLength
            const refX = isLeft ? -halfLength : halfLength;
            const deltaX = centerX - refX;
            const targetX = srcBone.position.x + deltaX;
            
            let clonedBone;
            if (i < window.extraBrackets.length) {
              clonedBone = window.extraBrackets[i];
              if (clonedBone.userData.boneType !== boneType) {
                 // Remplacer si le type de console (G/D) a changé
                 if (clonedBone.parent) clonedBone.parent.remove(clonedBone);
                 clonedBone.traverse(child => {
                   if (child.isMesh && child.userData.customMaterial) {
                     if (Array.isArray(child.userData.customMaterial)) child.userData.customMaterial.forEach(m => m.dispose());
                     else child.userData.customMaterial.dispose();
                   }
                 });
                 clonedBone = SkeletonUtils.clone(srcBone);
                 clonedBone.userData.boneType = boneType;
                 srcBone.parent.add(clonedBone);
                 window.extraBrackets[i] = clonedBone;
              }
              clonedBone.position.x = targetX;
            } else {
              clonedBone = SkeletonUtils.clone(srcBone);
              clonedBone.userData.boneType = boneType;
              clonedBone.position.copy(srcBone.position);
              clonedBone.position.x = targetX;
              srcBone.parent.add(clonedBone);
              window.extraBrackets.push(clonedBone);
            }
          }
        }
      } else {
         // 1 cuve -> nettoyer tout
         if (window.extraBrackets) {
           window.extraBrackets.forEach(b => {
             if (b.parent) b.parent.remove(b);
             b.traverse(child => {
               if (child.isMesh && child.userData.customMaterial) {
                 if (Array.isArray(child.userData.customMaterial)) child.userData.customMaterial.forEach(m => m.dispose());
                 else child.userData.customMaterial.dispose();
               }
             });
           });
           window.extraBrackets = [];
         }
      }
      // --------------------------------------------

      // --- GESTION DES PORTES DU SUPPORT THALLISOL ---
      // 1. Nettoyer le groupe existant de portes
      if (supportPortesGroup) {
        supportModel.remove(supportPortesGroup);
        supportPortesGroup = null;
      }

      // 2. Instancier et centrer le groupe de portes si basePorteModel est chargé
      if (basePorteModel) {
        // Déterminer le nombre de portes et leur largeur selon la formule utilisateur (porte max 600mm)
        let minDoors = 1;
        while (true) {
          const w = (lengthMm - (69 + 3 * (minDoors - 1))) / minDoors;
          if (w <= 600) {
            break;
          }
          minDoors++;
        }
        
        // Fonction pour vérifier si une coordonnée X (locale dans le repère du meuble) est sous une cuve
        // On ajoute 50mm de marge (25mm de chaque côté) car la cuve est plus longue en dessous.
        const isUnderCuve = (xVal) => {
          for (let k = 0; k < nb; k++) {
            const cuveX = -halfLength + plageGaucheMm + k * (cLengthMm + gapMm) + cLengthMm / 2;
            const effectiveLength = cLengthMm + 50;
            const leftBound = cuveX - effectiveLength / 2;
            const rightBound = cuveX + effectiveLength / 2;
            if (xVal >= leftBound && xVal <= rightBound) {
              return true;
            }
          }
          return false;
        };

        let bestConfig = null;
        
        // Parcourir tous les nombres de portes candidats possibles (où la largeur de porte >= 200mm)
        for (let n = minDoors; n <= minDoors + 10; n++) {
          const w = (lengthMm - (69 + 3 * (n - 1))) / n;
          if (w < 200) {
            break; // Empêcher les portes d'être trop étroites
          }
          
          const groupWidth = n * w + 3 * (n - 1);
          const startX = -groupWidth / 2;
          
          // Algorithme de Programmation Dynamique pour trouver les rotations optimales
          // dp[i][r] = { cost, path: [] }
          const dp = [];
          for (let i = 0; i < n; i++) {
            dp.push([
              { cost: Infinity, path: [] }, // r = 0 (N)
              { cost: Infinity, path: [] }  // r = 1 (R)
            ]);
          }
          
          // Cas de base : la première porte doit être R (true)
          dp[0][1] = { cost: 0, path: [true] };
          
          for (let i = 1; i < n; i++) {
            const g = i - 1;
            const xGap = startX + g * (w + 3) + w + 1.5;
            const gapUnderCuve = isUnderCuve(xGap);
            
            for (let r = 0; r <= 1; r++) { // Rotation de la porte actuelle (0 = N, 1 = R)
              if (i === n - 1 && r === 1) {
                // La dernière porte doit être N (0)
                continue;
              }
              
              let bestPrev = -1;
              let minCost = Infinity;
              
              for (let p = 0; p <= 1; p++) { // Rotation de la porte précédente (0 = N, 1 = R)
                if (dp[i-1][p].cost === Infinity) continue;
                
                const leftDoorHingesAtGap = (p === 0 && g > 0);
                const rightDoorHingesAtGap = (r === 1 && i < n - 1);
                const hasHinge = leftDoorHingesAtGap || rightDoorHingesAtGap;
                
                let transitionCost = 0;
                if (hasHinge) {
                  // Les collisions coûtent 1000 pour être pénalisées en priorité
                  transitionCost = 1 + (gapUnderCuve ? 1000 : 0);
                }
                
                const totalCost = dp[i-1][p].cost + transitionCost;
                if (totalCost < minCost) {
                  minCost = totalCost;
                  bestPrev = p;
                }
              }
              
              if (bestPrev !== -1) {
                dp[i][r] = {
                  cost: minCost,
                  path: [...dp[i-1][bestPrev].path, r === 1]
                };
              }
            }
          }
          
          const result = dp[n - 1][0];
          if (result && result.cost !== Infinity) {
            const collisions = Math.floor(result.cost / 1000);
            const separations = result.cost % 1000;
            
            // Sélectionner la meilleure configuration :
            // 1. D'abord celle avec le moins de collisions.
            // 2. Ensuite celle avec le moins de séparations.
            // 3. En cas d'égalité, celle avec le moins de portes pour éviter d'avoir trop de petites portes.
            if (!bestConfig || 
                collisions < bestConfig.collisions || 
                (collisions === bestConfig.collisions && separations < bestConfig.separations) ||
                (collisions === bestConfig.collisions && separations === bestConfig.separations && n < bestConfig.n)) {
              bestConfig = {
                n,
                w,
                rotations: result.path,
                collisions,
                separations
              };
            }
          }
        }
        
        let numDoors = minDoors;
        let doorWidth = (lengthMm - (69 + 3 * (numDoors - 1))) / numDoors;
        let doorRotations = [];
        
        if (bestConfig) {
          numDoors = bestConfig.n;
          doorWidth = bestConfig.w;
          doorRotations = bestConfig.rotations;
          console.log(`🚪 Configuration optimale choisie : ${numDoors} portes de ${doorWidth.toFixed(1)}mm de large, ${bestConfig.separations} séparations, ${bestConfig.collisions} collisions.`);
        } else {
          // Fallback minimal
          console.warn("⚠️ Aucune configuration valide trouvée par DP, fallback sur le mode minimal.");
          doorRotations = [];
          const groupWidth = numDoors * doorWidth + 3 * (numDoors - 1);
          const startX = -groupWidth / 2;
          for (let i = 0; i < numDoors; i++) {
            let shouldRotate = false;
            if (numDoors > 1) {
              if (i === 0) {
                shouldRotate = true;
              } else if (i === numDoors - 1) {
                shouldRotate = false;
              } else {
                const doorX = startX + i * (doorWidth + 3);
                const leftGapX = doorX - 1.5;
                const rightGapX = doorX + doorWidth + 1.5;
                const leftUnder = isUnderCuve(leftGapX);
                const rightUnder = isUnderCuve(rightGapX);
                if (rightUnder && !leftUnder) {
                  shouldRotate = true;
                } else if (leftUnder && !rightUnder) {
                  shouldRotate = false;
                } else {
                  shouldRotate = (i % 2 === 0);
                }
              }
            }
        }
      }
        
      state.doorLayout = {
          numDoors,
          doorWidth,
          doorRotations: [...doorRotations]
        };
        
        // Largeur de base de la porte dans le FBX = 531 mm
        const doorScaleX = doorWidth / 531;
        
        // Largeur totale occupée par l'ensemble des portes + les gonds/jeux intermédiaires de 3mm
        const totalDoorsGroupWidth = numDoors * doorWidth + 3 * (numDoors - 1);
        
        // Coordonnée locale de début du groupe (centré sur son origine 0)
        const xStartLocal = -totalDoorsGroupWidth / 2;
        
        supportPortesGroup = new THREE.Group();
        supportPortesGroup.name = "SupportPortesGroup";

        for (let i = 0; i < numDoors; i++) {
          const porteClone = basePorteModel.clone();
          const shouldRotate = doorRotations[i];
          const doorXLocal = xStartLocal + i * (doorWidth + 3);
          
          if (shouldRotate) {
            // Rotation de 180° autour de l'axe Z (à la demande de l'utilisateur)
            porteClone.rotation.z = Math.PI;
            porteClone.position.set(doorXLocal + 265.5, -940, 0);
          } else {
            porteClone.position.set(doorXLocal - 265.5 + doorWidth, 0, 0);
          }
          
          // Mettre à l'échelle uniquement le Mesh de la porte
          const porteMesh = porteClone.getObjectByName('PorteThalliSol');
          if (porteMesh) {
            porteMesh.scale.x = doorScaleX;
          }
          
          // Repositionner les charnières CharB et CharH au bord de la porte
          const charX = 250.22;
          
          const charB = porteClone.getObjectByName('CharB');
          if (charB) {
            charB.position.x = charX;
            charB.scale.set(1, 1, 1);
          }
          const charH = porteClone.getObjectByName('CharH');
          if (charH) {
            charH.position.x = charX;
            charH.scale.set(1, 1, 1);
          }
          
          supportPortesGroup.add(porteClone);
        }

        // 3. Instancier et positionner les séparations s'il y a des charnières dans le vide (hors sous-cuves)
        if (baseSepModel) {
          for (let g = 0; g < numDoors - 1; g++) {
            const leftRotated = doorRotations[g];
            const rightRotated = doorRotations[g+1];
            
            const leftDoorHingesAtGap = (!leftRotated && g > 0);
            const rightDoorHingesAtGap = (rightRotated && (g + 1) < numDoors - 1);
            
            if (leftDoorHingesAtGap || rightDoorHingesAtGap) {
              const xGap = xStartLocal + g * (doorWidth + 3) + doorWidth + 1.5;
              
              if (!isUnderCuve(xGap)) {
                const sepClone = baseSepModel.clone();
                sepClone.position.set(xGap, 0, 0);
                supportPortesGroup.add(sepClone);
                console.log(`🔨 Ajout séparation au jeu ${g} (X = ${xGap.toFixed(1)}mm)`);
              } else {
                console.log(`⚠️ Séparation au jeu ${g} (X = ${xGap.toFixed(1)}mm) ignorée car située sous une cuve`);
              }
            }
          }
        }
        
        // Centrer le groupe par rapport à supportModel (X=0)
        supportPortesGroup.position.set(0, 0, 0);
        supportModel.add(supportPortesGroup);
      }

      supportModel.position.set(0, 0, 0);
    }

  }
}

function collectSupportMorphTargets(object) {
  supportScaleMeshes = [];
  supportMoveMeshes = [];
  supportBaseLocalX = new Map();
  supportLeftBones = [];
  supportRightBones = [];
  supportLeftBonesBasePos = new Map();
  supportRightBonesBasePos = new Map();

  const RETRAITS = {
    'thallis_dos': 28,
    'dos_thal': 28,
    'facethal': 28,
    'bas_eos_thallisol': 66,
    'face_eos_thallisol': 66,
    'plintheeos_thallisol': 88
  };

  // Mettre à jour les matrices mondiales de l'objet pour pouvoir calculer les positions dans son repère
  object.updateMatrixWorld(true);
  const invSupportMatrix = new THREE.Matrix4().copy(object.matrixWorld).invert();

  console.log('=== COLLECTING SUPPORT MESHES ===');
  object.traverse(child => {
    const name = String(child.name || '').toLowerCase();
    
    // Detect Bone_Long_G and Bone_Long_D
    if (child.name === 'Bone_Long_G') {
      supportLeftBones.push(child);
      
      const boneWorldPos = new THREE.Vector3();
      child.getWorldPosition(boneWorldPos);
      const basePosInSupport = boneWorldPos.clone().applyMatrix4(invSupportMatrix);
      supportLeftBonesBasePos.set(child.uuid, basePosInSupport);
      
      console.log(`Support left bone found: "${child.name}" (UUID: ${child.uuid}) | BasePosInSupport: Y=${basePosInSupport.y.toFixed(2)}`);
    } else if (child.name === 'Bone_Long_D') {
      supportRightBones.push(child);
      
      const boneWorldPos = new THREE.Vector3();
      child.getWorldPosition(boneWorldPos);
      const basePosInSupport = boneWorldPos.clone().applyMatrix4(invSupportMatrix);
      supportRightBonesBasePos.set(child.uuid, basePosInSupport);
      
      console.log(`Support right bone found: "${child.name}" (UUID: ${child.uuid}) | BasePosInSupport: Y=${basePosInSupport.y.toFixed(2)}`);
    }
    
    if (child.isMesh) {
      supportBaseLocalX.set(child.uuid, child.position.x);
      
      let retraitMm = null;
      for (const key of Object.keys(RETRAITS)) {
        if (name.includes(key)) {
          retraitMm = RETRAITS[key];
          break;
        }
      }
      
      if (retraitMm !== null) {
        // Measure base width along X
        const bbox = new THREE.Box3().setFromObject(child);
        const baseSizeX = bbox.max.x - bbox.min.x;
        
        supportScaleMeshes.push({
          mesh: child,
          baseSize: baseSizeX,
          retrait: retraitMm
        });
        console.log(`📐 SCALE MESH: "${child.name}" | baseSize_X=${baseSizeX.toFixed(2)}mm | Retrait=${retraitMm}mm | Position_X=${child.position.x.toFixed(2)}`);
      } else {
        console.log(`Support mesh: "${child.name}" | X=${child.position.x.toFixed(2)} | shouldScale=false`);
      }
      
      if (Array.isArray(child.morphTargetInfluences) && child.morphTargetInfluences.length > 0) {
        console.log('Support morph target mesh:', child.name, child.morphTargetDictionary);
      }
    }
  });
  console.log(`=== END: ${supportScaleMeshes.length} scale meshes collected ===`);

  if (supportScaleMeshes.length === 0) {
    console.warn('Aucun mesh à mise à l\'échelle détecté dans le support. Les pièces spécifiées n\'ont pas été trouvées.');
  }
}

function loadCuveModel(callback) {
  const base = getBaseModelName();
  const stp = isSTPModel();
  // Nom du fichier cuve : Cuve_VO390_STP.fbx ou Cuve_VO390.fbx
  const cuveFileName = stp ? `Cuve_${base}_STP.fbx` : `Cuve_${base}.fbx`;
  const cuvePath = `3D - Morth Targets/${base}/${cuveFileName}`;

  // Si le modèle chargé correspond déjà au bon fichier, on ne recharge pas
  if (baseCuveModel && baseCuveModel._loadedPath === cuvePath) {
    if (callback) callback();
    return;
  }
  
  // Réinitialise pour forcer le rechargement lors d'un changement de modèle
  baseCuveModel = null;

  fbxLoader.load(encodeURI(cuvePath), object => {
    object.traverse(child => {
      applyStandardMeshSettings(child);
    });
    object.scale.set(1, 1, 1);
    object._loadedPath = cuvePath; // mémorise le chemin chargé
    baseCuveModel = object;
    if (callback) callback();
  }, undefined, err => {
    console.warn(`Cuve FBX introuvable: ${cuvePath}`, err);
    // Fallback : on continue sans cuve si le fichier n'existe pas
    if (callback) callback();
  });
}

function loadSupportModel(callback) {
  const base = getBaseModelName();
  const support = state.support;
  
  // Si le support est "SANS", on ne charge rien
  if (support === 'SANS') {
    if (supportModel && current3DObject) {
      current3DObject.remove(supportModel);
    }
    supportModel = null;
    supportScaleMeshes = [];
    supportMoveMeshes = [];
    supportBaseLocalX = new Map();
    supportLeftBones = [];
    supportRightBones = [];
    supportLeftBonesBasePos.clear();
    supportRightBonesBasePos.clear();
    
    // Nettoyer les portes du support
    supportPortesGroup = null;
    basePorteModel = null;
    baseSepModel = null;

    if (callback) callback();
    return;
  }
  
  // Construire le chemin du fichier de support
  // Mapping des supports aux noms de fichiers
  const supportMapping = {
    'TH': 'TH',
    'THAL': 'Thal',
    'THALLIS': 'Thallis',
    'THALLISOL': 'Thallisol'
  };
  
  const supportFileName = supportMapping[support] || support;
  const supportPath = `3D - Morth Targets/${base}/${base}_${supportFileName}.fbx`;
  
  // Si le modèle chargé correspond déjà au bon fichier, on ne recharge pas
  if (supportModel && supportModel._loadedPath === supportPath) {
    if (callback) callback();
    return;
  }
  
  // Réinitialise pour forcer le rechargement lors d'un changement de support
  if (supportModel && current3DObject) {
    current3DObject.remove(supportModel);
  }
  supportModel = null;

  fbxLoader.load(encodeURI(supportPath), object => {
    object.traverse(child => {
      applyStandardMeshSettings(child);
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.userData.originalMaterial = child.material.map(m => (m && typeof m.clone === 'function') ? m.clone() : m);
        } else {
          child.userData.originalMaterial = (child.material && typeof child.material.clone === 'function') ? child.material.clone() : child.material;
        }
      }
    });
    object.scale.set(1, 1, 1);
    object._loadedPath = supportPath; // mémorise le chemin chargé
    supportModel = object;
    window.supportModel = object;
    collectSupportMorphTargets(object);
    window.supportScaleMeshes = supportScaleMeshes;
    
    // Ajouter le support à la scène 3D
    if (current3DObject) {
      current3DObject.add(supportModel);
    }
    
    if (support === 'THALLISOL') {
      const portePath = `3D - Morth Targets/${base}/PorteThalliSol.fbx`;
      const sepPath = `3D - Morth Targets/${base}/ThalliSol_Sep_EOS.fbx`;
      fbxLoader.load(encodeURI(portePath), porteObject => {
        porteObject.traverse(child => {
          applyStandardMeshSettings(child);
        });
        basePorteModel = porteObject;
        console.log(`Porte FBX chargée avec succès depuis : ${portePath}`);
        
        // Charger la séparation
        fbxLoader.load(encodeURI(sepPath), sepObject => {
          sepObject.traverse(child => {
            applyStandardMeshSettings(child);
          });
          baseSepModel = sepObject;
          console.log(`Séparation FBX chargée avec succès depuis : ${sepPath}`);
          if (callback) callback();
        }, undefined, err => {
          console.warn(`FBX Séparation introuvable : ${sepPath}`, err);
          baseSepModel = null;
          if (callback) callback();
        });
      }, undefined, err => {
        console.warn(`FBX Porte introuvable : ${portePath}`, err);
        basePorteModel = null;
        baseSepModel = null;
        if (callback) callback();
      });
    } else {
      supportPortesGroup = null;
      basePorteModel = null;
      baseSepModel = null;
      if (callback) callback();
    }
  }, undefined, err => {
    console.warn(`Support FBX introuvable: ${supportPath}`, err);
    // Fallback : on continue sans support si le fichier n'existe pas
    if (callback) callback();
  });
}



function load3DModelForSelection() {
  if (!is3DModel() || !fbxLoader) return;

  const targetCount = state.nbCuves || '1';
  const base = getBaseModelName();
  const cacheKey = `${base}_${targetCount}`;
  if (loadedModelCount === cacheKey && current3DObject) {
    // Le plateau est déjà chargé, mais la cuve/support peuvent avoir changé
    loadCuveModel(() => {
      loadSupportModel(() => {
        update3DScale();
      });
    });
    return;
  }

  const modelPath = `3D - Morth Targets/${base}/${base}_${targetCount}.fbx`;

  if (viewerLoading) viewerLoading.classList.add('show');
  if (current3DObject) {
    scene.remove(current3DObject);
    current3DObject.traverse(child => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (child.material?.dispose) child.material.dispose();
      }
    });
    current3DObject = null;
  }

  loadedModelCount = `${getBaseModelName()}_${targetCount}`;
  fbxLoader.load(encodeURI(modelPath), object => {
    object.traverse(child => {
      applyStandardMeshSettings(child);
    });

    object.position.set(0, 0, 0);
    object.rotation.y = 0; // Fix: face the camera by default
    current3DObject = object;
    scene.add(object);

    extract3DParameters(object);
    
    loadCuveModel(() => {
      loadSupportModel(() => {
        update3DScale();
        if (viewerLoading) viewerLoading.classList.remove('show');
      });
    });
  }, undefined, err => {
    console.error('Erreur de chargement 3D:', err);
    if (viewerLoading) viewerLoading.classList.remove('show');
  });
}

/* ══════════════════════════════════
   FETCH GOOGLE SHEETS
══════════════════════════════════ */
async function fetchCatalogue() {
  try {
    const res = await fetch(G_SHEET_URL);
    const text = await res.text();
    // Google Sheets renvoie du JSON enveloppé dans une fonction : /*O_o*/ google.visualization.Query.setResponse({ ... })
    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const json = JSON.parse(jsonStr);

    const rows = json.table.rows;
    cuvesData = {};

    rows.forEach((row, index) => {
      if (!row.c || !row.c[0] || !row.c[0].v) return;
      const modelName = row.c[0].v;
      const imgUrl = row.c[1] ? row.c[1].v : '';
      const utilisateurs = row.c[2] ? row.c[2].v : '1';
      const longueurLimitsRaw = row.c[3] ? String(row.c[3].v) : '';
      const cuveLength = row.c[4] && row.c[4].v ? parseFloat(row.c[4].v) : 390;
      let minLength = 40;
      let maxLength = 160;

      if (longueurLimitsRaw) {
        const cleaned = longueurLimitsRaw.replace(/\s+/g, '').replace(/,/g, ';');
        const parts = cleaned.split(/;|:|\-|–/).filter(Boolean);
        if (parts.length >= 2) {
          const parsedMin = parseInt(parts[0], 10);
          const parsedMax = parseInt(parts[1], 10);
          // Si les valeurs sont > 200, on assume que c'est en millimètres (donc on divise par 10)
          if (!Number.isNaN(parsedMin)) minLength = parsedMin > 200 ? parsedMin / 10 : parsedMin;
          if (!Number.isNaN(parsedMax)) maxLength = parsedMax > 200 ? parsedMax / 10 : parsedMax;
        }
      }

      cuvesData[modelName] = {
        label: modelName,
        img: imgUrl,
        cuves: utilisateurs,
        cuveLength: cuveLength,
        lengthLimits: {
          min: minLength,
          max: maxLength
        }
      };
    });

    window.cuvesData = cuvesData;
    populateModelSelect();
    
    // Auto-sélection du premier modèle si disponible
    const firstModel = Object.keys(cuvesData)[0];
    if (firstModel) {
      state.model = firstModel;
      selectModel.value = firstModel;
      applyStandardPosition();
      updateVisuals();
    }

  } catch (err) {
    console.error("Erreur de chargement du catalogue:", err);
    if (viewerModelTag) viewerModelTag.innerHTML = "Erreur réseau";
    if (viewerLoading) viewerLoading.innerHTML = "<p style='color:red;'>Impossible de charger Google Sheets.</p>";
  }
}

function populateModelSelect() {
  if (!selectModel) return;
  selectModel.innerHTML = '';
  for (const key in cuvesData) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = key;
    selectModel.appendChild(opt);
  }
}

function applyLengthLimits(data) {
  if (!sliderLength) return;
  
  const nb = parseInt(state.nbCuves) || 1;
  const cLength = (data.cuveLength || 390) / 10;
  
  let baseMin = data.lengthLimits?.min || 40;
  const max = data.lengthLimits?.max || 160;

  // Calcul du minimum absolu physique : (nb cuves * longueur cuve) + (nb plages * 5cm)
  // Il y a toujours (nb + 1) plages.
  const dynamicMin = (nb * cLength) + ((nb + 1) * 5);
  
  const min = Math.max(baseMin, dynamicMin);

  sliderLength.min = min;
  sliderLength.max = Math.max(min, max);

  let lengthChanged = false;
  if (state.length < min) {
    state.length = min;
    lengthChanged = true;
  }
  if (state.length > max) {
    state.length = max;
    lengthChanged = true;
  }
  
  if (lengthChanged) {
    applyStandardPosition();
  }
  sliderLength.value = state.length;

  if (valLength) valLength.textContent = state.length;
  if (fillLength) fillLength.style.width = calcFillPct(sliderLength) + '%';
  if (mtLength) mtLength.textContent = calcMorphValue(sliderLength);
}

/* ══════════════════════════════════
   STEP NAVIGATION
══════════════════════════════════ */
function goToStep(n) {
  state.step = n;
  document.querySelectorAll('.config-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`section-${n}`);
  if (target) target.classList.add('active');

  document.querySelectorAll('.step').forEach(el => {
    const sn = parseInt(el.dataset.step);
    el.classList.remove('active', 'done');
    if (sn === n) el.classList.add('active');
    if (sn < n)  el.classList.add('done');
  });
}

$('btn-next-1')?.addEventListener('click', () => goToStep(2));
$('btn-next-2')?.addEventListener('click', () => goToStep(3));
$('btn-back-2')?.addEventListener('click', () => goToStep(1));
$('btn-back-3')?.addEventListener('click', () => goToStep(2));

document.querySelectorAll('.step').forEach(el => {
  el.addEventListener('click', () => {
    const n = parseInt(el.dataset.step);
    if (n <= Math.max(state.step, 1)) goToStep(n);
  });
});

function applyStandardPosition() {
  const data = cuvesData[state.model] || {};
  const nb = parseInt(state.nbCuves) || 1;
  const cLength = (data.cuveLength || 390) / 10;
  
  if (nb === 1) {
    state.position = Math.max(5, Math.round(((state.length - cLength) / 2) * 10) / 10);
  } else {
    const remainingSpace = state.length - (nb * cLength);
    let plageEntreCuves = remainingSpace / nb;
    let pos = plageEntreCuves / 2;

    if (pos < 5) {
      pos = 5;
      // Il y a (nb - 1) plages entre cuves.
      // Espace restant pour elles = remainingSpace - 2 * pos
      plageEntreCuves = (remainingSpace - 10) / (nb - 1);
    }

    state.plageEntreCuves = Math.round(plageEntreCuves * 10) / 10;
    state.position = Math.round(pos * 10) / 10;
  }
}

/* ══════════════════════════════════
   EVENT LISTENERS
══════════════════════════════════ */
selectModel?.addEventListener('change', e => {
  state.model = e.target.value;
  // Reset le support chargé car le modèle de base a peut-être changé
  applyStandardPosition();
  updateVisuals();
});

selectSupport?.addEventListener('change', e => {
  state.support = e.target.value;
  updateVisuals();
});

selectNbCuves?.addEventListener('change', e => {
  state.nbCuves = e.target.value;
  applyStandardPosition();
  updateVisuals();
});

document.querySelectorAll('input[name="mur"]').forEach(radio => {
  radio.addEventListener('change', e => {
    state.mur = e.target.value;
    document.querySelectorAll('label[for^="mur-"]').forEach(c => c.classList.remove('selected'));
    e.target.closest('.model-card').classList.add('selected');
    updateVisuals();
  });
});

toggleTropplein?.addEventListener('change', e => {
  state.tropPlein = e.target.checked;
  updateVisuals();
});

document.querySelectorAll('input[name="credence"]').forEach(radio => {
  radio.addEventListener('change', e => {
    state.credence = e.target.value;
    document.querySelectorAll('label[for^="credence-"]').forEach(c => c.classList.remove('selected'));
    e.target.closest('.finish-card').classList.add('selected');
    updateVisuals();
  });
});

document.querySelectorAll('input[name="finition"]').forEach(radio => {
  radio.addEventListener('change', e => {
    state.finition = e.target.value;
    document.querySelectorAll('label[for^="fin-"]').forEach(c => c.classList.remove('selected'));
    e.target.closest('.finish-card').classList.add('selected');
  });
});

/* ══════════════════════════════════
   SLIDERS LOGIC
══════════════════════════════════ */
function calcFillPct(slider) {
  return ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
}

function calcMorphValue(slider) {
  return ((slider.value - slider.min) / (slider.max - slider.min)).toFixed(2);
}

function bindSlider(slider, valEl, fillEl, mtEl, stateKey, onInputCb = null) {
  if(!slider) return;
  slider.addEventListener('input', () => {
    state[stateKey] = parseInt(slider.value);
    if(onInputCb) onInputCb();
    if(valEl) valEl.textContent = state[stateKey];
    if(fillEl) fillEl.style.width = calcFillPct(slider) + '%';
    if(mtEl) mtEl.textContent = calcMorphValue(slider);
    updateVisuals();
  });
}

if (sliderLength) {
  sliderLength.addEventListener('input', () => {
    state.length = parseInt(sliderLength.value);
    applyStandardPosition();
    if (valLength) valLength.textContent = state.length;
    if (fillLength) fillLength.style.width = calcFillPct(sliderLength) + '%';
    if (mtLength) mtLength.textContent = calcMorphValue(sliderLength);
    updateVisuals();
  });
}
bindSlider(sliderHeight, valHeight, fillHeight, mtHeight, 'height');

function bindPlageSliders() {
  if (!sliderPlageG || !sliderPlageD) return;

  function recalculatePlageD() {
    const data = cuvesData[state.model];
    const nb = parseInt(state.nbCuves) || 1;
    const cLength = (data && data.cuveLength ? data.cuveLength : 390) / 10;
    const innerSpace = nb * cLength + (nb - 1) * state.plageEntreCuves;
    return state.length - state.position - innerSpace;
  }

  sliderPlageG.addEventListener('input', (e) => {
    state.position = parseFloat(e.target.value);
    updateVisuals();
  });

  sliderPlageD.addEventListener('input', (e) => {
    let valD = parseFloat(e.target.value);
    const data = cuvesData[state.model];
    const nb = parseInt(state.nbCuves) || 1;
    const cLength = (data && data.cuveLength ? data.cuveLength : 390) / 10;
    const innerSpace = nb * cLength + (nb - 1) * state.plageEntreCuves;
    
    state.position = state.length - valD - innerSpace;
    updateVisuals();
  });

  if (sliderPlageEntre) {
    sliderPlageEntre.addEventListener('input', (e) => {
      state.plageEntreCuves = parseFloat(e.target.value);
      updateVisuals();
    });
  }
}
bindPlageSliders();


/* ══════════════════════════════════
   UPDATE SUPPORT COLORS
══════════════════════════════════ */
function updateSupportColors() {
  if (!window.supportModel) return;
  
  // Couleurs de fond légèrement plus foncées que le plan vasque
  const darkerColor = state.finition === 'noir' ? 0x111115 : 
                      state.finition === 'beton' ? 0x757a82 : 0xd8d4cc;
                      
  window.supportModel.traverse(child => {
    if (!child.isMesh) return;
    
    // Equerres en métal gris
    if (child.name.includes('Console') || child.name.includes('Equerre') || child.name.includes('Bone_Long') || child.name.includes('Bras')) {
      if (child.userData.originalMaterial) {
        if (!child.userData.customMaterial) {
          if (Array.isArray(child.userData.originalMaterial)) {
            child.userData.customMaterial = child.userData.originalMaterial.map(m => (m && typeof m.clone === 'function') ? m.clone() : m);
          } else {
            child.userData.customMaterial = (typeof child.userData.originalMaterial.clone === 'function') ? child.userData.originalMaterial.clone() : child.userData.originalMaterial;
          }
        }
        child.material = child.userData.customMaterial;
        
        if (Array.isArray(child.material)) {
          child.material.forEach(m => {
            if (m && m.color && typeof m.color.setHex === 'function') m.color.setHex(0x999999);
            if (m) { m.metalness = 0.5; m.roughness = 0.4; }
          });
        } else {
          if (child.material && child.material.color && typeof child.material.color.setHex === 'function') child.material.color.setHex(0x999999); // Gris métallique plus clair
          if (child.material) { child.material.metalness = 0.5; child.material.roughness = 0.4; }
        }
      }
    } 
    // Fond TH
    else if (child.name === 'TH' || child.name === 'FaceThal' || child.name === 'Dos_Thal' || child.name.includes('Face_EOS') || child.name.includes('Bas_EOS')) {
      if (child.userData.originalMaterial) {
        if (!child.userData.customMaterial) {
          if (Array.isArray(child.userData.originalMaterial)) {
            child.userData.customMaterial = child.userData.originalMaterial.map(m => (m && typeof m.clone === 'function') ? m.clone() : m);
          } else {
            child.userData.customMaterial = (typeof child.userData.originalMaterial.clone === 'function') ? child.userData.originalMaterial.clone() : child.userData.originalMaterial;
          }
        }
        child.material = child.userData.customMaterial;
        
        if (Array.isArray(child.material)) {
          child.material.forEach(m => {
            if (m && m.color && typeof m.color.setHex === 'function') m.color.setHex(darkerColor);
            if (m) { m.metalness = 0.1; m.roughness = 0.8; }
          });
        } else {
          if (child.material && child.material.color && typeof child.material.color.setHex === 'function') child.material.color.setHex(darkerColor);
          if (child.material) { child.material.metalness = 0.1; child.material.roughness = 0.8; }
        }
      }
    }
  });
}

/* ══════════════════════════════════
   UPDATE VISUALS & REF
══════════════════════════════════ */
function updateVisuals() {
  state.doorLayout = null;
  if (!state.model) return;
  
  const data = cuvesData[state.model];
  if (!data) return;

  // 1. Preview mode (3D / image)
  applyLengthLimits(data);
  
  if (sliderPlageG && sliderPlageD) {
    const nb = parseInt(state.nbCuves) || 1;
    const cLength = (data.cuveLength || 390) / 10;
    const innerSpace = nb * cLength + (nb - 1) * state.plageEntreCuves;

    const minPos = 5; // 5cm minimum pour chaque plage
    const maxPos = Math.max(minPos, state.length - minPos - innerSpace);
    
    sliderPlageG.min = minPos;
    sliderPlageG.max = maxPos;
    
    if (state.position < minPos) state.position = minPos;
    if (state.position > maxPos) state.position = maxPos;
    
    const valD = Math.round((state.length - state.position - innerSpace) * 10) / 10;
    sliderPlageD.min = minPos;
    sliderPlageD.max = Math.max(minPos, state.length - minPos - innerSpace);
    
    sliderPlageG.value = state.position;
    sliderPlageD.value = valD;
    if (sliderPlageEntre) sliderPlageEntre.value = state.plageEntreCuves;
    
    if (valPlageG) valPlageG.textContent = state.position;
    if (valPlageD) valPlageD.textContent = valD;
    if (valPlageEntre) valPlageEntre.textContent = state.plageEntreCuves;
    
    if (fillPlageG) fillPlageG.style.width = calcFillPct(sliderPlageG) + '%';
    if (fillPlageD) fillPlageD.style.width = calcFillPct(sliderPlageD) + '%';
    if (fillPlageEntre && sliderPlageEntre) fillPlageEntre.style.width = calcFillPct(sliderPlageEntre) + '%';
  }

  const imgUrl = data.img;
  if (is3DModel()) {
    show3DPreview();
    updateSupportColors();
  } else {
    showImagePreview(imgUrl);
  }

  // 2. Référence
  // Le suffixe STP est maintenant directement dans le nom du modèle (ex: VO390-STP)
  const credSuffix = state.credence;
  
  // Règle LYNKA (si le modèle ne commence pas déjà par LYNKA)
  const isLynka = state.model.startsWith('LYNKA');
  const mainRef = isLynka ? `${state.model}${credSuffix}` : `LYNKA-${state.model}${credSuffix}`;
  
  const subRef = state.model;

  // 3. UI
  if (lynkaRef) lynkaRef.textContent = mainRef;
  if (lynkaSubref) lynkaSubref.textContent = `Code Base : ${subRef}`;
  if (viewerModelTag) viewerModelTag.innerHTML = `<span class="tag-dot"></span>${mainRef}`;
  
  const murLabels = { 'aucun': 'Sans mur', 'entre': 'Entre murs', 'gauche': 'Mur à gauche', 'droite': 'Mur à droite' };
  
  if (sumModel) sumModel.textContent = data.label;
  if (sumStp) sumStp.textContent = isSTPModel() ? 'Sans trop-plein (-STP)' : 'Avec trop-plein';
  if (sumMur) sumMur.textContent = murLabels[state.mur];
  if (sumCredence) sumCredence.textContent = state.credence ? `Type ${state.credence}` : 'Aucune';
  
  // 4. Nombre de cuves
  const canHaveMultiple = data.cuves && data.cuves.toLowerCase().includes('plusieurs');
  if (canHaveMultiple) {
    if (groupNbCuves) groupNbCuves.style.display = 'flex';
    if (sumItemCuves) sumItemCuves.style.display = 'flex';
    populateNbCuvesOptions(true);
  } else {
    if (groupNbCuves) groupNbCuves.style.display = 'none';
    if (sumItemCuves) sumItemCuves.style.display = 'none';
    state.nbCuves = '1';
    populateNbCuvesOptions(false);
  }
  
  if (sumNbCuves) {
    sumNbCuves.textContent = state.nbCuves === '1' ? '1 Cuve' : `${state.nbCuves} Cuves`;
  }

  if (sumItemCuves) sumItemCuves.style.display = data.cuves === '1' ? 'none' : 'flex';
  
  if (sliderItemPlageG) sliderItemPlageG.style.display = 'block';
  if (sliderItemPlageD) sliderItemPlageD.style.display = 'block';
  if (sliderItemPlageEntre) {
    sliderItemPlageEntre.style.display = parseInt(state.nbCuves) > 1 ? 'block' : 'none';
  }
  
  if (window.Blueprint && window.Blueprint.isOpen) {
    window.Blueprint.draw();
  }
}

function populateNbCuvesOptions(multiple) {
  if (!selectNbCuves) return;
  const currentVal = state.nbCuves;
  selectNbCuves.innerHTML = '';
  const max = multiple ? 8 : 1;
  for (let i = 1; i <= max; i++) {
    const opt = document.createElement('option');
    opt.value = i.toString();
    opt.textContent = i === 1 ? '1 Cuve' : `${i} Cuves`;
    selectNbCuves.appendChild(opt);
  }
  
  // Restaure la valeur ou force 1
  if (multiple && parseInt(currentVal) <= max) {
    selectNbCuves.value = currentVal;
  } else {
    selectNbCuves.value = '1';
    state.nbCuves = '1';
  }
}

// Fade in image when loaded
if (mainPreviewImg) {
  mainPreviewImg.addEventListener('load', () => {
    if(viewerLoading) viewerLoading.classList.remove('show');
    mainPreviewImg.style.opacity = 1;
  });
  mainPreviewImg.addEventListener('error', () => {
    if(viewerLoading) viewerLoading.classList.remove('show');
    mainPreviewImg.style.opacity = 1;
    console.error("Image non trouvée");
  });
}

/* ══════════════════════════════════
   INIT
══════════════════════════════════ */
function resetCamera() {
  if (!camera || !controls) return;
  camera.position.copy(initialCameraState.position);
  controls.target.copy(initialCameraState.target);
  controls.update();
}

function init() {
  init3DViewer();
  btnReset?.addEventListener('click', resetCamera);
  if (sliderLength) {
    sliderLength.dispatchEvent(new Event('input'));
    if (sliderPlageG) sliderPlageG.dispatchEvent(new Event('input'));
    sliderHeight.dispatchEvent(new Event('input'));
  }
  fetchCatalogue(); // Déclenche le téléchargement
  
  if (window.Blueprint) {
    window.Blueprint.init();
  }
}

init();
