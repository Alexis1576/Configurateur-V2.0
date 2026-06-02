# 🎬 Intégration 3D avec Three.js - Guide d'implémentation

**Date:** 2 juin 2026  
**Statut:** ✅ Implémentation préparée, en attente de fichiers GLB

---

## 📋 Vue d'ensemble

L'intégration 3D du configurateur LYNKA utilise:
- **Three.js** pour le rendu 3D interactif
- **Morph Targets** pour la déformation en temps réel
- **GLB/GLTF** comme format de fichier 3D

### Modèles supportés
- ✅ **VO390** - Modèle 3D avec support complet (1-4 cuves)
- 📋 **LYNKA-JB, JLB, JT, JLT, VR450, VRO360** - À implémenter

---

## 🚀 Mise en place - Étape 1: Convertir les FBX en GLB

### Fichiers source
Les fichiers FBX sont localisés ici:
```
c:\Users\asamu\Desktop\Configurateur V2\3D - Morth Targets\VO390\
├── VO390_1.fbx (1 cuve)
├── VO390_2.fbx (2 cuves)
├── VO390_3.fbx (3 cuves)
└── VO390_4.fbx (4 cuves)
```

### Outils de conversion (gratuits)

#### 🥇 Recommandé: Aspose 3D Converter
- **URL:** https://products.aspose.app/3d/conversion/fbx-to-glb
- **Avantages:**
  - Aucune limite de fichiers
  - Pas d'inscription requise
  - Conversion instantanée
  - Préserve les Morph Targets

**Étapes:**
1. Ouvrez https://products.aspose.app/3d/conversion/fbx-to-glb
2. Cliquez sur "Upload Files"
3. Sélectionnez **VO390_1.fbx** → **VO390_4.fbx** (tous les 4)
4. Sélectionnez **GLB** comme format de sortie
5. Cliquez sur "Convert"
6. Téléchargez les fichiers générés

#### Alternative: AnyConv
- **URL:** https://anyconv.com/en/fbx-to-glb-converter/
- Simple et rapide
- Pas de compte nécessaire

#### Alternative: CloudConvert
- **URL:** https://cloudconvert.com/fbx-to-glb
- Très fiable
- Peut nécessiter un compte

### Structure de sortie
Une fois les fichiers convertis, placez-les ici:
```
c:\Users\asamu\Desktop\Configurateur V2\3D - Models\VO390\
├── VO390_1.glb
├── VO390_2.glb
├── VO390_3.glb
└── VO390_4.glb
```

---

## 🎨 Architecture 3D

### Hiérarchie du projet
```
Configurateur V2/
├── index.html                (HTML)
├── app.js                    (Logique principale + intégration 3D)
├── 3d-viewer.js             (Module Three.js - NEW)
├── style.css                (Design + CSS 3D)
├── 3D - Morth Targets/      (Source FBX)
│   └── VO390/
│       ├── VO390_1.fbx
│       ├── VO390_2.fbx
│       ├── VO390_3.fbx
│       └── VO390_4.fbx
└── 3D - Models/             (Destination GLB - À créer)
    └── VO390/
        ├── VO390_1.glb      ← À télécharger
        ├── VO390_2.glb      ← À télécharger
        ├── VO390_3.glb      ← À télécharger
        └── VO390_4.glb      ← À télécharger
```

### Fichiers implémentés

#### 1. **3d-viewer.js** (NOUVEAU)
Module JavaScript qui gère:
- Initialisation Three.js
- Chargement des modèles GLB
- Gestion des Morph Targets
- Contrôles OrbitControls (Rotation/Zoom)
- Éclairage et rendu

```javascript
class VO390Viewer {
  // Initialisation Three.js
  constructor(containerElementId)
  
  // Charger le modèle GLB approprié
  async loadModel(nbCuves)
  
  // Mettre à jour les morphs targets
  updateMorphTargets(length, depth, height)
  
  // Contrôles
  resetView()
  screenshot()
  setAutoRotate(enabled)
}
```

