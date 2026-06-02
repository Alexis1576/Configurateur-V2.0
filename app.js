/* ═══════════════════════════════════════════════════
   CONFIGURATEUR LYNKA — JavaScript (Dynamique)
   ═══════════════════════════════════════════════════ */

'use strict';

const G_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1atF6VK20aO1ONcRJFAuEK5VrqeTzwhl2VKbotdRhBBM/gviz/tq?tqx=out:json&gid=943156125';

/* ══════════════════════════════════
   CATALOGUE LYNKA (Rempli dynamiquement)
══════════════════════════════════ */
let cuvesData = {};

// 3D Viewer (sera initialisé après le chargement du DOM)
let viewer3D = null;
const HAS_3D_SUPPORT = true; // VO390 a support 3D

/* ══════════════════════════════════
   STATE
══════════════════════════════════ */
const state = {
  step:        1,
  model:       '',
  length:      80,
  depth:       45,
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
const sliderLength = $('slider-length');
const sliderDepth  = $('slider-depth');
const sliderHeight = $('slider-height');
const valLength    = $('val-length');
const valDepth     = $('val-depth');
const valHeight    = $('val-height');
const fillLength   = $('fill-length');
const fillDepth    = $('fill-depth');
const fillHeight   = $('fill-height');
const mtLength     = $('mt-length');
const mtDepth      = $('mt-depth');
const mtHeight     = $('mt-height');

// Viewer
const mainPreviewImg = $('main-preview-img');
const viewerModelTag = $('viewer-model-tag');
const viewerLoading  = $('viewer-loading');

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

/* ══════════════════════════════════
   FETCH GOOGLE SHEETS
══════════════════════════════════ */
async function fetchCatalogue() {
  try {
    let json;
    try {
      const res = await fetch(G_SHEET_URL, { mode: 'cors' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const text = await res.text();
      json = parseGoogleSheetJson(text);
    } catch (fetchErr) {
      console.warn('[App] Fetch Google Sheets échoué, utilisation du fallback script:', fetchErr.message);
      json = await loadGoogleSheetScript(G_SHEET_URL);
    }

    const rows = json.table.rows || [];
    cuvesData = {};

    const dataRows = rows.slice(1); // Ignorer la première ligne d'entête
    dataRows.forEach(row => {
      if (!row.c || !row.c[0] || !row.c[0].v) return;
      const modelName = row.c[0].v;
      const imgUrl = row.c[1] ? row.c[1].v : '';
      const utilisateurs = row.c[2] ? row.c[2].v : '1';
      
      cuvesData[modelName] = {
        label: modelName,
        img: imgUrl,
        cuves: utilisateurs
      };
    });

    populateModelSelect();
    if (viewerLoading) {
      viewerLoading.classList.remove('show');
      viewerLoading.innerHTML = '';
    }

    // Auto-sélection du premier modèle si disponible
    const firstModel = Object.keys(cuvesData)[0];
    if (firstModel) {
      state.model = firstModel;
      selectModel.value = firstModel;
      updateVisuals();
    }

  } catch (err) {
    console.error('Erreur de chargement du catalogue:', err);
    if (viewerModelTag) viewerModelTag.innerHTML = 'Erreur réseau';
    if (viewerLoading) viewerLoading.innerHTML = `<p style='color:red;'>Impossible de charger Google Sheets.<br>${err.message}</p>`;
  }
}

function parseGoogleSheetJson(text) {
  if (typeof text === 'object' && text !== null && text.table) {
    return text;
  }
  if (!text.includes('google.visualization.Query.setResponse')) {
    throw new Error('Réponse inattendue de Google Sheets. Vérifiez que la feuille est publique et que l’URL est correcte.');
  }
  const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
  return JSON.parse(jsonStr);
}

function loadGoogleSheetScript(url) {
  return new Promise((resolve, reject) => {
    if (!window.google) window.google = {};
    if (!window.google.visualization) window.google.visualization = {};
    window.google.visualization.Query = window.google.visualization.Query || {};

    let finished = false;
    const cleanup = () => {
      if (script.parentNode) script.parentNode.removeChild(script);
      window.google.visualization.Query.setResponse = originalSetResponse;
      clearTimeout(timeout);
    };

    const originalSetResponse = window.google.visualization.Query.setResponse;
    window.google.visualization.Query.setResponse = response => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve(response);
    };

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onerror = () => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error('Impossible de charger le script Google Sheets. Vérifiez la disponibilité et les autorisations.'));
    };
    document.head.appendChild(script);

    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error('Le chargement de Google Sheets a expiré.')); 
    }, 10000);
  });
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
    
    // Mettre à jour les morphs targets en temps réel
    updateMorphTargets();
  });
}

bindSlider(sliderLength, valLength, fillLength, mtLength, 'length');
bindSlider(sliderDepth, valDepth, fillDepth, mtDepth, 'depth');
bindSlider(sliderHeight, valHeight, fillHeight, mtHeight, 'height');


