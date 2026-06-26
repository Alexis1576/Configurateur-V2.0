/* ═══════════════════════════════════════════════════
   BLUEPRINT SYSTEM — JavaScript Vector Drawings
   ═══════════════════════════════════════════════════ */

'use strict';


const Blueprint = {
  isOpen: false,
  scale: 25, // Default scale 1:25
  capturedImages: null, // Cache for 3D captures
  manualDims: [], // Cotes manuelles persistantes
  _annotMode: false, // Mode annotation (cotes) actif
  _annotPoint1: null, // Premier point cliqué (coords SVG)
  _calloutMode: false, // Mode annotation texte actif
  _calloutPoint1: null, // Pointe de la flèche
  annotations: [], // Annotations persistantes { arrowPt, boxPt, text, lines[] }
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
    document.getElementById('btn-bp-add-dim')?.addEventListener('click', () => this.toggleAnnotMode());
    document.getElementById('btn-bp-clear-dims')?.addEventListener('click', () => this.clearManualDims());
    document.getElementById('btn-bp-add-annot')?.addEventListener('click', () => this.toggleCalloutMode());
    document.getElementById('btn-bp-clear-annots')?.addEventListener('click', () => this.clearAnnotations());
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

  // ────────────────────────────────────────
  // SYSTÈME DE COTES MANUELLES
  // ────────────────────────────────────────

  toggleAnnotMode() {
    // Cancel callout mode if active
    if (this._calloutMode) this.toggleCalloutMode();
    this._annotMode = !this._annotMode;
    this._annotPoint1 = null;
    const btn = document.getElementById('btn-bp-add-dim');
    const svg = document.querySelector('#blueprint-sheet svg');
    if (this._annotMode) {
      if (btn) { btn.textContent = '❌ Annuler la cote'; btn.style.background = '#ef4444'; }
      if (svg) svg.style.cursor = 'crosshair';
    } else {
      if (btn) { btn.textContent = '📐 Ajouter une cote'; btn.style.background = ''; }
      if (svg) svg.style.cursor = '';
    }
  },

  toggleCalloutMode() {
    // Cancel dimension mode if active
    if (this._annotMode) {
      this._annotMode = false;
      this._annotPoint1 = null;
      const dimBtn = document.getElementById('btn-bp-add-dim');
      if (dimBtn) { dimBtn.textContent = '📐 Ajouter une cote'; dimBtn.style.background = ''; }
    }
    this._calloutMode = !this._calloutMode;
    this._calloutPoint1 = null;
    const btn = document.getElementById('btn-bp-add-annot');
    const svg = document.querySelector('#blueprint-sheet svg');
    if (this._calloutMode) {
      if (btn) { btn.textContent = '❌ Annuler'; btn.style.background = '#f59e0b'; btn.style.color = '#000'; }
      if (svg) svg.style.cursor = 'crosshair';
    } else {
      if (btn) { btn.textContent = '💬 Ajouter une annotation'; btn.style.background = ''; btn.style.color = ''; }
      if (svg) svg.style.cursor = '';
    }
  },

  // Convertit un événement clic en coordonnées SVG (en mm)
  getSVGCoords(evt) {
    const svg = document.querySelector('#blueprint-sheet svg');
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: svgP.x, y: svgP.y };
  },

  handleSVGClick(evt) {
    // If we just finished dragging, prevent click
    if (this._wasDragging) {
      this._wasDragging = false;
      return;
    }

    // ── Mode annotation texte (callout) ──
    if (this._calloutMode) {
      const coords = this.getSVGCoords(evt);
      if (!coords) return;

      if (!this._calloutPoint1) {
        // 1er clic : pointe de la flèche
        this._calloutPoint1 = coords;
        // Feedback visuel
        const svg = document.querySelector('#blueprint-sheet svg');
        if (svg) {
          const existing = svg.querySelector('#callout-temp-dot');
          if (existing) existing.remove();
          const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          dot.setAttribute('id', 'callout-temp-dot');
          dot.setAttribute('cx', coords.x);
          dot.setAttribute('cy', coords.y);
          dot.setAttribute('r', '1.5');
          dot.setAttribute('fill', '#f59e0b');
          dot.setAttribute('opacity', '0.9');
          dot.setAttribute('pointer-events', 'none');
          svg.appendChild(dot);
        }
      } else {
        // 2e clic : position du cadre
        const arrowPt = this._calloutPoint1;
        const boxPt = coords;
        this._calloutPoint1 = null;
        const svg = document.querySelector('#blueprint-sheet svg');
        svg?.querySelector('#callout-temp-dot')?.remove();
        this.showCalloutPopup(arrowPt, boxPt);
      }
      return;
    }
    
    if (!this._annotMode) return;
    const coords = this.getSVGCoords(evt);
    if (!coords) return;

    if (!this._annotPoint1) {
      // Premier clic — mémoriser le point
      this._annotPoint1 = coords;
      // Feedback visuel : petit cercle temporaire
      const svg = document.querySelector('#blueprint-sheet svg');
      if (svg) {
        const existing = svg.querySelector('#annot-temp-dot');
        if (existing) existing.remove();
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('id', 'annot-temp-dot');
        dot.setAttribute('cx', coords.x);
        dot.setAttribute('cy', coords.y);
        dot.setAttribute('r', '1.5');
        dot.setAttribute('fill', '#ef4444');
        dot.setAttribute('opacity', '0.8');
        dot.setAttribute('pointer-events', 'none');
        svg.appendChild(dot);
      }
    } else {
      // Deuxième clic — créer la cote
      const p1 = this._annotPoint1;
      const p2 = coords;
      this._annotPoint1 = null;

      // Supprimer le cercle temporaire
      const svg = document.querySelector('#blueprint-sheet svg');
      const dot = svg?.querySelector('#annot-temp-dot');
      if (dot) dot.remove();

      // Déterminer l'axe dominant (H ou V)
      const dx = Math.abs(p2.x - p1.x);
      const dy = Math.abs(p2.y - p1.y);
      const axis = dx >= dy ? 'H' : 'V';

      // Calculer la valeur en mm selon l'axe et l'échelle courante
      const scale = this.scale;
      const autoValMm = axis === 'H'
        ? Math.round(dx * scale)
        : Math.round(dy * scale);

      // Afficher le popup de saisie
      this.showDimPopup(p1, p2, axis, autoValMm);
    }
  },

  // Drag and Drop Logic
  handleDragStart(evt) {
    const target = evt.target.closest('.cote-draggable');
    if (!target) return;
    
    evt.preventDefault(); // Prevent text selection
    this._draggedDim = target;
    this._dragAxis = target.getAttribute('data-axis');
    this._dragId = target.getAttribute('data-dim-id');
    this._wasDragging = false;
    
    const coords = this.getSVGCoords(evt.type.includes('touch') ? evt.touches[0] : evt);
    this._dragStartCoords = coords;
    
    // Get initial offset from our state
    const offset = this.dimOffsets ? this.dimOffsets[this._dragId] || { dx: 0, dy: 0 } : { dx: 0, dy: 0 };
    this._initialOffset = { ...offset };
  },

  handleDragMove(evt) {
    if (!this._draggedDim) return;
    
    const coords = this.getSVGCoords(evt.type.includes('touch') ? evt.touches[0] : evt);
    if (!coords) return;
    
    const dx = coords.x - this._dragStartCoords.x;
    const dy = coords.y - this._dragStartCoords.y;
    
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      this._wasDragging = true;
    }
    
    const newOffset = { ...this._initialOffset };
    if (this._dragAxis === 'H') {
      newOffset.dy += dy;
    } else {
      newOffset.dx += dx;
    }
    
    // Visually update
    if (this._dragAxis === 'H') {
      this._draggedDim.setAttribute('transform', `translate(0, ${newOffset.dy})`);
    } else {
      this._draggedDim.setAttribute('transform', `translate(${newOffset.dx}, 0)`);
    }
    
    // Temporarily store in state so handleDragEnd can save it
    this._currentOffset = newOffset;
  },

  handleDragEnd(evt) {
    if (!this._draggedDim) return;
    
    if (this._wasDragging && this._currentOffset) {
      if (!this.dimOffsets) this.dimOffsets = {};
      this.dimOffsets[this._dragId] = this._currentOffset;
    }
    
    this._draggedDim = null;
    this._dragAxis = null;
    this._dragId = null;
  },

  showDimPopup(p1, p2, axis, autoValMm) {
    // Supprimer un ancien popup
    const oldPopup = document.getElementById('dim-input-popup');
    if (oldPopup) oldPopup.remove();

    const popup = document.createElement('div');
    popup.id = 'dim-input-popup';
    popup.style.cssText = `
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: #1e2232;
      border: 1px solid #4f46e5;
      border-radius: 12px;
      padding: 24px;
      z-index: 100000;
      min-width: 320px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.7);
      font-family: 'Inter', sans-serif;
      color: #e2e8f0;
    `;

    popup.innerHTML = `
      <h4 style="margin:0 0 16px; font-size:15px; font-weight:600;">📐 Nouvelle cote manuelle</h4>
      <div style="margin-bottom:12px;">
        <label style="font-size:12px; color:#94a3b8; display:block; margin-bottom:4px;">Valeur (mm)</label>
        <input id="dim-val-input" type="number" value="${autoValMm}" min="0"
          style="width:100%; background:#0f1117; border:1px solid #374151; color:#e2e8f0;
                 padding:8px 12px; border-radius:8px; font-size:16px; font-weight:600; outline:none;"
        />
      </div>
      <div style="margin-bottom:12px;">
        <label style="font-size:12px; color:#94a3b8; display:block; margin-bottom:6px;">Couleur</label>
        <div style="display:flex; gap:8px;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="radio" name="dim-color" value="#ef4444" checked /> <span style="color:#ef4444;font-weight:600;">● Rouge (Pose)</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="radio" name="dim-color" value="#10b981" /> <span style="color:#10b981;font-weight:600;">● Vert</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="radio" name="dim-color" value="#f59e0b" /> <span style="color:#f59e0b;font-weight:600;">● Orange</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="radio" name="dim-color" value="#0000ff" /> <span style="color:#60a5fa;font-weight:600;">● Bleu</span>
          </label>
        </div>
      </div>
      <div style="display:flex; gap:8px; margin-top:16px;">
        <button id="dim-confirm-btn" style="flex:1; background:#4f46e5; border:none; color:#fff; padding:10px;
          border-radius:8px; cursor:pointer; font-weight:600; font-size:14px;">✓ Confirmer</button>
        <button id="dim-cancel-btn" style="flex:0 0 auto; background:#374151; border:none; color:#fff; padding:10px 16px;
          border-radius:8px; cursor:pointer;">✕</button>
      </div>
    `;

    document.body.appendChild(popup);
    document.getElementById('dim-val-input').select();

    document.getElementById('dim-cancel-btn').addEventListener('click', () => popup.remove());
    document.getElementById('dim-confirm-btn').addEventListener('click', () => {
      const val = parseFloat(document.getElementById('dim-val-input').value);
      const color = document.querySelector('input[name="dim-color"]:checked')?.value || '#ef4444';
      if (!isNaN(val) && val > 0) {
        this.manualDims.push({ p1, p2, axis, valMm: val, color });
        this.draw();
      }
      popup.remove();
      // Quitter le mode annotation après chaque cote
      this._annotMode = false;
      this._annotPoint1 = null;
      const btn = document.getElementById('btn-bp-add-dim');
      const svgEl = document.querySelector('#blueprint-sheet svg');
      if (btn) { btn.textContent = '📐 Ajouter une cote'; btn.style.background = ''; }
      if (svgEl) svgEl.style.cursor = '';
    });

    // Valider avec Entrée
    document.getElementById('dim-val-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('dim-confirm-btn').click();
      if (e.key === 'Escape') popup.remove();
    });
  },

  clearManualDims() {
    if (this.manualDims.length === 0) return;
    if (confirm(`Supprimer les ${this.manualDims.length} cote(s) manuelle(s) ?`)) {
      this.manualDims = [];
      this.draw();
    }
  },

  // ──────────────────────────────────────────
  //  CALLOUT ANNOTATIONS
  // ──────────────────────────────────────────
  showCalloutPopup(arrowPt, boxPt) {
    const old = document.getElementById('callout-input-popup');
    if (old) old.remove();

    const popup = document.createElement('div');
    popup.id = 'callout-input-popup';
    popup.style.cssText = `
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: #1e2232;
      border: 1px solid #f59e0b;
      border-radius: 12px;
      padding: 24px;
      z-index: 100000;
      min-width: 340px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.7);
      font-family: 'Inter', sans-serif;
    `;
    popup.innerHTML = `
      <h3 style="margin:0 0 14px; color:#fcd34d; font-size:15px; font-weight:700;">💬 Texte d'annotation</h3>
      <div style="margin-bottom:14px;">
        <label style="font-size:12px; color:#94a3b8; display:block; margin-bottom:6px;">Texte (Entrée = nouvelle ligne)</label>
        <textarea id="callout-text-input" rows="4"
          style="width:100%; background:#0f1117; border:1px solid #374151; color:#e2e8f0;
                 padding:8px 12px; border-radius:8px; font-size:13px; outline:none;
                 resize:vertical; font-family:'Inter',sans-serif; box-sizing:border-box;"
          placeholder="Ex : Pour une installation sur une cloison placo, l'installation d'un renfort est fortement recommandée"></textarea>
      </div>
      <div style="margin-bottom:12px;">
        <label style="font-size:12px; color:#94a3b8; display:block; margin-bottom:6px;">Largeur max du cadre (mm)</label>
        <input id="callout-width-input" type="number" value="500" min="100" max="1500"
          style="width:100%; background:#0f1117; border:1px solid #374151; color:#e2e8f0;
                 padding:8px 12px; border-radius:8px; font-size:13px; outline:none;" />
      </div>
      <div style="display:flex; gap:8px; margin-top:16px;">
        <button id="callout-confirm-btn" style="flex:1; background:#f59e0b; border:none; color:#000; padding:10px;
          border-radius:8px; cursor:pointer; font-weight:700; font-size:14px;">✓ Placer</button>
        <button id="callout-cancel-btn" style="flex:0 0 auto; background:#374151; border:none; color:#fff; padding:10px 16px;
          border-radius:8px; cursor:pointer;">✕</button>
      </div>
    `;

    document.body.appendChild(popup);
    document.getElementById('callout-text-input').focus();

    document.getElementById('callout-cancel-btn').addEventListener('click', () => {
      popup.remove();
    });

    document.getElementById('callout-confirm-btn').addEventListener('click', () => {
      const rawText = document.getElementById('callout-text-input').value.trim();
      const maxWMm = parseFloat(document.getElementById('callout-width-input').value) || 500;
      if (!rawText) { popup.remove(); return; }

      // Wrap text into lines of ~maxWMm / (charWidthMm) chars
      const fontSize = 3.5; // SVG units (mm)
      const charWidthMm = fontSize * 0.55;
      const maxCharsPerLine = Math.max(10, Math.floor(maxWMm / this.scale / charWidthMm));
      const lines = this._wrapText(rawText, maxCharsPerLine);

      this.annotations.push({ arrowPt, boxPt, lines, maxWMm });
      this.draw();
      popup.remove();

      // Exit callout mode
      this._calloutMode = false;
      this._calloutPoint1 = null;
      const btn = document.getElementById('btn-bp-add-annot');
      const svgEl = document.querySelector('#blueprint-sheet svg');
      if (btn) { btn.textContent = '💬 Ajouter une annotation'; btn.style.background = ''; btn.style.color = ''; }
      if (svgEl) svgEl.style.cursor = '';
    });
  },

  // Simple word-wrap helper
  _wrapText(text, maxChars) {
    const paragraphs = text.split('\n');
    const result = [];
    paragraphs.forEach(para => {
      if (para.length <= maxChars) { result.push(para); return; }
      const words = para.split(' ');
      let line = '';
      words.forEach(word => {
        if ((line + (line ? ' ' : '') + word).length <= maxChars) {
          line += (line ? ' ' : '') + word;
        } else {
          if (line) result.push(line);
          line = word;
        }
      });
      if (line) result.push(line);
    });
    return result.length ? result : [''];
  },

  clearAnnotations() {
    if (this.annotations.length === 0) return;
    if (confirm(`Supprimer les ${this.annotations.length} annotation(s) ?`)) {
      this.annotations = [];
      this.draw();
    }
  },

  // Dessine toutes les annotations (callouts)
  drawAnnotations(svg) {
    if (!this.annotations || this.annotations.length === 0) return;

    this.annotations.forEach((annot, idx) => {
      const { arrowPt, boxPt, lines } = annot;

      // Measure the box dimensions
      const fontSize = 3.5;
      const lineHeight = 5.2;
      const padX = 3.5;
      const padY = 2.5;
      const charWidthApprox = fontSize * 0.55;
      const maxLineLen = Math.max(...lines.map(l => l.length));
      const boxW = maxLineLen * charWidthApprox + padX * 2;
      const boxH = lines.length * lineHeight + padY * 2;

      // Box anchor point (top-left)
      // We center the box on boxPt
      const bx = boxPt.x - boxW / 2;
      const by = boxPt.y - boxH / 2;

      // Arrow connects arrowPt → nearest point on box border
      // Compute nearest point on rectangle edge from arrowPt
      const clampX = Math.max(bx, Math.min(bx + boxW, arrowPt.x));
      const clampY = Math.max(by, Math.min(by + boxH, arrowPt.y));
      const nearX = clampX;
      const nearY = clampY;

      // Compute arrowhead
      const angle = Math.atan2(nearY - arrowPt.y, nearX - arrowPt.x);
      const arrowLen = 3.5;
      const arrowWing = 1.2;
      const ax1 = arrowPt.x + arrowLen * Math.cos(angle + Math.PI * 0.85);
      const ay1 = arrowPt.y + arrowLen * Math.sin(angle + Math.PI * 0.85);
      const ax2 = arrowPt.x + arrowLen * Math.cos(angle - Math.PI * 0.85);
      const ay2 = arrowPt.y + arrowLen * Math.sin(angle - Math.PI * 0.85);

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'bp-annotation');
      g.setAttribute('data-annot-idx', idx);
      g.style.cursor = 'pointer';
      g.title = 'Cliquez pour supprimer';

      // Arrow line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', arrowPt.x);
      line.setAttribute('y1', arrowPt.y);
      line.setAttribute('x2', nearX);
      line.setAttribute('y2', nearY);
      line.setAttribute('stroke', '#0000cc');
      line.setAttribute('stroke-width', '0.4');
      line.setAttribute('fill', 'none');
      g.appendChild(line);

      // Arrowhead
      const head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      head.setAttribute('points', `${arrowPt.x},${arrowPt.y} ${ax1},${ay1} ${ax2},${ay2}`);
      head.setAttribute('fill', '#0000cc');
      head.setAttribute('stroke', 'none');
      g.appendChild(head);

      // Box rectangle
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', bx);
      rect.setAttribute('y', by);
      rect.setAttribute('width', boxW);
      rect.setAttribute('height', boxH);
      rect.setAttribute('fill', '#ffffff');
      rect.setAttribute('stroke', '#0000cc');
      rect.setAttribute('stroke-width', '0.4');
      rect.setAttribute('rx', '0.5');
      g.appendChild(rect);

      // Text lines
      lines.forEach((line2, li) => {
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', bx + padX);
        t.setAttribute('y', by + padY + fontSize + li * lineHeight);
        t.setAttribute('font-size', fontSize);
        t.setAttribute('font-family', "'Outfit', sans-serif");
        t.setAttribute('font-weight', '400');
        t.setAttribute('fill', '#000000');
        t.setAttribute('text-anchor', 'start');
        t.textContent = line2;
        g.appendChild(t);
      });

      // Click to delete
      g.addEventListener('click', (e) => {
        if (this._calloutMode || this._annotMode) return;
        e.stopPropagation();
        if (confirm('Supprimer cette annotation ?')) {
          this.annotations.splice(idx, 1);
          this.draw();
        }
      });

      svg.appendChild(g);
    });
  },



  // Redessine toutes les cotes manuelles persistées
  drawManualDims(svg) {
    this.manualDims.forEach((dim, idx) => {
      const { p1, p2, axis, valMm, color } = dim;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'cote-dim cote-manuelle');
      g.setAttribute('stroke', color);
      g.setAttribute('stroke-width', '0.3');
      g.setAttribute('fill', 'none');
      g.style.cursor = 'pointer';

      // Calcul des coords de la ligne de cote
      let x1, x2, y1, y2, lx, ly;
      const tickLen = 4;
      if (axis === 'H') {
        // Ligne horizontale — Y = moyenne des deux clics
        const lineY = (p1.y + p2.y) / 2;
        x1 = Math.min(p1.x, p2.x);
        x2 = Math.max(p1.x, p2.x);
        lx = (x1 + x2) / 2;
        ly = lineY - 2;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1); line.setAttribute('y1', lineY);
        line.setAttribute('x2', x2); line.setAttribute('y2', lineY);
        g.appendChild(line);

        // Ticks
        [[x1, lineY], [x2, lineY]].forEach(([tx, ty]) => {
          const t = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          t.setAttribute('x1', tx - tickLen/2); t.setAttribute('y1', ty + tickLen/2);
          t.setAttribute('x2', tx + tickLen/2); t.setAttribute('y2', ty - tickLen/2);
          g.appendChild(t);
        });
      } else {
        // Ligne verticale — X = moyenne des deux clics
        const lineX = (p1.x + p2.x) / 2;
        y1 = Math.min(p1.y, p2.y);
        y2 = Math.max(p1.y, p2.y);
        lx = lineX + 2;
        ly = (y1 + y2) / 2 + 1.5;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', lineX); line.setAttribute('y1', y1);
        line.setAttribute('x2', lineX); line.setAttribute('y2', y2);
        g.appendChild(line);

        // Ticks
        [[lineX, y1], [lineX, y2]].forEach(([tx, ty]) => {
          const t = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          t.setAttribute('x1', tx - tickLen/2); t.setAttribute('y1', ty + tickLen/2);
          t.setAttribute('x2', tx + tickLen/2); t.setAttribute('y2', ty - tickLen/2);
          g.appendChild(t);
        });
      }

      // Label valeur
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', lx);
      txt.setAttribute('y', ly);
      txt.setAttribute('fill', color);
      txt.setAttribute('stroke', 'none');
      txt.setAttribute('font-size', '4.5');
      txt.setAttribute('font-family', "'Outfit', sans-serif");
      txt.setAttribute('font-weight', '600');
      txt.setAttribute('text-anchor', 'middle');
      txt.textContent = Math.round(valMm);
      g.appendChild(txt);

      // Bouton suppression (× en survol)
      g.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Supprimer cette cote (${Math.round(valMm)} mm) ?`)) {
          this.manualDims.splice(idx, 1);
          this.draw();
        }
      });

      svg.appendChild(g);
    });
  },

  // Helper to draw a dimension line (cotes)
  drawDimensionH(svg, x1, x2, y, valMm, labelOffset = -3, tickLen = 4) {
    this.dimCounter++;
    const id = `dim_H_${this.dimCounter}`;
    const offset = this.dimOffsets ? this.dimOffsets[id] || { dx: 0, dy: 0 } : { dx: 0, dy: 0 };

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'cote-dim cote-draggable');
    g.setAttribute('data-dim-id', id);
    g.setAttribute('data-axis', 'H');
    g.setAttribute('stroke', '#0000ff');
    g.setAttribute('stroke-width', '0.25');
    g.setAttribute('fill', 'none');
    g.setAttribute('cursor', 'ns-resize');
    if (offset.dy !== 0) {
      g.setAttribute('transform', `translate(0, ${offset.dy})`);
    }

    // Transparent hitbox for easier dragging
    const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    hitbox.setAttribute('x', Math.min(x1, x2));
    hitbox.setAttribute('y', y - 8);
    hitbox.setAttribute('width', Math.abs(x2 - x1));
    hitbox.setAttribute('height', 16);
    hitbox.setAttribute('fill', 'transparent');
    hitbox.setAttribute('stroke', 'none');
    hitbox.setAttribute('pointer-events', 'all');
    g.appendChild(hitbox);

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
    txt.setAttribute('pointer-events', 'none');
    txt.textContent = Math.round(valMm);
    g.appendChild(txt);

    svg.appendChild(g);
  },

  drawDimensionV(svg, x, y1, y2, valMm, labelOffset = 3, tickLen = 4) {
    this.dimCounter++;
    const id = `dim_V_${this.dimCounter}`;
    const offset = this.dimOffsets ? this.dimOffsets[id] || { dx: 0, dy: 0 } : { dx: 0, dy: 0 };

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'cote-dim cote-draggable');
    g.setAttribute('data-dim-id', id);
    g.setAttribute('data-axis', 'V');
    g.setAttribute('stroke', '#0000ff');
    g.setAttribute('stroke-width', '0.25');
    g.setAttribute('fill', 'none');
    g.setAttribute('cursor', 'ew-resize');
    if (offset.dx !== 0) {
      g.setAttribute('transform', `translate(${offset.dx}, 0)`);
    }

    // Transparent hitbox for easier dragging
    const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    hitbox.setAttribute('x', x - 8);
    hitbox.setAttribute('y', Math.min(y1, y2));
    hitbox.setAttribute('width', 16);
    hitbox.setAttribute('height', Math.abs(y2 - y1));
    hitbox.setAttribute('fill', 'transparent');
    hitbox.setAttribute('stroke', 'none');
    hitbox.setAttribute('pointer-events', 'all');
    g.appendChild(hitbox);

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
    txt.setAttribute('pointer-events', 'none');
    txt.textContent = Math.round(valMm);
    g.appendChild(txt);

    svg.appendChild(g);
  },

  // Main drawing controller
  draw() {
    this.dimCounter = 0;
    if (!this.dimOffsets) this.dimOffsets = {};

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

    // Simple frame border
    const frameRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    frameRect.setAttribute('x', '2');
    frameRect.setAttribute('y', '2');
    frameRect.setAttribute('width', '416');
    frameRect.setAttribute('height', '293');
    frameRect.setAttribute('fill', 'none');
    frameRect.setAttribute('stroke', '#080b12');
    frameRect.setAttribute('stroke-width', '0.5');
    svg.appendChild(frameRect);

    // Titres de section supprimés à la demande de l'utilisateur

    // We will do dynamic scale computation AFTER checking captures, 
    // because we need this.dims for accurate auto-layout.
    
    // Check if 3D captures are ready
    if (!this.capturedImages || !this.dims) {
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

    const dims = this.dims;

    // === OPTIMAL SCALE FINDER ===
    // SVG viewBox = 420×297 (A3). Left column: cx=110, so usable x: ~10..205 = 195 wide.
    // The Cartouche is on the RIGHT side (X > 215). So the left column can go all the way down!
    // Usable height: 7 to 292 = 285 total.
    const MARGIN_TOP_PAGE = 7;        // top border
    const MARGIN_FACE_TOP   = 24;     // space for "Vue de face" title and Coupe A-A title
    const MARGIN_FACE_BOT   = 18;     // dim below face
    const MARGIN_DESSUS_TOP = 18;     // gap + "Vue de dessus" title + top cote row
    const MARGIN_DESSUS_BOT = 16;     // dim below dessus
    const MARGIN_DESSOUS_TOP = 18;    // gap + "Vue de dessous" title + drain cotes
    const MARGIN_DESSOUS_BOT = 8;

    const totalFixedV = MARGIN_TOP_PAGE + MARGIN_FACE_TOP + MARGIN_FACE_BOT
                      + MARGIN_DESSUS_TOP + MARGIN_DESSUS_BOT
                      + MARGIN_DESSOUS_TOP + MARGIN_DESSOUS_BOT;

    // Available vertical space in the left column
    const maxH = 285;
    const availableForViews = maxH - totalFixedV; // ≈ 188 units for 3 stacked drawings

    // Available horizontal space in the left column
    // The frame border on the left is at X=5. The dimensions are drawn at X = cx - w/2 - 12.
    // If cx=110, w/2 cannot exceed 88 (110 - 88 - 12 = 10, which is safe).
    // So maxW is 176.
    const maxW = 176;

    // --- Constraint 1: height ---
    const minScaleForHeight = (dims.y + 2 * dims.z) / Math.max(1, availableForViews);

    // --- Constraint 2: width ---
    const fillRatio = 0.9 + 0.1 * Math.min(1, Math.max(0, (dims.x - 1200) / 1200));
    const targetW = maxW * fillRatio;
    const minScaleForWidth = dims.x / targetW;

    // Best scale = largest of the two minimums
    let scale = Math.max(minScaleForHeight, minScaleForWidth);
    // Round to 1 decimal place to use space optimally (e.g., 12.2 instead of jumping to 13)
    scale = Math.ceil(scale * 10) / 10;
    scale = Math.max(scale, 2); // floor at 1:2

    // Compute view heights at chosen scale
    const hFace   = dims.y / scale;
    const hDessus = dims.z / scale;
    const hDessous = dims.z / scale;

    const totalUsed = totalFixedV + hFace + hDessus + hDessous;

    // Spread any leftover vertical space evenly between the 3 inter-view gaps
    const extraSpace = Math.max(0, maxH - totalUsed);
    const extraPerGap = extraSpace / 3;

    let currentY = MARGIN_TOP_PAGE;

    currentY += MARGIN_FACE_TOP + extraPerGap;
    const cyFace = currentY + hFace / 2;
    currentY += hFace + MARGIN_FACE_BOT;

    currentY += MARGIN_DESSUS_TOP + extraPerGap;
    const cyDessus = currentY + hDessus / 2;
    currentY += hDessus + MARGIN_DESSUS_BOT;

    currentY += MARGIN_DESSOUS_TOP + extraPerGap;
    const cyDessous = currentY + hDessous / 2;
    currentY += hDessous + MARGIN_DESSOUS_BOT;

    this.scale = scale;
    this.cartouche.scale = `1:${scale}`;

    // Draw all views using captured images and overlay vector cotes
    // Vue de Face on top
    this.drawVueFace(svg, 110, cyFace, scale);
    
    // Calculate safe X position for Vue de Côté to perfectly center it
    const rightFace = 110 + (dims.x / scale) / 2 + 25; // 25 padding for right-side dimensions
    let leftCoupe = 400; // Default right edge of usable space
    if (this.capturedImages.cote_zoom) {
      const zoomScale = Math.max(6, scale - 2);
      const wCoupe = (dims.boxZ + 20) / zoomScale;
      leftCoupe = 345 - wCoupe / 2 - 15; // 15 padding for left-side dimensions
    }
    const cxCote = rightFace + (leftCoupe - rightFace) / 2;

    // Vue de Côté next to Vue de Face (align with face)
    this.drawVueCote(svg, cxCote, cyFace, scale);

    // Vue de Dessus below Vue de Face
    this.drawVueDessus(svg, 110, cyDessus, scale);
    
    // Vue de Dessous below Vue de Dessus
    this.drawVueDessous(svg, 110, cyDessous, scale);

    // Iso (Larger and positioned safely)
    // Placed in the remaining space between the views and the right edge
    let cy3D = cyDessus + (cyDessous - cyDessus) / 2;
    // Ensure it doesn't hit Cartouche (Y=248)
    if (cy3D > 195) cy3D = 195; 
    
    // Center it between the right edge of the main views and the right edge of the page (X=410)
    // We limit cx3D to avoid pushing it too far right if the vanity is small
    const cx3D = Math.max(305, rightFace + (410 - rightFace) / 2);
    
    this.drawVue3DIso(svg, cx3D, cy3D, scale);

    // Zoomed Side View
    if (this.capturedImages.cote_zoom) {
      this.drawVueCoteZoom(svg, 345, cyFace + 5, scale);
    }

    // Draw cartouche exactly like the CAD drawing
    this.drawCartouche(svg);

    // Dessiner les cotes manuelles persistées (au-dessus de tout)
    this.drawManualDims(svg);

    // Dessiner les annotations callout (au-dessus des cotes)
    this.drawAnnotations(svg);

    // Attacher le handler de clic pour le mode annotation
    svg.addEventListener('click', (e) => this.handleSVGClick(e));
    
    // Attacher les handlers de drag & drop
    svg.addEventListener('mousedown', (e) => this.handleDragStart(e));
    svg.addEventListener('touchstart', (e) => this.handleDragStart(e), {passive: false});

    if (!this._dragEventsInitialized) {
      window.addEventListener('mousemove', (e) => this.handleDragMove(e));
      window.addEventListener('mouseup', (e) => this.handleDragEnd(e));
      window.addEventListener('touchmove', (e) => this.handleDragMove(e), {passive: false});
      window.addEventListener('touchend', (e) => this.handleDragEnd(e));
      this._dragEventsInitialized = true;
    }

    container.appendChild(svg);
  },

  drawText(svg, x, y, textVal, size=3.5, anchor='middle', color='#000') {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', x.toString());
    t.setAttribute('y', y.toString());
    t.setAttribute('font-size', size.toString());
    t.setAttribute('font-family', "'Outfit', sans-serif");
    t.setAttribute('font-weight', '500');
    t.setAttribute('text-anchor', anchor);
    t.setAttribute('fill', color);
    t.textContent = textVal;
    svg.appendChild(t);
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
    
    // Retombée cote on the right (au lieu de la hauteur totale)
    const retombeeMm = Math.round(window.state.height * 10);
    const retombeeSvg = retombeeMm / scale;
    this.drawDimensionV(svg, x + w + 4, y + padS + retombeeSvg, y + padS, retombeeMm, 3);
    
    // Cotes des largeurs de portes
    if (state.support === 'THALLISOL' && window.supportDoorsConfig && window.supportDoorsConfig.numDoors > 0) {
      const { numDoors, doorWidth } = window.supportDoorsConfig;
      const groupWidth = numDoors * doorWidth + 3 * (numDoors - 1);
      const startX = cx - (groupWidth / scale) / 2;
      
      const dimY = y + padS + retombeeSvg + ((h - padS - retombeeSvg) / 2); // Milieu du meuble
      
      for (let i = 0; i < numDoors; i++) {
        const dX = startX + (i * (doorWidth + 3)) / scale;
        const dW = doorWidth / scale;
        this.drawDimensionH(svg, dX, dX + dW, dimY, Math.round(doorWidth), -3);
      }
    }

    this.drawLabel(svg, cx, y - 10, "Vue de face");
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
    const xr = cx + actualLength/scale/2;
    const xl = cx - actualLength/scale/2;

    this.drawDimensionH(svg, xl, xr, y + h - padS + 8, actualLength);
    
    // Total depth on the right (décalée plus à droite pour ne pas chevaucher)
    // Anchored to xr (actual right edge of the object) instead of the padded image edge
    this.drawDimensionV(svg, xr + 18, y + padS, y + h - padS, dims.boxZ, 3);

    // Detailed horizontal cotes (basins) at the TOP
    const state = window.state;
    const nb = parseInt(state.nbCuves) || 1;
    let cLengthMm = 390;
    if (window.cuvesData && state.model && window.cuvesData[state.model]) {
      cLengthMm = window.cuvesData[state.model].cuveLength || 390;
    }
    const gapMm = state.plageEntreCuves * 10 || 0;
    const plageGaucheMm = state.position * 10 || 0;

    const basinDims = [];
    for (let k = 0; k < nb; k++) {
      const sinkLeftMm = plageGaucheMm + k * (cLengthMm + gapMm);
      const sinkRightMm = sinkLeftMm + cLengthMm;
      basinDims.push({ left: xl + sinkLeftMm / scale, right: xl + sinkRightMm / scale });
    }

    if (basinDims.length > 0) {
      const topDimY = y - 8; // Remonter les cotes
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

    this.drawLabel(svg, cx, y - 22, "Vue de dessus");

    // Axe cuve (par rapport à l'avant du plan vasque)
    this.drawDimensionV(svg, xl - 12, y + h/2, y + h, dims.boxZ / 2, -3);

    // Cotes verticales sur la cuve la plus à droite (profondeur)
    if (basinDims.length > 0) {
      let cDepthMm = 270; // Valeur par défaut
      if (window.cuvesData && state.model && window.cuvesData[state.model] && window.cuvesData[state.model].cuveDepth) {
        cDepthMm = window.cuvesData[state.model].cuveDepth;
      } else if (window._baseCuveModel && window.THREE) {
        try {
          const box = new window.THREE.Box3().setFromObject(window._baseCuveModel);
          const size = new window.THREE.Vector3();
          box.getSize(size);
          // Si le modèle 3D est tourné, la profondeur est sur l'axe X ou Z. 
          // L'utilisateur indique que la valeur Z actuelle correspondait à la largeur. On utilise donc X.
          let depth = size.x;
          // Sécurité : la profondeur d'une cuve est généralement entre 200 et 450.
          if (depth > 100 && depth < 600) {
            cDepthMm = Math.round(depth);
          }
        } catch(e) {}
      }

      const backToBasinMm = Math.round(dims.boxZ / 2 - cDepthMm / 2);
      const basinDepthMm = cDepthMm;
      const basinToFrontMm = Math.round(dims.boxZ / 2 - cDepthMm / 2);

      const y0 = y;
      const y1 = y + backToBasinMm / scale;
      const y2 = y1 + basinDepthMm / scale;
      const y3 = y + h;

      const dimX = xr + 4; // Anchored closer to the actual right edge of the vanity

      this.drawDimensionV(svg, dimX, y0, y1, backToBasinMm, 3);
      this.drawDimensionV(svg, dimX, y1, y2, basinDepthMm, 3);
      this.drawDimensionV(svg, dimX, y2, y3, basinToFrontMm, 3);
    }
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
    const state = window.state;
    const actualLength = state.length * 10;
    const xl = cx - actualLength/scale/2;
    const xr = cx + actualLength/scale/2;

    this.drawLabel(svg, cx, y - 24, "Vue de dessous");

    // Position évacuations (au-dessus)
    const nb = parseInt(state.nbCuves) || 1;
    let cLengthMm = 390;
    if (window.cuvesData && state.model && window.cuvesData[state.model]) {
      cLengthMm = window.cuvesData[state.model].cuveLength || 390;
    }
    const gapMm = state.plageEntreCuves * 10 || 0;
    const plageGaucheMm = state.position * 10 || 0;

    const drainDimY = y - 10;
    
    let currentX = xl;
    let accumulatedMm = 0;
    for (let k = 0; k < nb; k++) {
      const sinkLeftMm = plageGaucheMm + k * (cLengthMm + gapMm);
      const sinkCenterMm = sinkLeftMm + cLengthMm / 2;
      const sinkCenterSvg = xl + sinkCenterMm / scale;
      
      this.drawDimensionH(svg, currentX, sinkCenterSvg, drainDimY, sinkCenterMm - accumulatedMm);
      currentX = sinkCenterSvg;
      accumulatedMm = sinkCenterMm;
    }
    this.drawDimensionH(svg, currentX, xr, drainDimY, actualLength - accumulatedMm);

    // Position console (en-dessous)
    if (state.support !== 'SANS') {
        const consoleDimY = y + h + 14;
        
        let totalRetrait = 14; // par défaut (équivalent à 7mm de chaque côté)
        if (state.support === 'TH') {
            totalRetrait = 40; // Le support TH fait 40mm de moins que le plan (20mm de chaque côté)
        } else if (state.support === 'THALLISOL') {
            totalRetrait = 28; // Le support THALLISOL fait 28mm de moins que le plan
        }
        
        const supportRetrait = totalRetrait / 2; 
        const supportLengthMm = actualLength - totalRetrait;
        const supportLeftSvg = xl + supportRetrait / scale;
        const supportRightSvg = xr - supportRetrait / scale;
        
        const bracketCentersMm = []; // Distances relatives au bord gauche du support
        
        if (state.support === 'THALLISOL' && window.supportDoorsConfig && window.supportDoorsConfig.numDoors > 1) {
            // THALLISOL: Pointer sur les séparations réellement placées entre les portes
            const { actualSeparationsX } = window.supportDoorsConfig;
            if (actualSeparationsX) {
                for (const xGap of actualSeparationsX) {
                    const distFromSupportLeft = xGap - (-supportLengthMm / 2);
                    bracketCentersMm.push(distFromSupportLeft);
                }
            }
        } else {
            // Autres supports: Pointer sur les consoles
            const nbGaps = nb - 1;
            const halfLength = actualLength / 2;
            for (let i = 0; i < nbGaps; i++) {
                const isLeft = i < (nbGaps / 2);
                const cuve1X = -halfLength + plageGaucheMm + i * (cLengthMm + gapMm) + cLengthMm / 2;
                const cuve2X = cuve1X + cLengthMm + gapMm;
                const centerGapX = (cuve1X + cuve2X) / 2; 
                const decalage = isLeft ? 35 : -35;
                const bracketX = centerGapX + decalage; 
                
                // Calculer la position par rapport au bord gauche du support
                const distFromSupportLeft = bracketX - (-halfLength + supportRetrait);
                bracketCentersMm.push(distFromSupportLeft);
            }
        }
        
        if (bracketCentersMm.length > 0) {
            let cX = supportLeftSvg;
            let cMm = 0;
            for (const distMm of bracketCentersMm) {
                const distSvg = supportLeftSvg + distMm / scale;
                this.drawDimensionH(svg, cX, distSvg, consoleDimY, distMm - cMm);
                cX = distSvg;
                cMm = distMm;
            }
            this.drawDimensionH(svg, cX, supportRightSvg, consoleDimY, supportLengthMm - cMm);
        }

        // Longueur support
        this.drawDimensionH(svg, supportLeftSvg, supportRightSvg, consoleDimY + (bracketCentersMm.length > 0 ? 12 : 0), supportLengthMm);
    } else {
        // Juste la longueur totale si pas de support
        this.drawDimensionH(svg, xl, xr, y + h + 10, actualLength);
    }
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

    // Depth on the top
    this.drawDimensionH(svg, x + padS, x + w - padS, y - 3, dims.boxZ);

    // Zone PMR
    if (this.cartouche.pmr) {
      if (!svg.querySelector('#pmr-pattern')) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pattern.setAttribute('id', 'pmr-pattern');
        pattern.setAttribute('width', '8');
        pattern.setAttribute('height', '8');
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');
        pattern.setAttribute('patternTransform', 'rotate(45)');
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '0');
        line.setAttribute('y1', '0');
        line.setAttribute('x2', '0');
        line.setAttribute('y2', '8');
        line.setAttribute('stroke', '#009900');
        line.setAttribute('stroke-width', '1');
        
        pattern.appendChild(line);
        defs.appendChild(pattern);
        svg.appendChild(defs);
      }

      const pmrW = 300 / scale;
      const pmrH = 700 / scale;
      
      // La vue de côté étant inversée, l'avant du plan vasque est maintenant à DROITE de l'image.
      const pmrX = (x + w - padS) - pmrW;
      const pmrY = (y + padS + 850 / scale) - pmrH;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', pmrX.toString());
      rect.setAttribute('y', pmrY.toString());
      rect.setAttribute('width', pmrW.toString());
      rect.setAttribute('height', pmrH.toString());
      rect.setAttribute('fill', 'url(#pmr-pattern)');
      rect.setAttribute('stroke', '#009900');
      rect.setAttribute('stroke-width', '1.5');
      svg.appendChild(rect);

      const t300 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t300.setAttribute('x', (pmrX + pmrW/2).toString());
      t300.setAttribute('y', (pmrY + 10).toString());
      t300.setAttribute('font-family', 'sans-serif');
      t300.setAttribute('font-size', '8');
      t300.setAttribute('fill', '#003300');
      t300.setAttribute('text-anchor', 'middle');
      t300.textContent = '300';
      svg.appendChild(t300);

      const t700 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      // Placer le texte "700" à gauche de la zone PMR pour qu'il soit dans le meuble
      t700.setAttribute('x', (pmrX - 6).toString());
      t700.setAttribute('y', (pmrY + pmrH/2).toString());
      t700.setAttribute('font-family', 'sans-serif');
      t700.setAttribute('font-size', '8');
      t700.setAttribute('fill', '#003300');
      t700.setAttribute('transform', `rotate(-90 ${pmrX - 6} ${pmrY + pmrH/2})`);
      t700.setAttribute('text-anchor', 'middle');
      t700.textContent = '700';
      svg.appendChild(t700);
    }

    this.drawLabel(svg, cx, y - 20, "Vue de côté");
  },

  drawVue3DIso(svg, cx, cy, scale) {
    // Enlarged 3D View (but slightly smaller to avoid overlaps)
    const w = 140;
    const h = 90;
    const x = cx - w/2;
    const y = cy - h/2;

    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttribute('href', this.capturedImages.iso);
    img.setAttribute('x', x.toString());
    img.setAttribute('y', y.toString());
    img.setAttribute('width', w.toString());
    img.setAttribute('height', h.toString());
    svg.appendChild(img);

    // Title "Vue 3D" removed as requested
  },

  drawVueCoteZoom(svg, cx, cy, scale) {
    const dims = this.dims;
    // Zoom scale for Coupe A-A should be proportional to the main scale
    // We make it slightly larger (scale - 2) but never smaller than 1:6
    const zoomScale = Math.max(6, scale - 2);
    
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
    // Miroir horizontal (symétrie)
    img.setAttribute('transform', `translate(${cx}, ${cy}) scale(-1, 1) translate(${-cx}, ${-cy})`);
    svg.appendChild(img);

    // Zoom circle indicator on original cote? We could add a circle to drawVueCote
    // For now, just title
    this.drawLabel(svg, cx, y - 4, "Coupe A-A");

    // Cote de la plinthe (Support TH / THALLISOL)
    if (window.state.support === 'THALLISOL' || window.state.support === 'TH') {
      const padS = 10 / zoomScale;
      // Le pied dépasse en bas, on remonte pour aligner la cote sur la plinthe grise
      const piedOffsetMm = 15; 
      const plintheBottomY = y + h - padS - (piedOffsetMm / zoomScale);
      const plintheTopY = plintheBottomY - (100 / zoomScale);
      // On la place sur la gauche de la vue de coupe (à l'arrière du meuble)
      const dimX = x - 10; 
      this.drawDimensionV(svg, dimX, plintheTopY, plintheBottomY, 100, -3);

      if (window.state.support === 'THALLISOL') {
        // Hauteur de la porte / Face_EOS (THALLISOL)
        // Le vide (Face EOS) fait 100mm, et la porte fait 537mm
        const topBlockMm = window.state.height * 10;
        const faceEosTopY = y + padS + (topBlockMm / zoomScale);
        
        const faceEosMm = 100;
        const porteMm = 537;
        
        const faceEosBottomY = faceEosTopY + (faceEosMm / zoomScale);
        const porteBottomY = faceEosBottomY + (porteMm / zoomScale);
        
        // Sur la droite de la vue (côté avant)
        // Cote de la Face EOS
        this.drawDimensionV(svg, x + w + 8, faceEosTopY, faceEosBottomY, faceEosMm, 3);
        // Cote de la porte
        this.drawDimensionV(svg, x + w + 8, faceEosBottomY, porteBottomY, porteMm, 3);
      }
    }
  },

  drawCartouche(svg) {
    const state = window.state;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', 'scale(1.35)');

    // Le cartouche est agrandi de 35% (scale 1.35).
    // Pour être calé en bas à droite du cadre (qui finit à X=418, Y=295) :
    // cx = (418 - 150*1.35) / 1.35 = 215.5 / 1.35 = 159.63
    // cy = (295 - 35*1.35) / 1.35 = 247.75 / 1.35 = 183.52
    const cx = 159.63;
    const cy = 183.52;
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

    // Logo "iStone." (remplacé par l'image)
    const logoImg = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    logoImg.setAttribute('href', 'logo_istone.png');
    logoImg.setAttribute('x', (cx + 5).toString());
    logoImg.setAttribute('y', (cy + 8).toString());
    logoImg.setAttribute('width', '50');
    logoImg.setAttribute('height', '16');
    g.appendChild(logoImg);

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