#### 2. **app.js** (MODIFIÉ)
Modifications pour l'intégration 3D:
- `updateMorphTargets()` - Mise à jour en temps réel des morphs
- `updateVisuals()` - Détection VO390 et chargement du modèle 3D
- `initializeViewer3D()` - Initialisation du viewer Three.js
- Contrôles des boutons 3D (Reset, Screenshot)

#### 3. **index.html** (MODIFIÉ)
Changements:
- `<script type="module" src="3d-viewer.js">` - Charge Three.js via CDN
- `<div id="viewer-canvas">` - Remplace l'ancien viewer image
- Boutons de contrôle 3D (Réinitialiser, Télécharger)

#### 4. **style.css** (MODIFIÉ)
Nouveaux styles:
- `.viewer-controls` - Conteneur des boutons 3D
- `#btn-3d-reset`, `#btn-3d-screenshot` - Boutons interactifs
- Mise en place pour le rendu Three.js

---

## 🎮 Fonctionnalités 3D

### Interaction utilisateur

#### 1. **Rotation et Zoom**
- **Souris:** Clic + Glisser pour tourner
- **Scroll:** Molette pour zoomer
- **Double-clic:** Réinitialiser la vue

#### 2. **Déformation en temps réel**
- **Sliders Longueur/Profondeur/Hauteur** affectent directement le modèle 3D
- Les Morph Targets se déforment en continu

#### 3. **Sélection du nombre de cuves**
- VO390_1.glb ← 1 cuve sélectionnée
- VO390_2.glb ← 2 cuves sélectionnées
- VO390_3.glb ← 3 cuves sélectionnées
- VO390_4.glb ← 4 cuves sélectionnées

#### 4. **Boutons de contrôle**
- 🔄 **Réinitialiser** - Revenir à la vue par défaut
- 📷 **Télécharger** - Exporter le modèle en PNG

### Mode d'affichage

**Avant VO390 sélectionné:**
```
[Image Odoo depuis Google Sheet]
Badge: "Aperçu Photo Odoo (Connecté Google Sheets)"
Boutons 3D: masqués
```

**Après VO390 sélectionné:**
```
[Modèle 3D interactif avec Three.js]
Badge: "Aperçu 3D Interactif (Three.js - Connecté Google Sheets)"
Boutons 3D: visibles (Réinitialiser, Télécharger)
```

---

## ⚙️ Données Morphs Targets

### Valeurs normalisées (0-1)

Les morphs targets fonctionnent en récupérant les valeurs des sliders et les normalisent:

```javascript
// Longueur: 40-160 cm → 0-1
lengthNorm = (state.length - 40) / (160 - 40)

// Profondeur: 30-65 cm → 0-1
depthNorm = (state.depth - 30) / (65 - 30)

// Hauteur: 8-22 cm → 0-1
heightNorm = (state.height - 8) / (22 - 8)
```

### Mapping des morphs targets

Le fichier GLB doit contenir des Morph Targets nommés:
- `length`, `Length`, `LONGUEUR`, etc. → Pour la déformation de longueur
- `depth`, `Depth`, `PROFONDEUR`, etc. → Pour la déformation de profondeur
- `height`, `Height`, `HAUTEUR`, etc. → Pour la déformation de hauteur

Le matcher est insensible à la casse et tolère les accents.

---

## 🔧 Configuration

### Vérification des fichiers

Avant de tester, vérifiez que la structure est correcte:

```
✓ index.html existe
✓ app.js existe (modifié)
✓ 3d-viewer.js existe (NOUVEAU)
✓ style.css existe (modifié)
✓ 3D - Models/VO390/ existe (À créer)
✓ VO390_1.glb téléchargé
✓ VO390_2.glb téléchargé
✓ VO390_3.glb téléchargé
✓ VO390_4.glb téléchargé
```

### Import Three.js

Le module 3d-viewer.js charge Three.js depuis CDN:
```javascript
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@r128/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@r128/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@r128/examples/jsm/controls/OrbitControls.js';
```

Aucune installation requise! CDN gère tout.

---

## 🧪 Tests

### Test 1: Charger le configurateur
```
1. Ouvrez index.html
2. Vérifiez que "Type de plan vasque" est sélectionné
3. L'image Odoo s'affiche (ou le loader)
```

