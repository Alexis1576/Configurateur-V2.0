/* ═══════════════════════════════════════════════════
   CART.JS — Système Panier & Références LYNKA
   ═══════════════════════════════════════════════════ */

'use strict';

const Cart = {
  items: [],        // { id, ref, state, addedAt }
  _panelOpen: false,
  _activeTab: 'cart', // 'cart' | 'history'

  // ──────────────────────────────────────────
  //  RÉFÉRENCE AUTOMATIQUE
  // ──────────────────────────────────────────
  generateRef(state) {
    if (!state || !state.model) return 'LYNKA-?';

    const finitionMap = { 'blanc-mat': 'BM', 'beton': 'BE', 'noir': 'NO' };
    const finCode = finitionMap[state.finition] || state.finition.toUpperCase().substring(0, 2);

    let parts = ['LYNKA', state.model, state.support || 'SANS'];
    parts.push(`L${Math.round(state.length * 10)}`); // cm → mm
    if (parseInt(state.nbCuves) > 1) parts.push(`N${state.nbCuves}`);
    parts.push(finCode);
    if (state.credence) parts.push(`C${state.credence}`);
    if (state.mur && state.mur !== 'aucun') parts.push(`M${state.mur.toUpperCase().substring(0, 1)}`);

    return parts.join('-');
  },

  // ──────────────────────────────────────────
  //  PANIER CRUD
  // ──────────────────────────────────────────
  add(state) {
    const ref = this.generateRef(state);
    const id = `cfg_${Date.now()}`;
    const item = {
      id,
      ref,
      addedAt: new Date().toISOString(),
      state: JSON.parse(JSON.stringify(state)), // Deep copy
    };
    this.items.push(item);
    this.save();
    this.updateBadge();
    this.renderCartItems();
    this.showToast(`✅ ${ref} ajouté au panier`);
    return item;
  },

  remove(id) {
    this.items = this.items.filter(i => i.id !== id);
    this.save();
    this.updateBadge();
    this.renderCartItems();
  },

  loadConfig(id) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;
    this.applyState(item.state);
    this.closePanel();
    this.showToast(`📂 Configuration ${item.ref} chargée`);
  },

  applyState(savedState) {
    const state = window.state;
    if (!state) return;

    // Apply all saved values to window.state
    Object.assign(state, savedState);

    // Trigger UI updates
    const $ = id => document.getElementById(id);

    if ($('select-model')) { $('select-model').value = state.model; $('select-model').dispatchEvent(new Event('change')); }
    if ($('select-support')) { $('select-support').value = state.support; $('select-support').dispatchEvent(new Event('change')); }
    if ($('slider-length')) { $('slider-length').value = state.length; $('slider-length').dispatchEvent(new Event('input')); }
    if ($('slider-plage-g')) { $('slider-plage-g').value = state.position; $('slider-plage-g').dispatchEvent(new Event('input')); }
    if ($('slider-plage-d')) { $('slider-plage-d').value = state.positionD || state.position; $('slider-plage-d').dispatchEvent(new Event('input')); }
    if ($('slider-plage-entre') && state.plageEntreCuves) { $('slider-plage-entre').value = state.plageEntreCuves; $('slider-plage-entre').dispatchEvent(new Event('input')); }
    if ($('slider-height')) { $('slider-height').value = state.height; $('slider-height').dispatchEvent(new Event('input')); }
    if ($('toggle-tropplein')) { $('toggle-tropplein').checked = state.tropPlein; $('toggle-tropplein').dispatchEvent(new Event('change')); }
    if ($('select-nb-cuves') && state.nbCuves) { setTimeout(() => { $('select-nb-cuves').value = state.nbCuves; $('select-nb-cuves').dispatchEvent(new Event('change')); }, 300); }

    // Finition radio
    const finEl = document.querySelector(`input[name="finition"][value="${state.finition}"]`);
    if (finEl) { finEl.checked = true; finEl.dispatchEvent(new Event('change')); }

    // Murs radio
    const murEl = document.querySelector(`input[name="mur"][value="${state.mur}"]`);
    if (murEl) { murEl.checked = true; murEl.dispatchEvent(new Event('change')); }

    // Crédence radio
    const credEl = document.querySelector(`input[name="credence"][value="${state.credence || ''}"]`);
    if (credEl) { credEl.checked = true; credEl.dispatchEvent(new Event('change')); }
  },

  // ──────────────────────────────────────────
  //  IMPRESSION GROUPÉE
  // ──────────────────────────────────────────
  async printAll() {
    if (this.items.length === 0) {
      this.showToast('⚠️ Le panier est vide');
      return;
    }

    const projectRefInput = document.getElementById('cart-project-ref');
    const projectRef = projectRefInput ? projectRefInput.value.trim() : '';
    
    if (!projectRef) {
      const confirmPrint = confirm(`Vous n'avez pas entré de nom de projet/référence.\nVoulez-vous imprimer et terminer ce panier avec les références générées automatiquement ?`);
      if (!confirmPrint) return;
    } else {
      const confirmPrint = confirm(`Imprimer et terminer ce panier sous la référence "${projectRef}" ?`);
      if (!confirmPrint) return;
    }

    this.closePanel();

    // Créer un conteneur d'impression global pour imprimer toutes les pages d'un coup
    const printContainer = document.createElement('div');
    printContainer.id = 'print-all-container';
    document.body.appendChild(printContainer);

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const finalRef = projectRef ? `${projectRef} - ${item.ref}` : item.ref;
      
      this.showToast(`📄 Préparation du plan ${i + 1}/${this.items.length}...`);

      // Load config
      this.applyState(item.state);

      // Assigner la référence au champ du cartouche avant d'ouvrir le plan
      const bpProjectInput = document.getElementById('bp-project');
      if (bpProjectInput) bpProjectInput.value = finalRef;

      // Wait for 3D to update
      await new Promise(r => setTimeout(r, 800));

      // Open blueprint
      if (window.Blueprint) {
        window.Blueprint.open();

        // Wait for rendering
        await new Promise(r => setTimeout(r, 2500));

        // Save to history
        if (window.History) {
          await window.History.save(item.state, finalRef);
        }

        // Récupérer le SVG généré et le cloner dans la file d'impression
        const svgElement = document.querySelector('#blueprint-sheet svg');
        if (svgElement) {
          const pageDiv = document.createElement('div');
          pageDiv.className = 'print-page';
          pageDiv.appendChild(svgElement.cloneNode(true));
          printContainer.appendChild(pageDiv);
        }

        // Close blueprint
        await new Promise(r => setTimeout(r, 500));
        window.Blueprint.close();

        // Wait before next
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Activer le mode impression multi-pages
    document.body.classList.add('print-multi-mode');
    
    // Lancer la boîte de dialogue d'impression une seule fois pour tout le panier
    window.print();
    
    // Nettoyer après l'impression
    document.body.classList.remove('print-multi-mode');
    if (printContainer.parentNode) {
      printContainer.parentNode.removeChild(printContainer);
    }

    // Vider le panier
    this.items = [];
    this.save();
    this.renderCartItems();
    this.updateBadge();
    if (projectRefInput) projectRefInput.value = '';

    this.showToast(`✅ Panier terminé avec succès !`);
  },

  // ──────────────────────────────────────────
  //  PERSISTANCE localStorage
  // ──────────────────────────────────────────
  save() {
    try {
      localStorage.setItem('lynka_cart', JSON.stringify(this.items));
    } catch(e) { console.warn('Cart save failed:', e); }
  },

  load() {
    try {
      const raw = localStorage.getItem('lynka_cart');
      if (raw) this.items = JSON.parse(raw);
    } catch(e) { this.items = []; }
    this.updateBadge();
  },

  // ──────────────────────────────────────────
  //  UI — BADGE & PANNEAU
  // ──────────────────────────────────────────
  updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
      badge.textContent = this.items.length;
      badge.style.display = this.items.length > 0 ? 'flex' : 'none';
    }
  },

  openPanel() {
    this._panelOpen = true;
    const panel = document.getElementById('cart-panel');
    if (panel) {
      panel.classList.add('open');
      this.switchTab(this._activeTab);
    }
  },

  closePanel() {
    this._panelOpen = false;
    const panel = document.getElementById('cart-panel');
    if (panel) panel.classList.remove('open');
  },

  togglePanel() {
    if (this._panelOpen) this.closePanel();
    else this.openPanel();
  },

  switchTab(tab) {
    this._activeTab = tab;
    document.querySelectorAll('.cart-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.cart-tab-content').forEach(el => {
      el.style.display = el.dataset.tab === tab ? 'flex' : 'none';
    });
    if (tab === 'cart') this.renderCartItems();
    if (tab === 'history' && window.History) window.History.renderList();
  },

  renderCartItems() {
    const container = document.getElementById('cart-items-list');
    if (!container) return;

    if (this.items.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="color:#4b5563; margin-bottom: 12px;">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <p style="color:#6b7280; font-size:13px; text-align:center;">Aucune configuration dans le panier.<br>Configurez un plan et cliquez sur <strong style="color:#a78bfa;">+ Ajouter</strong>.</p>
        </div>`;
      return;
    }

    container.innerHTML = this.items.map((item, i) => {
      const date = new Date(item.addedAt);
      const dateStr = date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
      const s = item.state;
      return `
        <div class="cart-item" data-id="${item.id}">
          <div class="cart-item-header">
            <span class="cart-item-index">${i + 1}</span>
            <div class="cart-item-ref">${item.ref}</div>
            <button class="cart-item-delete" onclick="Cart.remove('${item.id}')" title="Supprimer">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="cart-item-details">
            <span>📐 ${Math.round(s.length * 10)}mm · ${s.nbCuves || 1} cuve(s)</span>
            <span>🎨 ${s.finition || '-'} · ${s.support || 'SANS'}</span>
            <span style="color:#6b7280; font-size:11px;">🕒 ${dateStr}</span>
          </div>
          <div class="cart-item-actions">
            <button class="cart-btn-load" onclick="Cart.loadConfig('${item.id}')">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Charger
            </button>
            <button class="cart-btn-plan" onclick="Cart._printSingle('${item.id}')">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
              Plan
            </button>
          </div>
        </div>`;
    }).join('');
  },

  async _printSingle(id) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    this.applyState(item.state);
    await new Promise(r => setTimeout(r, 800));
    this.closePanel();

    if (window.Blueprint) {
      window.Blueprint.open();
      await new Promise(r => setTimeout(r, 2500));
      if (window.History) await window.History.save(item.state, item.ref);
      window.print();
    }
  },

  // ──────────────────────────────────────────
  //  TOAST
  // ──────────────────────────────────────────
  showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    if (toast && toastMsg) {
      toastMsg.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
  },

  // ──────────────────────────────────────────
  //  INIT
  // ──────────────────────────────────────────
  init() {
    this.load();

    // Cart toggle button
    document.getElementById('btn-cart')?.addEventListener('click', () => this.togglePanel());

    // Close panel on backdrop click
    document.getElementById('cart-backdrop')?.addEventListener('click', () => this.closePanel());

    // Tab buttons
    document.querySelectorAll('.cart-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Add to cart from configurator
    document.getElementById('btn-add-to-cart')?.addEventListener('click', () => {
      if (window.state) this.add(window.state);
    });

    // Print all
    document.getElementById('btn-cart-print-all')?.addEventListener('click', () => this.printAll());

    // Print all from blueprint sidebar
    document.getElementById('btn-bp-print-all')?.addEventListener('click', () => this.printAll());

    // Hook into blueprint print to auto-save to history
    const origPrint = window.Blueprint?.print?.bind(window.Blueprint);
    if (origPrint && window.Blueprint) {
      window.Blueprint.print = function() {
        if (window.History) window.History.save(window.state, Cart.generateRef(window.state));
        origPrint();
      };
    }
  }
};

window.Cart = Cart;
