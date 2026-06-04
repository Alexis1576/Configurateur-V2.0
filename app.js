/* ═══════════════════════════════════════════════════
   CONFIGURATEUR LYNKA — JavaScript (Dynamique)
   ═══════════════════════════════════════════════════ */

'use strict';

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
  height:      14,
  finition:    'blanc-mat',
  tropPlein:   true,  // true = Avec, false = Sans (-STP)
  credence:    '',    // '', 'C', 'P', 'M', 'T'
  mur:         'aucun',// 'aucun', 'entre', 'gauche', 'droite'
  nbCuves:     '1'    // '1', '2', ... '8'
};

/* ══════════════════════════════════
   DOM CACHE
══════════════════════════════════ */
const $ = id => document.getElementById(id);

// Sliders
const sliderItemPosition = $('slider-item-position');
const sliderLength = $('slider-length');
const sliderPosition = $('slider-position');
const sliderHeight = $('slider-height');
const valLength    = $('val-length');
const valPosition  = $('val-position');
const valHeight    = $('val-height');
const fillLength   = $('fill-length');
const fillPosition = $('fill-position');
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

// 3D Viewer
const threeCanvas     = $('three-canvas');
const viewerCanvas    = $('viewer-canvas');
let scene, camera, renderer, controls, fbxLoader, current3DObject = null;
let loadedModelCount = null;
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
  scene.add(dirLight);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.ShadowMaterial({ opacity: 0.15 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);

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

function is3DModel() {
  return state.model === 'VO390';
}

function extract3DParameters(object) {
  plateauBones.leftBone = object.getObjectByName('Bone_Long_G');
  plateauBones.rightBone = object.getObjectByName('Bone_Long_D');
  plateauBones.leftMesh = object.getObjectByName('Rive_G');
  plateauBones.rightMesh = object.getObjectByName('Rive_D');
  plateauBones.frontMesh = object.getObjectByName('Rive_Av');

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

    // Hauteur retombées : scale sur l'axe Y (descente des rives)
    // 14cm = taille de référence du FBX d'origine
    const yScale = state.height / 14;

    // Les os s'écartent symétriquement depuis le centre
    if (plateauBones.leftBone) plateauBones.leftBone.position.x = -halfLength;
    if (plateauBones.rightBone) plateauBones.rightBone.position.x = halfLength;

    // Les meshes des rives suivent leurs bones parents
    // Le scale s'applique sur l'axe Y monde (hauteur retombées de haut en bas)
    if (plateauBones.leftMesh) plateauBones.leftMesh.scale.set(1, 1, yScale);
    if (plateauBones.rightMesh) plateauBones.rightMesh.scale.set(1, 1, yScale);
    
    if (plateauBones.frontMesh) {
      const frontScaleX = lengthMm / baseFrontLength;
      plateauBones.frontMesh.scale.set(frontScaleX, 1, yScale);
    }
  }
}

function load3DModelForSelection() {
  if (!is3DModel() || !fbxLoader) return;

  const targetCount = state.nbCuves || '1';
  if (loadedModelCount === targetCount && current3DObject) {
    update3DScale();
    return;
  }

  const modelPath = `3D - Morth Targets/VO390/VO390_${targetCount}.fbx`;

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

  loadedModelCount = targetCount;
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
    update3DScale();
    if (viewerLoading) viewerLoading.classList.remove('show');
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
      // Ignorer la ligne d'en-tête (index 0)
      if (index === 0) return;
      if (!row.c || !row.c[0] || !row.c[0].v) return;
      const modelName = row.c[0].v;
      const imgUrl = row.c[1] ? row.c[1].v : '';
      const utilisateurs = row.c[2] ? row.c[2].v : '1';
      const longueurLimitsRaw = row.c[3] ? String(row.c[3].v) : '';
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
  const min = data.lengthLimits?.min || 40;
  const max = data.lengthLimits?.max || 160;

  sliderLength.min = min;
  sliderLength.max = max;

  if (state.length < min) state.length = min;
  if (state.length > max) state.length = max;
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

/* ══════════════════════════════════
   EVENT LISTENERS
══════════════════════════════════ */
selectModel?.addEventListener('change', e => {
  state.model = e.target.value;
  updateVisuals();
});

selectNbCuves?.addEventListener('change', e => {
  state.nbCuves = e.target.value;
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

function bindSlider(slider, valEl, fillEl, mtEl, stateKey) {
  if(!slider) return;
  slider.addEventListener('input', () => {
    state[stateKey] = parseInt(slider.value);
    if(valEl) valEl.textContent = state[stateKey];
    if(fillEl) fillEl.style.width = calcFillPct(slider) + '%';
    if(mtEl) mtEl.textContent = calcMorphValue(slider);
    updateVisuals();
  });
}

bindSlider(sliderLength, valLength, fillLength, mtLength, 'length');
bindSlider(sliderPosition, valPosition, fillPosition, null, 'position');
bindSlider(sliderHeight, valHeight, fillHeight, mtHeight, 'height');


/* ══════════════════════════════════
   UPDATE VISUALS & REF
══════════════════════════════════ */
function updateVisuals() {
  if (!state.model) return;
  
  const data = cuvesData[state.model];
  if (!data) return;

  // 1. Preview mode (3D / image)
  applyLengthLimits(data);
  
  if (sliderPosition) {
    const minPos = 20; // 20cm du bord gauche par défaut
    const maxPos = Math.max(minPos, state.length - 20); // 20cm du bord droit
    sliderPosition.min = minPos;
    sliderPosition.max = maxPos;
    if (state.position < minPos) state.position = minPos;
    if (state.position > maxPos) state.position = maxPos;
    sliderPosition.value = state.position;
    if (valPosition) valPosition.textContent = state.position;
    if (fillPosition) fillPosition.style.width = calcFillPct(sliderPosition) + '%';
  }

  const imgUrl = data.img;
  if (is3DModel()) {
    show3DPreview();
  } else {
    showImagePreview(imgUrl);
  }

  // 2. Référence
  const stpSuffix = state.tropPlein ? '' : '-STP';
  const credSuffix = state.credence;
  
  // Règle LYNKA (si le modèle ne commence pas déjà par LYNKA)
  const isLynka = state.model.startsWith('LYNKA');
  const mainRef = isLynka ? `${state.model}${credSuffix}` : `LYNKA-${state.model}${credSuffix}`;
  
  // Pour le subref, on enlève "LYNKA-" s'il y est, et on ajoute -STP (pour affichage debug)
  const baseName = state.model.replace('LYNKA-', '');
  const subRef = `${baseName}${stpSuffix}`;

  // 3. UI
  if (lynkaRef) lynkaRef.textContent = mainRef;
  if (lynkaSubref) lynkaSubref.textContent = `Code Base : ${subRef}`;
  if (viewerModelTag) viewerModelTag.innerHTML = `<span class="tag-dot"></span>${mainRef}`;
  
  const murLabels = { 'aucun': 'Sans mur', 'entre': 'Entre murs', 'gauche': 'Mur à gauche', 'droite': 'Mur à droite' };
  
  if (sumModel) sumModel.textContent = data.label;
  if (sumStp) sumStp.textContent = state.tropPlein ? 'Avec' : 'Sans (-STP)';
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

  if (sliderItemPosition) {
    sliderItemPosition.style.display = state.nbCuves === '1' ? 'block' : 'none';
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
    if (sliderPosition) sliderPosition.dispatchEvent(new Event('input'));
    sliderHeight.dispatchEvent(new Event('input'));
  }
  fetchCatalogue(); // Déclenche le téléchargement
}

init();