/* ══════════════════════════════════
   MISE À JOUR DES MORPHS TARGETS
══════════════════════════════════ */
function updateMorphTargets() {
  if (!viewer3D || !viewer3D.model) return;

  // Calculer les valeurs normalisées (0-1) des sliders
  const lengthNorm = (state.length - 40) / (160 - 40); // 40-160 → 0-1
  const depthNorm = (state.depth - 30) / (65 - 30);     // 30-65 → 0-1
  const heightNorm = (state.height - 8) / (22 - 8);     // 8-22 → 0-1

  // Mettre à jour les morphs targets 3D
  viewer3D.updateMorphTargets(lengthNorm, depthNorm, heightNorm);
}

/* ══════════════════════════════════
   UPDATE VISUALS & REF
══════════════════════════════════ */
async function updateVisuals() {
  if (!state.model) return;
  
  const data = cuvesData[state.model];
  if (!data) return;

  // 1. Image / 3D Viewer
  const hasVO390 = state.model === 'VO390';
  
  if (hasVO390 && viewer3D) {
    // Charger le modèle 3D approprié
    const nbCuves = parseInt(state.nbCuves);
    if (nbCuves >= 1 && nbCuves <= 4) {
      if (viewerLoading) {
        viewerLoading.classList.add('show');
        viewerLoading.innerHTML = '<p>Chargement 3D...</p>';
      }
      try {
        await viewer3D.loadModel(nbCuves);
        if (viewerLoading) {
          viewerLoading.classList.remove('show');
          viewerLoading.innerHTML = '';
        }
        const badge = document.getElementById('badge-3d-ready');
        if(badge) badge.style.display = 'block';
        const btn3dReset = document.getElementById('btn-3d-reset');
        if(btn3dReset) btn3dReset.style.display = 'inline-block';
        const btn3dScreenshot = document.getElementById('btn-3d-screenshot');
        if(btn3dScreenshot) btn3dScreenshot.style.display = 'inline-block';
      } catch (err) {
        console.error('[App] Erreur lors du chargement 3D:', err);
        if (viewerLoading) {
          viewerLoading.classList.add('show');
          viewerLoading.innerHTML = `<p style="color:red;">Erreur 3D: ${err.message}</p>`;
        }
        const badge = document.getElementById('badge-3d-ready');
        if (badge) badge.style.display = 'none';
        const btn3dReset = document.getElementById('btn-3d-reset');
        if (btn3dReset) btn3dReset.style.display = 'none';
        const btn3dScreenshot = document.getElementById('btn-3d-screenshot');
        if (btn3dScreenshot) btn3dScreenshot.style.display = 'none';
      }
    }
  } else {
    // Pour les autres modèles, utiliser l'image Odoo
    const imgUrl = data.img;
    if (mainPreviewImg) {
      if(mainPreviewImg.src !== imgUrl) {
        if(viewerLoading) viewerLoading.classList.add('show');
        mainPreviewImg.style.opacity = 0;
        mainPreviewImg.src = imgUrl;
      } else {
        if(viewerLoading) viewerLoading.classList.remove('show');
      }
      const badge = document.getElementById('badge-3d-ready');
      if(badge) badge.style.display = 'none';
      const btn3dReset = document.getElementById('btn-3d-reset');
      if(btn3dReset) btn3dReset.style.display = 'none';
      const btn3dScreenshot = document.getElementById('btn-3d-screenshot');
      if(btn3dScreenshot) btn3dScreenshot.style.display = 'none';
    }
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
   3D VIEWER INITIALIZATION & CONTROLS
══════════════════════════════════ */
async function initializeViewer3D() {
  try {
    const module = await import('./3d-viewer.js');
    const VO390ViewerClass = module.VO390Viewer || window.VO390Viewer;
    if (!VO390ViewerClass) {
      console.warn('[App] VO390Viewer introuvable après import dynamique');
      return;
    }

    viewer3D = new VO390ViewerClass('viewer-canvas');
    console.log('[App] 3D Viewer initialisé avec succès');

    if (state.model === 'VO390') {
      updateVisuals();
    }

    // Ajouter les contrôles des boutons 3D
    const btn3dReset = document.getElementById('btn-3d-reset');
    if (btn3dReset) {
      btn3dReset.addEventListener('click', () => {
        viewer3D.resetView();
      });
    }

    const btn3dScreenshot = document.getElementById('btn-3d-screenshot');
    if (btn3dScreenshot) {
      btn3dScreenshot.addEventListener('click', () => {
        const dataUrl = viewer3D.screenshot();
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `VO390-${state.nbCuves}-cuves-${new Date().getTime()}.png`;
        link.click();
      });
    }
  } catch (err) {
    console.error('[App] Erreur lors de l\'initialisation du viewer 3D:', err);
  }
}

/* ══════════════════════════════════
   INIT
══════════════════════════════════ */
function init() {
  if (sliderLength) {
    sliderLength.dispatchEvent(new Event('input'));
    sliderDepth.dispatchEvent(new Event('input'));
    sliderHeight.dispatchEvent(new Event('input'));
  }
  
  // Initialiser le viewer 3D
  initializeViewer3D();
  
  fetchCatalogue(); // Déclenche le téléchargement
}

init();
