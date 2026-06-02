# Configurateur LYNKA — Instructions

Test local rapide

- Démarrer un serveur HTTP depuis la racine du projet :

```bash
python -m http.server 8000
# puis ouvrir http://localhost:8000

# ou (Node) :
npx http-server -c-1 -p 8000
```

Pourquoi : ouvrir `index.html` directement (`file://`) empêche le chargement des modules ES et du GLB (CORS / origine null). Servez le dossier via HTTP pour corriger l'affichage 3D.

Déploiement public (options)

- GitHub Pages :
  1. Initialisez un repo local et poussez sur GitHub (`git remote add origin ... && git push -u origin main`).
  2. Dans les settings du dépôt, activez GitHub Pages (source : branch `main` / root).

- Netlify / Vercel :
  - Connectez votre dépôt GitHub et déployez (site statique). Glissez/déposez le dossier build si vous préférez.

Remarques
- Les assets `3D - Models/VO390/*.glb` sont présents et référencés par `3d-viewer.js`.
- Si vous voulez, je peux créer un workflow GitHub Actions pour déployer automatiquement sur GitHub Pages.