### Test 2: Sélectionner VO390
```
1. Changez le modèle en VO390
2. Sélectionnez 1 cuve
3. Vérifiez que le modèle 3D VO390_1.glb se charge
4. Le badge affiche "Aperçu 3D Interactif"
5. Les boutons de contrôle apparaissent
```

### Test 3: Déformation Morphs Targets
```
1. Déplacez le slider Longueur (40-160 cm)
2. Vérifiez que le modèle 3D se déforme en temps réel
3. Répétez avec Profondeur et Hauteur
```

### Test 4: Changer le nombre de cuves
```
1. Sélectionnez 2 cuves
2. Vérifiez que VO390_2.glb se charge
3. Vérifiez que le modèle a bien 2 cuves
4. Répétez pour 3 et 4 cuves
```

### Test 5: Contrôles 3D
```
1. Cliquez sur le bouton Réinitialiser
2. Vérifiez que la vue revient à l'angle par défaut
3. Cliquez sur Télécharger
4. Vérifiez que une image PNG se télécharge
```

---

## 🎯 Prochaines étapes

### Court terme (1-2 semaines)
1. ✅ Convertir FBX → GLB
2. ✅ Placer les GLB dans 3D - Models/VO390/
3. ✅ Tester tous les modèles VO390 (1-4 cuves)
4. ✅ Vérifier les Morphs Targets et la déformation

### Moyen terme (1 mois)
1. Ajouter support 3D pour LYNKA-JB, JLB, JT, JLT
2. Convertir tous les modèles en GLB
3. Implémenter les Morphs Targets pour les autres modèles
4. Optimiser le rendu (compression, LOD)

### Long terme (2-3 mois)
1. Animation de transition entre les modèles
2. Export 3D (GLB, STL, OBJ)
3. AR preview (WebAR)
4. Intégration avec devis PDF (rendu 3D dans PDF)

---

## 📝 Checklist d'implémentation

- [x] Créer module 3d-viewer.js avec Three.js
- [x] Intégrer 3d-viewer.js dans app.js
- [x] Modifier updateVisuals() pour charger les modèles 3D
- [x] Ajouter updateMorphTargets() pour déformation en temps réel
- [x] Ajouter contrôles (OrbitControls, Reset, Screenshot)
- [x] Ajouter CSS pour les boutons 3D
- [x] Modifier HTML pour le viewer 3D
- [ ] **FAIRE:** Convertir FBX → GLB (Aspose)
- [ ] **FAIRE:** Placer GLB dans 3D - Models/VO390/
- [ ] **FAIRE:** Tester VO390 (1-4 cuves)
- [ ] **FAIRE:** Vérifier Morphs Targets

---

## 🆘 Dépannage

### Les modèles 3D ne se chargent pas
- ✓ Vérifiez que les fichiers GLB sont dans le bon dossier
- ✓ Vérifiez que le chemin est correct: `3D - Models/VO390/VO390_X.glb`
- ✓ Ouvrez la console (F12) et vérifiez les erreurs

### Les Morphs Targets ne se déforment pas
- ✓ Vérifiez que le fichier GLB contient les Morphs Targets
- ✓ Vérifiez les noms des Morphs (length, depth, height)
- ✓ Vérifiez la console pour les logs du viewer 3D

### La page est lente
- ✓ Vérifiez la taille des fichiers GLB (< 5 MB recommandé)
- ✓ Utilisez la compression GLB (DRACO)
- ✓ Profitez du caching du navigateur

### Le zoom/rotation ne marche pas
- ✓ Vérifiez que OrbitControls est chargé depuis Three.js
- ✓ Vérifiez que le canvas a le focus
- ✓ Essayez de rechargez la page

---

## 📞 Support

Pour plus d'informations:
- **Three.js Docs:** https://threejs.org/docs/
- **Aspose 3D:** https://products.aspose.app/3d/
- **GLB Format:** https://www.khronos.org/gltf/

---

**État:** ✅ Prêt pour la conversion FBX → GLB

Prochaine étape: Convertir les fichiers FBX en GLB et les placer dans `3D - Models/VO390/`
