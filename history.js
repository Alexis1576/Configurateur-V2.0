/* ═══════════════════════════════════════════════════
   HISTORY.JS — Historique Google Sheets
   ═══════════════════════════════════════════════════ */

'use strict';

const History = {
  // ⚠️ À remplacer par l'URL de votre Google Apps Script Web App
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby2U1s2t5I9NVWmEQU4eir6qwhmIj5eewDjiP0BwiJ7ZhOkP3BaI1L0SL9dMOEWJpDfZQ/exec',

  // GID de la feuille "Historique" dans le même Google Sheet
  SHEET_ID: '1atF6VK20aO1ONcRJFAuEK5VrqeTzwhl2VKbotdRhBBM',
  HISTORY_GID: '1091902274', // Sera rempli après création de la feuille

  _historyData: [],
  _searchQuery: '',

  // ──────────────────────────────────────────
  //  SAUVEGARDE (POST vers Apps Script)
  // ──────────────────────────────────────────
  async save(state, ref, comment = '') {
    if (!state || !this.APPS_SCRIPT_URL || this.APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
      console.warn('History: Apps Script URL not configured. Skipping save.');
      return;
    }

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
      // Use no-cors mode to avoid CORS issues with Apps Script
      await fetch(this.APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      });
      console.log('History: Config saved to Google Sheets:', row.ref);
    } catch(e) {
      console.warn('History: Failed to save to Google Sheets:', e);
    }
  },

  // ──────────────────────────────────────────
  //  CHARGEMENT (GViz GET)
  // ──────────────────────────────────────────
  async load() {
    if (!this.HISTORY_GID) {
      this._historyData = [];
      return;
    }

    const url = `https://docs.google.com/spreadsheets/d/${this.SHEET_ID}/gviz/tq?tqx=out:json&gid=${this.HISTORY_GID}`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      // Strip the callback wrapper
      const json = JSON.parse(text.replace(/^.*?google\.visualization\.Query\.setResponse\(/, '').replace(/\);?\s*$/, ''));
      const rows = json.table?.rows || [];
      const cols = json.table?.cols || [];

      this._historyData = rows.map(row => {
        const c = row.c || [];
        return {
          date: c[0]?.v || '',
          ref: c[1]?.v || '',
          model: c[2]?.v || '',
          support: c[3]?.v || '',
          length: c[4]?.v || '',
          nbCuves: c[5]?.v || '',
          finition: c[6]?.v || '',
          tropPlein: c[7]?.v || '',
          credence: c[8]?.v || '',
          mur: c[9]?.v || '',
          commentaire: c[14]?.v || '',
          json: c[15]?.v || '',
        };
      }).reverse(); // Most recent first
    } catch(e) {
      console.warn('History: Failed to load from Google Sheets:', e);
      this._historyData = [];
    }
  },

  // ──────────────────────────────────────────
  //  RECHERCHE
  // ──────────────────────────────────────────
  filter(query) {
    this._searchQuery = query.toLowerCase();
    this.renderList();
  },

  getFiltered() {
    if (!this._searchQuery) return this._historyData;
    return this._historyData.filter(item => {
      return (item.ref + item.model + item.date + item.commentaire).toLowerCase().includes(this._searchQuery);
    });
  },

  // ──────────────────────────────────────────
  //  AFFICHAGE
  // ──────────────────────────────────────────
  async renderList() {
    const container = document.getElementById('history-items-list');
    if (!container) return;

    container.innerHTML = `<div class="history-loading"><div class="loading-ring" style="width:24px;height:24px;border-width:2px;"></div><p>Chargement de l'historique...</p></div>`;

    if (!this.HISTORY_GID) {
      container.innerHTML = `
        <div class="cart-empty">
          <p style="color:#6b7280; font-size:13px; text-align:center;">
            ⚙️ Configuration requise.<br>
            <a href="https://docs.google.com/spreadsheets/d/${this.SHEET_ID}" target="_blank" style="color:#a78bfa;">Ouvrir Google Sheet</a> et créer la feuille "Historique".
          </p>
        </div>`;
      return;
    }

    await this.load();
    const items = this.getFiltered();

    if (items.length === 0) {
      container.innerHTML = `<div class="cart-empty"><p style="color:#6b7280; font-size:13px; text-align:center;">Aucune configuration enregistrée.<br>Les configurations s'enregistrent automatiquement lors des impressions.</p></div>`;
      return;
    }

    container.innerHTML = items.slice(0, 50).map((item, i) => `
      <div class="cart-item">
        <div class="cart-item-header">
          <span class="cart-item-index" style="background: rgba(16,185,129,0.2); color: #10b981;">${i + 1}</span>
          <div class="cart-item-ref" style="font-size: 12px;">${item.ref || '—'}</div>
        </div>
        <div class="cart-item-details">
          <span>📅 ${item.date}</span>
          <span>📐 ${item.length}mm · ${item.nbCuves} cuve(s) · ${item.support}</span>
          ${item.commentaire ? `<span style="color:#9ca3af; font-style:italic; font-size:11px;">💬 ${item.commentaire}</span>` : ''}
        </div>
        <div class="cart-item-actions">
          <button class="cart-btn-load" onclick="History._loadFromHistory(${i})">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Charger
          </button>
          <button class="cart-btn-plan" onclick="Cart.items.push({id:'hist_${i}', ref:'${item.ref}', addedAt:new Date().toISOString(), state: History._parseState(${i})}); Cart.save(); Cart.updateBadge(); Cart.showToast('Ajouté au panier');">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            + Panier
          </button>
        </div>
      </div>`).join('');
  },

  _parseState(index) {
    const item = this.getFiltered()[index];
    if (!item || !item.json) return null;
    try { return JSON.parse(item.json); } catch(e) { return null; }
  },

  _loadFromHistory(index) {
    const state = this._parseState(index);
    if (state && window.Cart) {
      Cart.applyState(state);
      Cart.closePanel();
      Cart.showToast(`📂 Configuration chargée depuis l'historique`);
    }
  },

  // ──────────────────────────────────────────
  //  INIT
  // ──────────────────────────────────────────
  init() {
    // Search input
    document.getElementById('history-search')?.addEventListener('input', (e) => {
      this.filter(e.target.value);
    });
  }
};

window.History = History;
