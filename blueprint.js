/* ═══════════════════════════════════════════════════
   BLUEPRINT SYSTEM — JavaScript Vector Drawings
   ═══════════════════════════════════════════════════ */

'use strict';


const Blueprint = {
  isOpen: false,
  scale: 25, // Default scale 1:25
  capturedImages: null, // Cache for 3D captures
  cartouche: {
    project: 'PlanVasques4300',
    client: '134173 - Eurexpo Hall 4.3 - Lyon (69)',
    location: 'Lieu dit vaujalat',
    author: 'Pv',
    email: 'hugo@istone.fr',
    scale: '1:25',
    index: '1',
    date: '',
    dateUpdate: '',
    page: '1/1',
    delai: '3 semaines après validation de ces plans par vos soins.',
    quantite: '1',
    version: 'A',
    commentaire: '',
    pmr: false
  },

  init() {
    // Set default dates to today
    const today = new Date().toLocaleDateString('fr-FR');
    this.cartouche.date = today;
    this.cartouche.dateUpdate = today;

    // Bind inputs to state
    this.bindInput('bp-project', 'project');
    this.bindInput('bp-client', 'client');
    this.bindInput('bp-location', 'location');
    this.bindInput('bp-author', 'author');
    this.bindInput('bp-email', 'email');
    this.bindInput('bp-scale', 'scale');
    this.bindInput('bp-index', 'index');
    this.bindInput('bp-date', 'date');
    this.bindInput('bp-date-update', 'dateUpdate');
    this.bindInput('bp-page', 'page');
    this.bindInput('bp-delai', 'delai');
    this.bindInput('bp-quantite', 'quantite');
    this.bindInput('bp-version', 'version');
    this.bindInput('bp-commentaire', 'commentaire');
    this.bindInput('bp-pmr', 'pmr');

    // Event listeners
    document.getElementById('btn-blueprint')?.addEventListener('click', () => this.open());
    document.getElementById('btn-bp-close')?.addEventListener('click', () => this.close());
    document.getElementById('btn-bp-print')?.addEventListener('click', () => this.print());
  },

  bindInput(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') {
      el.checked = this.cartouche[key];
      el.addEventListener('change', (e) => {
        this.cartouche[key] = e.target.checked;
        this.draw();
      });
    } else {
      el.value = this.cartouche[key];
      el.addEventListener('input', (e) => {
        this.cartouche[key] = e.target.value;
        this.draw();
      });
    }
  },

  open() {
    this.isOpen = true;
    document.getElementById('blueprint-workspace').style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const loading = document.getElementById('bp-loading');
    if (loading) {
      loading.classList.add('show');
    }

    // Capture isometric and multiview screenshots from Three.js scene
    setTimeout(() => {
      if (window.captureMiseEnPlanViews) {
        window.captureMiseEnPlanViews((data) => {
          if (data && data.images) {
            this.capturedImages = data.images;
            this.dims = data.dims;
          } else {
            this.capturedImages = data; // Fallback
          }
          if (loading) {
            loading.classList.remove('show');
          }
          this.draw();
        });
      } else {
        if (loading) {
          loading.classList.remove('show');
        }
        this.draw();
      }
    }, 50);
  },

  close() {
    this.isOpen = false;
    document.getElementById('blueprint-workspace').style.display = 'none';
    document.body.style.overflow = '';
  },

  print() {
    window.print();
  },

  // Helper to draw a dimension line (cotes)
  drawDimensionH(svg, x1, x2, y, valMm, labelOffset = -3, tickLen = 4) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'cote-dim');
    g.setAttribute('stroke', '#0000ff');
    g.setAttribute('stroke-width', '0.25');
    g.setAttribute('fill', 'none');

    // Line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y);
    g.appendChild(line);

    // Left tick
    const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    t1.setAttribute('x1', x1 - tickLen/2);
    t1.setAttribute('y1', y + tickLen/2);
    t1.setAttribute('x2', x1 + tickLen/2);
    t1.setAttribute('y2', y - tickLen/2);
    g.appendChild(t1);

    // Right tick
    const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    t2.setAttribute('x1', x2 - tickLen/2);
    t2.setAttribute('y1', y + tickLen/2);
    t2.setAttribute('x2', x2 + tickLen/2);
    t2.setAttribute('y2', y - tickLen/2);
    g.appendChild(t2);

    // Text label
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', (x1 + x2) / 2);
    txt.setAttribute('y', y + labelOffset);
    txt.setAttribute('fill', '#0000ff');
    txt.setAttribute('stroke', 'none');
    txt.setAttribute('font-size', '4.5');
    txt.setAttribute('font-family', "'Outfit', sans-serif");
    txt.setAttribute('font-weight', '500');
    txt.setAttribute('text-anchor', 'middle');
    txt.textContent = Math.round(valMm);
    g.appendChild(txt);

    svg.appendChild(g);
  },

  drawDimensionV(svg, x, y1, y2, valMm, labelOffset = 3, tickLen = 4) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'cote-dim');
    g.setAttribute('stroke', '#0000ff');
    g.setAttribute('stroke-width', '0.25');
    g.setAttribute('fill', 'none');

    // Line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x);
    line.setAttribute('y2', y2);
    g.appendChild(line);

    // Top tick
    const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    t1.setAttribute('x1', x - tickLen/2);
    t1.setAttribute('y1', y1 + tickLen/2);
    t1.setAttribute('x2', x + tickLen/2);
    t1.setAttribute('y2', y1 - tickLen/2);
    g.appendChild(t1);

    // Bottom tick
    const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    t2.setAttribute('x1', x - tickLen/2);
    t2.setAttribute('y1', y2 + tickLen/2);
    t2.setAttribute('x2', x + tickLen/2);
    t2.setAttribute('y2', y2 - tickLen/2);
    g.appendChild(t2);

    // Text label
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', x + labelOffset);
    txt.setAttribute('y', (y1 + y2) / 2 + 1.5);
    txt.setAttribute('fill', '#0000ff');
    txt.setAttribute('stroke', 'none');
    txt.setAttribute('font-size', '4.5');
    txt.setAttribute('font-family', "'Outfit', sans-serif");
    txt.setAttribute('font-weight', '500');
    txt.setAttribute('text-anchor', labelOffset > 0 ? 'start' : 'end');
    txt.textContent = Math.round(valMm);
    g.appendChild(txt);

    svg.appendChild(g);
  },

  // Main drawing controller
  draw() {
    const state = window.state;
    const container = document.getElementById('blueprint-sheet');
    if (!container) return;

    // Clear existing SVG
    container.innerHTML = '';

    // Create SVG element A3 (420 x 297 mm)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 420 297');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('style', 'background:#fff;');

    // Definition of patterns
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.appendChild(defs);

    // 1. Draw outer frame borders
    const borderOuter = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    borderOuter.setAttribute('x', '0');
    borderOuter.setAttribute('y', '0');
    borderOuter.setAttribute('width', '420');
    borderOuter.setAttribute('height', '297');
    borderOuter.setAttribute('fill', 'none');
    borderOuter.setAttribute('stroke', '#e2e8f0');
    borderOuter.setAttribute('stroke-width', '1');
    svg.appendChild(borderOuter);

    const borderInner = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    borderInner.setAttribute('x', '10');
    borderInner.setAttribute('y', '10');
    borderInner.setAttribute('width', '400');
    borderInner.setAttribute('height', '277');
    borderInner.setAttribute('fill', 'none');
    borderInner.setAttribute('stroke', '#080b12');
    borderInner.setAttribute('stroke-width', '0.5');
    svg.appendChild(borderInner);

    const gText = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gText.setAttribute('font-size', '3.5');
    gText.setAttribute('font-family', "'Outfit', sans-serif");
    gText.setAttribute('text-anchor', 'middle');
    gText.setAttribute('fill', '#080b12');

    // Helper to draw lines
    const addLine = (lx1, ly1, lx2, ly2, thickness = 0.5) => {
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', lx1.toString());
      l.setAttribute('y1', ly1.toString());
      l.setAttribute('x2', lx2.toString());
      l.setAttribute('y2', ly2.toString());
      l.setAttribute('stroke', '#080b12');
      l.setAttribute('stroke-width', thickness.toString());
      svg.appendChild(l);
    };

    // Top and Bottom (A-H)
    const letters = ['H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];
    for (let i = 0; i < 8; i++) {
      const xLeft = 10 + i * 50;
      const xCenter = xLeft + 25;
      
      if (i > 0) {
        addLine(xLeft, 0, xLeft, 10, 0.25);
        addLine(xLeft, 287, xLeft, 297, 0.25);
      }
      
      const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t1.setAttribute('x', xCenter.toString());
      t1.setAttribute('y', '6.5');
      t1.textContent = letters[i];
      gText.appendChild(t1);

      const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t2.setAttribute('x', xCenter.toString());
      t2.setAttribute('y', '293.5');
      t2.textContent = letters[i];
      gText.appendChild(t2);
    }

    // Left and Right (1-4)
    const nums = ['4', '3', '2', '1'];
    const yStep = 277 / 4;
    for (let i = 0; i < 4; i++) {
      const yTop = 10 + i * yStep;
      const yCenter = yTop + yStep / 2;
      
      if (i > 0) {
        addLine(0, yTop, 10, yTop, 0.25);
        addLine(410, yTop, 420, yTop, 0.25);
      }
      
      const n1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      n1.setAttribute('x', '5');
      n1.setAttribute('y', (yCenter + 1.2).toString());
      n1.textContent = nums[i];
      gText.appendChild(n1);

      const n2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      n2.setAttribute('x', '415');
      n2.setAttribute('y', (yCenter + 1.2).toString());
      n2.textContent = nums[i];
      gText.appendChild(n2);
    }
    
    const addTriangle = (x1, y1, x2, y2, x3, y3) => {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      p.setAttribute('points', `${x1},${y1} ${x2},${y2} ${x3},${y3}`);
      p.setAttribute('fill', '#080b12');
      svg.appendChild(p);
    };
    addTriangle(205, 0, 215, 0, 210, 10);
    addTriangle(205, 297, 215, 297, 210, 287);
    addTriangle(0, 143.5, 0, 153.5, 10, 148.5);
    addTriangle(420, 143.5, 420, 153.5, 410, 148.5);

    svg.appendChild(gText);

    // Title sections
    const addSectionTitle = (textVal, tx, ty) => {
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', tx.toString());
      txt.setAttribute('y', ty.toString());
      txt.setAttribute('font-size', '6');
      txt.setAttribute('font-family', "'Outfit', sans-serif");
      txt.setAttribute('font-weight', '700');
      txt.setAttribute('fill', '#080b12');
      txt.setAttribute('text-decoration', 'underline');
      txt.textContent = textVal;
      svg.appendChild(txt);
    };

    addSectionTitle('PLAN TECHNIQUE', 20, 22);
    addSectionTitle('VUE 3D', 260, 22);

    // Dynamic scale computation
    const lengthMm = state.length * 10;
    if (lengthMm <= 1200) this.scale = 12; // Much larger
    else if (lengthMm <= 2000) this.scale = 18;
    else if (lengthMm <= 2800) this.scale = 22;
    else this.scale = 26;

    this.cartouche.scale = `1:${this.scale}`;
    const scale = this.scale;

    // Check if 3D captures are ready
    if (!this.capturedImages) {
      const loadingTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      loadingTxt.setAttribute('x', '210');
      loadingTxt.setAttribute('y', '150');
      loadingTxt.setAttribute('font-size', '8');
      loadingTxt.setAttribute('font-family', "'Outfit', sans-serif");
      loadingTxt.setAttribute('font-weight', '500');
      loadingTxt.setAttribute('fill', '#64748b');
      loadingTxt.setAttribute('text-anchor', 'middle');
      loadingTxt.textContent = "Génération des vues 3D en cours...";
      svg.appendChild(loadingTxt);
      
      container.appendChild(svg);
      return;
    }

    // Draw all views using captured images and overlay vector cotes
    // Vue de Face on top
    this.drawVueFace(svg, 110, 70, scale);
    
    // Vue de Côté next to Vue de Face
    this.drawVueCote(svg, 225, 70, scale);

    // Vue de Dessus below Vue de Face
    this.drawVueDessus(svg, 110, 160, scale);
    
    // Vue de Dessous below Vue de Dessus
    this.drawVueDessous(svg, 110, 240, scale);

    // Iso (Larger and positioned safely)
    this.drawVue3DIso(svg, 305, 185, scale);

    // Zoomed Side View
    if (this.capturedImages.cote_zoom) {
      this.drawVueCoteZoom(svg, 345, 65, scale);
    }

    // Draw cartouche exactly like the CAD drawing
    this.drawCartouche(svg);

    container.appendChild(svg);
  },

  drawLabel(svg, cx, y, textVal) {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', cx.toString());
    t.setAttribute('y', y.toString());
    t.setAttribute('font-size', '4.5');
    t.setAttribute('font-family', "'Outfit', sans-serif");
    t.setAttribute('font-weight', '700');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('fill', '#000');
    t.textContent = textVal;
    svg.appendChild(t);
  },

  drawVueFace(svg, cx, cy, scale) {
    const dims = this.dims;
    const w = dims.x / scale;
    const h = dims.y / scale;
    const x = cx - w/2;
    const y = cy - h/2;

    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttribute('href', this.capturedImages.face);
    img.setAttribute('x', x.toString());
    img.setAttribute('y', y.toString());
    img.setAttribute('width', w.toString());
    img.setAttribute('height', h.toString());
    svg.appendChild(img);

    // Padding is 0.1 units = 10mm
    const padS = 10 / scale;

    // Bounding cotes (Horizontal) placed at the BOTTOM
    const actualLength = window.state.length * 10;
    this.drawDimensionH(svg, cx - actualLength/scale/2, cx + actualLength/scale/2, y + h - padS + 8, actualLength);
    
    // Total height cote on the right
    this.drawDimensionV(svg, x + w + 4, y + h - padS, y + padS, dims.boxY, 3);

    // Detailed height cotes on the left
    const yg = y + h - padS; // Ground level
    const plintheS = 100 / scale;
    const vasqueS = 100 / scale;
    
    if (dims.boxY > 900) { // Has credence
      const cabS = 640 / scale;
      const credS = (dims.boxY - 840) / scale;
      this.drawDimensionV(svg, x - 4, yg - plintheS, yg, 100, -3); // Plinthe
      this.drawDimensionV(svg, x - 4, yg - plintheS - cabS, yg - plintheS, 640, -3); // Cabinet
      this.drawDimensionV(svg, x - 4, yg - plintheS - cabS - vasqueS, yg - plintheS - cabS, 100, -3); // Vasque
      this.drawDimensionV(svg, x - 4, y + padS, yg - plintheS - cabS - vasqueS, dims.boxY - 840, -3); // Credence
    } else { // No credence
      const cabS = (dims.boxY - 200) / scale;
      this.drawDimensionV(svg, x - 4, yg - plintheS, yg, 100, -3); // Plinthe
      this.drawDimensionV(svg, x - 4, yg - plintheS - cabS, yg - plintheS, dims.boxY - 200, -3); // Cabinet
      this.drawDimensionV(svg, x - 4, y + padS, yg - plintheS - cabS, 100, -3); // Vasque
    }

    this.drawLabel(svg, cx, y - 4, "Vue de face");
  },

  drawVueDessus(svg, cx, cy, scale) {
    const dims = this.dims;
    const w = dims.x / scale;
    const h = dims.z / scale;
    const x = cx - w/2;
    const y = cy - h/2;

    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttribute('href', this.capturedImages.dessus);
    img.setAttribute('x', x.toString());
    img.setAttribute('y', y.toString());
    img.setAttribute('width', w.toString());
    img.setAttribute('height', h.toString());
    svg.appendChild(img);

    const padS = 10 / scale;

    // Total length placed at the BOTTOM
    const actualLength = window.state.length * 10;
    this.drawDimensionH(svg, cx - actualLength/scale/2, cx + actualLength/scale/2, y + h - padS + 8, actualLength);
    
    // Total depth on the right
    this.drawDimensionV(svg, x + w + 4, y + padS, y + h - padS, dims.boxZ, 3);

    // Detailed horizontal cotes (basins) at the TOP
    const state = window.state;
    const nb = parseInt(state.nbCuves) || 1;
    let cLengthMm = 390;
    if (window.cuvesData && state.model && window.cuvesData[state.model]) {
      cLengthMm = window.cuvesData[state.model].cuveLength || 390;
    }
    const gapMm = state.plageEntreCuves * 10 || 0;
    const plageGaucheMm = state.position * 10 || 0;
    const xl = cx - actualLength/scale/2;
    const xr = cx + actualLength/scale/2;

    const basinDims = [];
    for (let k = 0; k < nb; k++) {
      const sinkLeftMm = plageGaucheMm + k * (cLengthMm + gapMm);
      const sinkRightMm = sinkLeftMm + cLengthMm;
      basinDims.push({ left: xl + sinkLeftMm / scale, right: xl + sinkRightMm / scale });
    }

    if (basinDims.length > 0) {
      const topDimY = y + padS - 4; // Dimension line y
      // Left plage
      if (plageGaucheMm > 0) {
        this.drawDimensionH(svg, xl, basinDims[0].left, topDimY, plageGaucheMm);
      }
      for (let k = 0; k < nb; k++) {
        this.drawDimensionH(svg, basinDims[k].left, basinDims[k].right, topDimY, cLengthMm);
        if (k < nb - 1 && gapMm > 0) {
          this.drawDimensionH(svg, basinDims[k].right, basinDims[k+1].left, topDimY, gapMm);
        }
      }
      // Right plage
      const plageDroiteMm = actualLength - plageGaucheMm - (nb * cLengthMm + (nb - 1) * gapMm);
      if (plageDroiteMm > 0) {
        this.drawDimensionH(svg, basinDims[nb-1].right, xr, topDimY, Math.round(plageDroiteMm));
      }
    }

    this.drawLabel(svg, cx, y - 14, "Vue de dessus");
  },

  drawVueDessous(svg, cx, cy, scale) {
    const dims = this.dims;
    const w = dims.x / scale;
    const h = dims.z / scale;
    const x = cx - w/2;
    const y = cy - h/2;

    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttribute('href', this.capturedImages.dessous);
    img.setAttribute('x', x.toString());
    img.setAttribute('y', y.toString());
    img.setAttribute('width', w.toString());
    img.setAttribute('height', h.toString());
    svg.appendChild(img);

    const padS = 10 / scale;
    const actualLength = window.state.length * 10;
    this.drawDimensionH(svg, cx - actualLength/scale/2, cx + actualLength/scale/2, y + h - padS + 4, actualLength);

    this.drawLabel(svg, cx, y - 4, "Vue de dessous");
  },

  drawVueCote(svg, cx, cy, scale) {
    const dims = this.dims;
    const w = dims.z / scale;
    const h = dims.y / scale;
    const x = cx - w/2;
    const y = cy - h/2;

    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttribute('href', this.capturedImages.cote);
    img.setAttribute('x', x.toString());
    img.setAttribute('y', y.toString());
    img.setAttribute('width', w.toString());
    img.setAttribute('height', h.toString());
    svg.appendChild(img);

    const padS = 10 / scale;

    // Detailed height on the left
    const yg = y + h - padS; // Ground level
    const plintheS = 100 / scale;
    const vasqueS = 100 / scale;
    
    if (dims.boxY > 900) { // Has credence
      const cabS = 640 / scale;
      this.drawDimensionV(svg, x - 4, yg - plintheS, yg, 100, -3); // Plinthe
      this.drawDimensionV(svg, x - 4, yg - plintheS - cabS, yg - plintheS, 640, -3); // Cabinet
      this.drawDimensionV(svg, x - 4, yg - plintheS - cabS - vasqueS, yg - plintheS - cabS, 100, -3); // Vasque
      this.drawDimensionV(svg, x - 4, y + padS, yg - plintheS - cabS - vasqueS, dims.boxY - 840, -3); // Credence
    } else { // No credence
      const cabS = (dims.boxY - 200) / scale;
      this.drawDimensionV(svg, x - 4, yg - plintheS, yg, 100, -3); // Plinthe
      this.drawDimensionV(svg, x - 4, yg - plintheS - cabS, yg - plintheS, dims.boxY - 200, -3); // Cabinet
      this.drawDimensionV(svg, x - 4, y + padS, yg - plintheS - cabS, 100, -3); // Vasque
    }

    // Depth on the bottom
    this.drawDimensionH(svg, x + padS, x + w - padS, y + h - padS + 8, dims.boxZ);

    this.drawLabel(svg, cx, y - 4, "Vue de côté");
  },

  drawVue3DIso(svg, cx, cy, scale) {
    // Enlarged 3D View
    const w = 200;
    const h = 128;
    const x = cx - w/2;
    const y = cy - h/2;

    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttribute('href', this.capturedImages.iso);
    img.setAttribute('x', x.toString());
    img.setAttribute('y', y.toString());
    img.setAttribute('width', w.toString());
    img.setAttribute('height', h.toString());
    svg.appendChild(img);

    this.drawLabel(svg, cx, y - 2, "Vue 3D");
  },

  drawVueCoteZoom(svg, cx, cy, scale) {
    const dims = this.dims;
    // Fixed zoom scale 1:10 for Coupe A-A to keep it consistently large
    const zoomScale = 10;
    
    // We captured full height and depth
    const trueW = dims.boxZ + 20; // total depth + 2*10mm padding
    const trueH = dims.boxY + 20; // total height + 2*10mm padding

    const w = trueW / zoomScale;
    const h = trueH / zoomScale;

    const x = cx - w/2;
    const y = cy - h/2;

    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttribute('href', this.capturedImages.cote_zoom);
    img.setAttribute('x', x.toString());
    img.setAttribute('y', y.toString());
    img.setAttribute('width', w.toString());
    img.setAttribute('height', h.toString());
    svg.appendChild(img);

    // Zoom circle indicator on original cote? We could add a circle to drawVueCote
    // For now, just title
    this.drawLabel(svg, cx, y - 4, "Coupe A-A");
  },

  drawCartouche(svg) {
    const state = window.state;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // Cartouche positioned exactly at bottom right of the inner border
    const cx = 260;
    const cy = 252;
    const cw = 150;
    const ch = 35;

    // Helper functions
    const addLine = (x1, y1, x2, y2, thickness=0.3) => {
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', x1.toString());
      l.setAttribute('y1', y1.toString());
      l.setAttribute('x2', x2.toString());
      l.setAttribute('y2', y2.toString());
      l.setAttribute('stroke', '#000');
      l.setAttribute('stroke-width', thickness.toString());
      g.appendChild(l);
    };

    const addText = (txt, tx, ty, size=2, weight='normal', align='start', color='#000') => {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', tx.toString());
      t.setAttribute('y', ty.toString());
      t.setAttribute('font-size', size.toString());
      t.setAttribute('font-family', "'Outfit', sans-serif");
      t.setAttribute('font-weight', weight);
      t.setAttribute('text-anchor', align);
      t.setAttribute('fill', color);
      t.textContent = txt;
      g.appendChild(t);
    };

    // Main box
    const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    box.setAttribute('x', cx.toString());
    box.setAttribute('y', cy.toString());
    box.setAttribute('width', cw.toString());
    box.setAttribute('height', ch.toString());
    box.setAttribute('fill', 'none');
    box.setAttribute('stroke', '#000');
    box.setAttribute('stroke-width', '0.5');
    g.appendChild(box);

    // Row 1 (Header codes) - height 4
    addLine(cx, cy + 4, cx + cw, cy + 4);
    // Columns in Row 1: Code Couleurs (20), Côtes Pose (20), Côtes Plan Vasque (25), Côtes Support (25), Empty (25), Empty (35)
    let rx = cx;
    const cols = [20, 20, 25, 25, 25, 35];
    const labels = ["Code Couleurs", "Côtes Pose", "Côtes Plan Vasque", "Côtes Support", "", ""];
    const colors = ["#000", "#10b981", "#3b82f6", "#ec4899", "", ""];
    
    for (let i = 0; i < cols.length; i++) {
      if (i > 0) addLine(rx, cy, rx, cy + 4);
      if (labels[i]) {
        addText(labels[i], rx + cols[i]/2, cy + 2.8, 2, '500', 'middle', colors[i]);
      }
      rx += cols[i];
    }

    // Row 2 Main block - height 22
    const midY = cy + 26;
    addLine(cx, midY, cx + cw, midY); // Line above bottom row
    
    // Vertical separators in main block
    addLine(cx + 60, cy + 4, cx + 60, midY); // After logo
    addLine(cx + 105, cy + 4, cx + 105, midY); // Before dates

    // Logo "iStone."
    addText("iStone.", cx + 30, cy + 18, 12, '800', 'middle');

    // Address
    addText("-Lieu dit vaujalat-", cx + 102, cy + 10, 2.5, '500', 'end');
    addText("43140 La Séauve sur Semène", cx + 102, cy + 15, 2.5, '500', 'end');
    addText("Tel : 04 82 82 98 10", cx + 102, cy + 20, 2.5, '500', 'end');

    // Dates block (x=365 to 410)
    const dx = cx + 105;
    // Date de création
    addLine(dx, cy + 11.3, cx + cw, cy + 11.3);
    addText("Date de création :", dx + 2, cy + 8, 1.8, 'normal');
    addText(this.cartouche.date, cx + cw - 2, cy + 9.5, 2.5, '600', 'end');
    
    // Mise à jour
    addLine(dx, cy + 18.6, cx + cw, cy + 18.6);
    addText("Mise à jour :", dx + 2, cy + 15.3, 1.8, 'normal');
    addText(this.cartouche.updateDate || this.cartouche.date, cx + cw - 2, cy + 16.8, 2.5, '600', 'end');
    
    // Nombre & INDICE
    addLine(cx + 130, cy + 18.6, cx + 130, midY); // split
    addText("Nombre :", dx + 12, cy + 22.3, 2, 'normal', 'end');
    addText(this.cartouche.quantite || "1", dx + 20, cy + 24, 4, '700', 'end');
    
    addText("INDICE", cx + 132, cy + 24, 3, '500');
    addText(this.cartouche.version || "1", cx + cw - 4, cy + 24, 3, '700', 'end');

    // Row 3 Bottom block - height 9 (y = 278 to 287)
    addLine(cx + 18, midY, cx + 18, cy + ch);
    addLine(cx + 130, midY, cx + 130, cy + ch);

    addText("A3", cx + 9, cy + 32, 3, '500', 'middle');
    
    // Project / Ref
    const mainRef = state.model ? (state.model.startsWith('LYNKA') ? `${state.model}${state.credence}` : `LYNKA-${state.model}${state.credence}`) : "";
    addText(mainRef, cx + 74, cy + 32, 4.5, '600', 'middle');
    
    // Page
    addText("Page", cx + 132, cy + 30, 1.8, 'normal');
    addText("1/1", cx + 140, cy + 33, 2.5, '600', 'middle');

    svg.appendChild(g);
  }
};

window.Blueprint = Blueprint;
