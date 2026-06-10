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
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'https://esm.sh/three@0.160.0/examples/jsm/loaders/FBXLoader.js';

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
  length:      80,
  position:    40,
  plageEntreCuves: 10,
  height:      14,
  finition:    'blanc-mat',
  tropPlein:   true,  // true = Avec, false = Sans (-STP)
  credence:    '',    // '', 'C', 'P', 'M', 'T'
  mur:         'aucun',// 'aucun', 'entre', 'gauche', 'droite'
  nbCuves:     '1',    // '1', '2', ... '8'
  support:     ''      // '', 'TH', 'THAL', 'THALLIS', 'THALLISOL'
};

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
let baseSupportModel = null;
let supportInstance = null;
let cuveInstances = [];

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

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x080820, 0.85);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
  dirLight.position.set(2, 5, 4);
  dirLight.castShadow = true;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 20;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);

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

  // Le parent reste toujours centré sur l'origine (repère XYZ fixe)
  current3DObject.scale.set(baseScale, baseScale * objectYScale, baseScale);
  current3DObject.position.set(0, 0, 0);

  if (is3DModel()) {
    const lengthMm = state.length * 10;
    const halfLength = lengthMm / 2;

    const data = cuvesData[state.model] || {};
    const cLengthMm = data.cuveLength || 390;
    const gapMm = state.plageEntreCuves * 10;
    const nb = parseInt(state.nbCuves) || 1;

    // Le plan est centré autour de 0, les cuves se déplacent en absolu
    const plageGaucheMm = state.position * 10;

    // Déplacement des os des cuves (positions absolues par rapport au centre du modèle)
    if (plateauBones.cuveBones && plateauBones.cuveBones.length > 0) {
      for (let i = 0; i < plateauBones.cuveBones.length; i++) {
        if (i < nb) {
          // Centre de la cuve i (en mm, dans l'espace world centré à 0)
          const cuveX = -halfLength + plageGaucheMm + i * (cLengthMm + gapMm) + cLengthMm / 2;
          plateauBones.cuveBones[i].position.x = cuveX;
        }
      }
    }

    // Déplacement des os (extrémités du plan, toujours centrées)
    if (plateauBones.leftBone) plateauBones.leftBone.position.x = -halfLength;
    if (plateauBones.rightBone) plateauBones.rightBone.position.x = halfLength;

    // Déplacement des meshes latéraux (Rive_G et Rive_D)
    if (plateauBones.leftMesh) {
      plateauBones.leftMesh.scale.set(1, 1, yScale);
    }
    if (plateauBones.rightMesh) {
      plateauBones.rightMesh.scale.set(1, 1, yScale);
    }
    
    // Déplacement et mise à l'échelle de la jupe avant (Rive_Av)
    if (plateauBones.frontMesh) {
      const frontScaleX = lengthMm / baseFrontLength;
      plateauBones.frontMesh.scale.set(frontScaleX, 1, yScale);
      plateauBones.frontMesh.position.x = 0; // Toujours centré
    }

    // Gestion des instances de cuve 3D (meshes indépendants)
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

    // ── Support 3D ──
    if (supportInstance && current3DObject) {
      current3DObject.remove(supportInstance);
      supportInstance = null;
    }
    if (baseSupportModel && current3DObject && state.support) {
      supportInstance = baseSupportModel.clone();
      
      // Calculer la bounding box du support pour le rescaler correctement
      const supportBbox = new THREE.Box3().setFromObject(supportInstance);
      const supportSize = supportBbox.getSize(new THREE.Vector3());
      console.log('Support original size (mm):', {x: supportSize.x, y: supportSize.y, z: supportSize.z});
      
      // Prendre la plus grande dimension comme "hauteur"
      const maxDimension = Math.max(supportSize.x, supportSize.y, supportSize.z);
      const targetHeightMm = 800;  // 80cm en mm
      const scaleNeeded = targetHeightMm / maxDimension;
      
      console.log('Support max dimension:', maxDimension, 'mm');
      console.log('Support scale needed:', scaleNeeded);
      
      // Appliquer le rescale uniformément
      supportInstance.scale.set(scaleNeeded, scaleNeeded, scaleNeeded);
      
      // Rotation: FaceThal à l'avant, Dos_Thal à l'arrière
      // Tourner de 90 degrés (Math.PI/2) autour de l'axe Y pour orienter correctement
      supportInstance.rotation.y = Math.PI / 2;
      
      // Calculer la bounding box de la cuve pour placer le support correctement en dessous
      const cuveBbox = new THREE.Box3().setFromObject(current3DObject);
      const cuveSize = cuveBbox.getSize(new THREE.Vector3());
      const cuveCenter = cuveBbox.getCenter(new THREE.Vector3());
      
      console.log('Cuve bbox:', {center: cuveCenter, size: cuveSize});
      
      // Placer le support en dessous du plateau
      // La base du plateau est à cuveBbox.min.y, on place le support à y = base - hauteurSupport/2
      const supportHeightAfterScale = (supportSize.y * scaleNeeded);  // Hauteur du support après rescale
      const supportYPosition = cuveBbox.min.y - (supportHeightAfterScale / 2);
      
      supportInstance.position.set(cuveCenter.x, supportYPosition, cuveCenter.z);
      current3DObject.add(supportInstance);
      
      console.log('✓ Support instance added to scene');
      console.log('  Position:', supportInstance.position);
      console.log('  Scale:', scaleNeeded);
      console.log('  Rotation.y:', supportInstance.rotation.y);
    }


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
      if (child.isMesh) {
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
  if (!state.support || !fbxLoader) {
    baseSupportModel = null;
    if (callback) callback();
    return;
  }

  const base = getBaseModelName();
  const supportFileName = `${base}_Thal.fbx`;
  const supportPath = `3D - Morth Targets/${base}/${supportFileName}`;
  console.log('Loading support model:', state.support, supportPath);

  if (baseSupportModel && baseSupportModel._loadedPath === supportPath) {
    if (callback) callback();
    return;
  }

  baseSupportModel = null;
  fbxLoader.load(encodeURI(supportPath), object => {
    console.log('Support FBX loaded');
    object.traverse(child => {
      if (child.isMesh) {
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
    });
    object._loadedPath = supportPath;
    baseSupportModel = object;
    if (callback) callback();
  }, undefined, err => {
    console.warn(`Support FBX introuvable: ${supportPath}`, err);
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
      if (child.isMesh) {
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
    });

    object.position.set(0, 0, 0);
    object.rotation.y = Math.PI;
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

selectNbCuves?.addEventListener('change', e => {
  state.nbCuves = e.target.value;
  applyStandardPosition();
  updateVisuals();
});

selectSupport?.addEventListener('change', e => {
  state.support = e.target.value;
  if (is3DModel() && current3DObject) {
    loadSupportModel(() => {
      update3DScale();
    });
  }
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
   UPDATE VISUALS & REF
══════════════════════════════════ */
function updateVisuals() {
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
}

init();
