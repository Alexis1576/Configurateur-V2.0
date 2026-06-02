# 🎛️ Configurateur Vasques LYNKA - Guide d'utilisation

## 📋 Vue d'ensemble

Le Configurateur Vasques LYNKA est une application web interactive qui permet de configurer des vasques personnalisées. L'application charge dynamiquement ses données depuis un **Google Sheet public** et met à jour l'interface en temps réel.

---

## 🚀 Lancement

Ouvrez le fichier `index.html` dans un navigateur web:
```
Configurateur V2/index.html
```

L'application se chargera automatiquement et récupérera les données du Google Sheet.

---

## 📊 Flux de configuration

### Étape 1: Dimensions
**Personnalisez votre modèle et les proportions**

1. **Modèle de cuve** - Sélectionnez parmi les modèles disponibles du Sheet:
   - Type de plan vasque
   - LYNKA-JB
   - LYNKA-JLB
   - LYNKA-JT
   - LYNKA-JLT
   - VO390
   - VR450
   - VRO360

2. **Nombre de cuves** (si applicable) - Choisissez entre 1 et 8 cuves

3. **Longueur** - Ajustez de 40 à 160 cm (par défaut 80 cm)

4. **Profondeur** - Ajustez de 30 à 65 cm (par défaut 45 cm)

5. **Hauteur cuve** - Ajustez de 8 à 22 cm (par défaut 14 cm)

→ Cliquez sur **"Suivant — Finition"** pour continuer

### Étape 2: Finition
**Choisissez la couleur du Vkorr**

- **Blanc Mat** (défaut) - Finition classique
- **Béton** - Aspect industriel
- **Noir** - Finition sombre élégante

→ Cliquez sur **"Suivant — Options"** pour continuer

### Étape 3: Options
**Configurez les détails finaux**

1. **Configuration des murs** - Choisissez l'environnement:
   - Sans mur
   - Entre murs
   - Mur à gauche
   - Mur à droite

2. **Avec trop-plein** - Toggle pour la sécurité débordement (activé par défaut)

3. **Crédence** - Sélectionnez le type de finition murale:
   - Aucune (défaut)
   - Type C
   - Type P
   - Type M
   - Type T

---

## 💾 Résumé et référence

Le panneau droit affiche en temps réel:

- **Référence LYNKA** - Code unique basé sur votre sélection
  - Format: `LYNKA-[Model][-STP si sans trop-plein]`
  - Exemple: `LYNKA-JLB`, `LYNKA-VO390-STP`

- **Modèle Base** - Le modèle sélectionné

- **Trop-plein** - Avec/Sans

- **Nb Cuves** - Nombre de cuves (si applicable)

- **Murs** - Configuration environnement

- **Crédence** - Type de crédence sélectionnée

- **Morph Targets** - Valeurs de morphing pour la 3D (futur)

---

## 🔄 Mise à jour du catalogue

Les modèles et paramètres sont chargés depuis le **Google Sheet** suivant:

```
https://docs.google.com/spreadsheets/d/1atF6VK20aO1ONcRJFAuEK5VrqeTzwhl2VKbotdRhBBM/
Onglet: Paramètres (gid=943156125)
```

**Pour ajouter/modifier des modèles:**
1. Ouvrez le Google Sheet
2. Ajoutez une ligne avec:
   - Col A: Nom du modèle
   - Col B: URL de l'image
   - Col C: "Plusieurs" ou "1" (pour nombre de cuves)
3. Rafraîchissez la page (F5) - Les changements apparaîtront automatiquement ✨

---

## 🎨 Personnalisation

### Modifier les sliders
**Fichier:** `index.html` (lignes ~160)

```html
<input type="range" class="slider" id="slider-length" min="40" max="160" value="80" step="1" />
```

- `min`: Valeur minimale
- `max`: Valeur maximale
- `value`: Valeur par défaut
- `step`: Pas d'incrémentation

### Ajouter des couleurs
**Fichier:** `index.html` (section Finition)

```html
<label class="finish-card" for="fin-nouvelle">
  <input type="radio" name="finition" id="fin-nouvelle" value="nouvelle" />
  <div class="finish-swatch" style="background: #COULEUR;"></div>
  <span class="finish-name">Nom Couleur</span>
  <div class="finish-check">✓</div>
</label>
```

### Ajuster le design
**Fichier:** `style.css`

Variables principales:
```css
:root {
  --accent: #7c6ef5;        /* Couleur principale */
  --bg: #080b12;            /* Fond sombre */
  --text-1: #f0f2f7;        /* Texte principal */
  --text-2: #8892a4;        /* Texte secondaire */
}
```

---

## 🔧 Architecture technique

### Stack
- **Frontend:** HTML5, CSS3, JavaScript Vanilla
- **Source de données:** Google Sheets (API publique)
- **Pas de dépendances:** Pur JavaScript, pas de frameworks

### Fichiers clés

#### `index.html`
- Structure HTML
- 3 sections (Dimensions, Finition, Options)
- 3 panneaux (Gauche, Centre, Droite)

#### `app.js` (Principal)
- Récupération Google Sheets
- Gestion de l'état (state object)
- Event listeners
- Mise à jour dynamique UI
- Génération des références

#### `style.css`
- Design system complet
- Variables CSS
- Responsive layout (3 panneaux)
- Animations et transitions

---

## 🐛 Dépannage

### Le catalogue ne se charge pas
1. Vérifiez la connexion Internet
2. Ouvrez la console (F12) et vérifiez les erreurs
3. Vérifiez que l'URL du Sheet est correcte dans `app.js`

### L'image ne s'affiche pas
1. Vérifiez que l'URL de l'image dans le Sheet est valide
2. Assurez-vous que le lien est accessible publiquement
3. Vérifiez la colonne B du Google Sheet

### Les données ne se mettent pas à jour
1. Appuyez sur F5 pour recharger la page
2. Vérifiez que le Google Sheet n'est pas en édition privée
3. Vérifiez le `gid` du Sheet dans `app.js`

---

## 📱 Responsive

L'application s'adapte à tous les écrans:
- **Desktop:** Layout 3 colonnes (Gauche, Centre, Droite)
- **Tablet:** Layout adapté
- **Mobile:** Layout empilé (en développement)

---

## 📝 Notes

- Toutes les données sont en local (pas de serveur backend)
- Les modifications ne sont pas sauvegardées (pour un devis, exporter le PDF)
- La génération de devis est en développement

---

## 🎓 Exemple d'utilisation complète

1. Ouvrez `index.html`
2. Sélectionnez le modèle **"LYNKA-JLB"**
3. Changez le nombre de cuves à **"3"**
4. Modifiez la longueur à **"120 cm"**
5. Allez à l'étape **Finition** et choisissez **"Béton"**
6. Allez à l'étape **Options** et sélectionnez **"Entre murs"** et **"Type C"** pour la crédence
7. Consultez la **Référence LYNKA** générée: `LYNKA-JLB` (avec les paramètres)

**Résultat:** Une vasque LYNKA-JLB en Béton, 3 cuves, entre murs, avec crédence Type C ✨

---

**Besoin d'aide?** Contactez l'équipe de développement.  
**Dernière mise à jour:** 2 juin 2026
