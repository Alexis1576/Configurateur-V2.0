/* ═══════════════════════════════════════════════════
   HISTORY.JS — Historique Google Sheets
   ═══════════════════════════════════════════════════ */

'use strict';

const History = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby2U1s2t5I9NVWmEQU4eir6qwhmIj5eewDjiP0BwiJ7ZhOkP3BaI1L0SL9dMOEWJpDfZQ/exec',
  SHEET_ID: '1atF6VK20aO1ONcRJFAuEK5VrqeTzwhl2VKbotdRhBBM',
  HISTORY_GID: '1091902274',

  _historyData: [],
  _searchQuery: '',
  _openGroups: new Set(),

  // ──────────────────────────────────────────
  //  SAUVEGARDE (POST vers Apps Script)
  // ──────────────────────────────────────────
  async save(state, ref, comment = '') {
    if (!state || !this.APPS_SCRIPT_URL || this.APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') return;

    const now = new Date();
    const row = {
      date: now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR'),
      ref: ref || Cart.generateRef(state),
      model: state.model || '',
      support: state.support || 'SANS',
      length: Math.round(state.length * 10),
      nbCuves: state.nbCuves || 1,
      finition: state.finition || '',
      tropPlein: state.tropPlein ? 'Avec' : 'Sans',
      credence: state.credence || 'Aucune',
      mur: state.mur || 'aucun',
      plageGauche: Math.round((state.position || 0) * 10),
      plageDroite: Math.round((state.positionD || state.position || 0) * 10),
      plageEntre: Math.round((state.plageEntreCuves || 0) * 10),
      retombee: Math.round((state.height || 0) * 10),
      commentaire: comment,
      json: JSON.stringify(state),
    };

    try {
      await fetch(this.APPS_SCRIPT_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      });
    } catch(e) { console.warn('History: save failed', e); }
  },

  // ──────────────────────────────────────────
  //  CHARGEMENT (via Apps Script GET)
  // ──────────────────────────────────────────
  async load() {
    if (!this.APPS_SCRIPT_URL || this.APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
      this._historyData = []; return;
    }
    try {
      const res = await fetch(`${this.APPS_SCRIPT_URL}?action=read`);
      const text = await res.text();
      const data = JSON.parse(text);
      const rows = Array.isArray(data) ? data : (data.rows || []);
      this._historyData = rows.map(row => ({
        date: row.date || '', ref: row.ref || '',
        model: row.model || '', support: row.support || '',
        length: row.length || '', nbCuves: row.nbCuves || '',
        finition: row.finition || '', tropPlein: row.tropPlein || '',
        credence: row.credence || '', mur: row.mur || '',
        commentaire: row.commentaire || '', json: row.json || '',
      })).reverse();
    } catch(e) {
      console.warn('History: load failed', e);
      this._historyData = [];
    }
  },

  // ──────────────────────────────────────────
  //  EXTRACTION DU NOM DE PROJET
  //  Ref format: "Nom Projet - LYNKA-VO390-..." ou "LYNKA-VO390-..."
  // ──────────────────────────────────────────
  _extractProjectName(ref) {
    if (!ref) return '— Sans projet —';
    if (ref.startsWith('LYNKA-')) return '— Sans projet —';
    const match = ref.match(/^(.+?)\s+-\s+LYNKA-/);
    if (match) return match[1].trim();
    return '— Sans projet —';
  },

  // ──────────────────────────────────────────
  //  RECHERCHE
  // ──────────────────────────────────────────
  filter(query) {
    this._searchQuery = query.toLowerCase();
    this._renderGrouped(false);
  },

  getFiltered() {
    if (!this._searchQuery) return this._historyData;
    return this._historyData.filter(item => {
      const project = this._extractProjectName(item.ref);
      return (item.ref + item.model + item.date + item.commentaire + project).toLowerCase().includes(this._searchQuery);
    });
  },

  _groupByProject(items) {
    const groups = new Map();
    items.forEach((item, i) => {
      const project = this._extractProjectName(item.ref);
      if (!groups.has(project)) groups.set(project, []);
      groups.get(project).push({ item, globalIndex: i });
    });
    return groups;
  },

  // ──────────────────────────────────────────
  //  TOGGLE D'UN ACCORDÉON
  // ──────────────────────────────────────────
  _toggleGroup(projectName) {
    const key = projectName;
    if (this._openGroups.has(key)) {
      this._openGroups.delete(key);
    } else {
      this._openGroups.add(key);
    }
    const safeId = encodeURIComponent(projectName).replace(/%/g, '_');
    const bodyEl = document.getElementById('hgb_' + safeId);
    const arrowEl = document.getElementById('hga_' + safeId);
    if (bodyEl) bodyEl.style.display = this._openGroups.has(key) ? 'block' : 'none';
    if (arrowEl) arrowEl.style.transform = this._openGroups.has(key) ? 'rotate(90deg)' : '';
  },

  // ──────────────────────────────────────────
  //  AFFICHAGE — point d'entrée principal
  // ──────────────────────────────────────────
  async renderList() {
    await this._renderGrouped(true);
  },

  async _renderGrouped(reload) {
    const container = document.getElementById('history-items-list');
    if (!container) return;

    container.innerHTML = `<div class="history-loading"><div class="loading-ring" style="width:24px;height:24px;border-width:2px;"></div><p>Chargement...</p></div>`;

    if (reload) await this.load();

    const items = this.getFiltered();
    if (items.length === 0) {
      container.innerHTML = `<div class="cart-empty"><p style="color:#6b7280;font-size:13px;text-align:center;">Aucune configuration enregistrée.<br>Les configurations s'enregistrent lors des impressions.</p></div>`;
      return;
    }

    const groups = this._groupByProject(items);

    // Auto-open the most recent project on first load
    if (this._openGroups.size === 0) {
      this._openGroups.add(groups.keys().next().value);
    }

    let html = '';
    groups.forEach((entries, projectName) => {
      const isOpen = this._openGroups.has(projectName);
      const safeId = encodeURIComponent(projectName).replace(/%/g, '_');
      const isSansProjet = projectName === '— Sans projet —';
      const count = entries.length;
      const lastDate = (entries[0]?.item?.date || '').split(' ')[0];

      // Escape single quotes for inline onclick
      const escapedName = projectName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

      html += `
        <div style="margin-bottom:8px; border-radius:10px; overflow:hidden; border:1px solid rgba(255,255,255,0.07);">
          <div onclick="History._toggleGroup('${escapedName}')"
               style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;
                      background:${isSansProjet ? 'rgba(255,255,255,0.03)' : 'rgba(167,139,250,0.1)'};
                      transition:background 0.15s;"
               onmouseover="this.style.background='${isSansProjet ? 'rgba(255,255,255,0.06)' : 'rgba(167,139,250,0.18)'}'"
               onmouseout="this.style.background='${isSansProjet ? 'rgba(255,255,255,0.03)' : 'rgba(167,139,250,0.1)'}'">

            <span id="hga_${safeId}"
                  style="color:#a78bfa;transition:transform 0.2s;display:inline-flex;flex-shrink:0;
                         transform:${isOpen ? 'rotate(90deg)' : ''}">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </span>

            <span style="font-size:16px;flex-shrink:0;">${isSansProjet ? '📁' : '🗂️'}</span>

            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;font-size:13px;color:${isSansProjet ? '#9ca3af' : '#e2d9f3'};
                          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${projectName}
              </div>
              <div style="font-size:11px;color:#6b7280;margin-top:1px;">
                ${count} config${count > 1 ? 's' : ''} · ${lastDate}
              </div>
            </div>

            <span style="background:rgba(167,139,250,0.2);color:#a78bfa;border-radius:99px;
                         padding:2px 8px;font-size:11px;font-weight:600;flex-shrink:0;">
              ${count}
            </span>

            ${!isSansProjet ? `
            <button onclick="event.stopPropagation();History._addProjectToCart('${escapedName}');"
                    title="Ajouter tout le projet au panier"
                    style="flex-shrink:0;background:rgba(16,185,129,0.15);color:#10b981;
                           border:1px solid rgba(16,185,129,0.3);border-radius:6px;
                           padding:4px 8px;font-size:11px;cursor:pointer;white-space:nowrap;">
              + Tout au panier
            </button>` : ''}
          </div>

          <div id="hgb_${safeId}" style="display:${isOpen ? 'block' : 'none'};">
            ${entries.map(({ item }) => {
              const autoRef = item.ref.match(/LYNKA-.+$/) ? (item.ref.match(/LYNKA-.+$/)[0]) : item.ref;
              const esc = item.ref.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
              return `
                <div class="cart-item" style="border-radius:0;border-left:none;border-right:none;border-bottom:none;
                                              border-top:1px solid rgba(255,255,255,0.06);margin:0;">
                  <div class="cart-item-header">
                    <div class="cart-item-ref" style="font-size:11.5px;">${autoRef}</div>
                  </div>
                  <div class="cart-item-details">
                    <span>📅 ${item.date}</span>
                    <span>📐 ${item.length}mm · ${item.nbCuves} cuve(s) · ${item.support}</span>
                    ${item.commentaire ? `<span style="color:#9ca3af;font-style:italic;font-size:11px;">💬 ${item.commentaire}</span>` : ''}
                  </div>
                  <div class="cart-item-actions">
                    <button class="cart-btn-load" onclick="History._loadByRef('${esc}')">
                      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                      Charger
                    </button>
                    <button class="cart-btn-plan" onclick="History._addSingleToCart('${esc}')">
                      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                      + Panier
                    </button>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>`;
    });

    container.innerHTML = html;
  },

  // ──────────────────────────────────────────
  //  ACTIONS
  // ──────────────────────────────────────────
  _findByRef(ref) {
    return this._historyData.find(item => item.ref === ref);
  },

  _parseStateByRef(ref) {
    const item = this._findByRef(ref);
    if (!item?.json) return null;
    try { return JSON.parse(item.json); } catch(e) { return null; }
  },

  _parseState(index) {
    const item = this.getFiltered()[index];
    if (!item?.json) return null;
    try { return JSON.parse(item.json); } catch(e) { return null; }
  },

  _loadByRef(ref) {
    const state = this._parseStateByRef(ref);
    if (state && window.Cart) {
      Cart.applyState(state);
      Cart.closePanel();
      Cart.showToast('📂 Configuration chargée depuis l\'historique');
    }
  },

  _loadFromHistory(index) {
    const state = this._parseState(index);
    if (state && window.Cart) {
      Cart.applyState(state);
      Cart.closePanel();
      Cart.showToast('📂 Configuration chargée depuis l\'historique');
    }
  },

  _addSingleToCart(ref) {
    const item = this._findByRef(ref);
    const state = this._parseStateByRef(ref);
    if (!item || !state || !window.Cart) return;
    Cart.items.push({ id: 'hist_' + Date.now(), ref: item.ref, addedAt: new Date().toISOString(), state });
    Cart.save(); Cart.updateBadge();
    Cart.showToast('✅ Ajouté au panier');
  },

  _addProjectToCart(projectName) {
    const items = this._historyData.filter(item => this._extractProjectName(item.ref) === projectName);
    if (!items.length || !window.Cart) return;
    items.forEach(item => {
      try {
        const state = JSON.parse(item.json);
        Cart.items.push({ id: 'hist_' + Date.now() + '_' + Math.random(), ref: item.ref, addedAt: new Date().toISOString(), state });
      } catch(e) {}
    });
    Cart.save(); Cart.updateBadge();
    Cart.showToast(`✅ ${items.length} config(s) ajoutée(s) au panier`);
  },

  // ──────────────────────────────────────────
  //  INIT
  // ──────────────────────────────────────────
  init() {
    document.getElementById('history-search')?.addEventListener('input', e => this.filter(e.target.value));
  }
};

window.History = History;
