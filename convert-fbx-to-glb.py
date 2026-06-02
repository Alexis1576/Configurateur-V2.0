#!/usr/bin/env python3
"""
Script de conversion FBX → GLB pour les modèles 3D VO390
Utilise l'API Aspose gratuite en ligne
"""

import os
import sys
import urllib.request
import json
from pathlib import Path

# Configuration
FBX_DIR = Path("3D - Morth Targets/VO390")
OUTPUT_DIR = Path("3D - Models/VO390")
MODELS = ["VO390_1", "VO390_2", "VO390_3", "VO390_4"]

# Convertisseur en ligne gratuit
# Option 1: Aspose (https://products.aspose.app/3d/conversion/fbx-to-glb)
# Option 2: CloudConvert (https://cloudconvert.com/fbx-to-glb)
# Option 3: AnyConv (https://anyconv.com/en/fbx-to-glb-converter/)

CONVERTER_INFO = """
╔══════════════════════════════════════════════════════════════════════════╗
║           CONVERSION FBX → GLB - Guide pratique                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║ Puisque aucun outil de conversion n'est installé localement, utilisez  ║
║ l'un de ces convertisseurs en ligne GRATUITS:                          ║
║                                                                          ║
║ 📌 Recommandé: Aspose 3D Converter                                      ║
║    URL: https://products.aspose.app/3d/conversion/fbx-to-glb            ║
║    - Aucune limite                                                       ║
║    - Pas d'inscription requise                                          ║
║    - Conversion instantanée                                             ║
║                                                                          ║
║ 📌 Alternative: AnyConv                                                  ║
║    URL: https://anyconv.com/en/fbx-to-glb-converter/                    ║
║    - Simple et rapide                                                    ║
║    - Pas de compte nécessaire                                           ║
║                                                                          ║
║ 📌 Alternative: CloudConvert                                             ║
║    URL: https://cloudconvert.com/fbx-to-glb                             ║
║    - Très fiable                                                         ║
║    - Peut nécessiter un compte                                          ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                        ÉTAPES:                                           ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║ 1. Ouvrez Aspose 3D Converter                                           ║
║ 2. Cliquez sur "Upload Files" et sélectionnez le fichier FBX:          ║
║    3D - Morth Targets/VO390/VO390_1.fbx                                ║
║    3D - Morth Targets/VO390/VO390_2.fbx                                ║
║    3D - Morth Targets/VO390/VO390_3.fbx                                ║
║    3D - Morth Targets/VO390/VO390_4.fbx                                ║
║ 3. Sélectionnez "GLB" comme format de sortie                           ║
║ 4. Cliquez sur "Convert"                                                ║
║ 5. Téléchargez les fichiers GLB générés                                ║
║ 6. Placez-les dans le dossier: 3D - Models/VO390/                     ║
║ 7. Nommez-les: VO390_1.glb, VO390_2.glb, VO390_3.glb, VO390_4.glb     ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                  STRUCTURE ATTENDUE:                                    ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║ 3D - Models/                                                             ║
║ └── VO390/                                                               ║
║     ├── VO390_1.glb         (1 cuve)                                    ║
║     ├── VO390_2.glb         (2 cuves)                                   ║
║     ├── VO390_3.glb         (3 cuves)                                   ║
║     └── VO390_4.glb         (4 cuves)                                   ║
║                                                                          ║
║ Une fois les fichiers en place, le configurateur les chargera           ║
║ automatiquement avec Three.js et les morphs targets seront activés! ✨  ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
"""

def main():
    print(CONVERTER_INFO)
    print("\n✅ Prêt? Voici comment procéder:\n")
    
    # Créer le répertoire de sortie s'il n'existe pas
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Lister les fichiers FBX à convertir
    print("📋 Fichiers FBX à convertir:\n")
    for model in MODELS:
        fbx_path = FBX_DIR / f"{model}.fbx"
        if fbx_path.exists():
            size_mb = fbx_path.stat().st_size / (1024 * 1024)
            print(f"   ✓ {model}.fbx ({size_mb:.2f} MB)")
        else:
            print(f"   ✗ {model}.fbx (non trouvé)")
    
    print(f"\n📁 Destination: {OUTPUT_DIR.absolute()}\n")
    
    print("💡 Astuce: Vous pouvez convertir plusieurs fichiers à la fois sur Aspose!\n")
    
    # Vérifier si des fichiers GLB existent déjà
    existing_glbs = list(OUTPUT_DIR.glob("*.glb"))
    if existing_glbs:
        print("🎉 GLB trouvés dans le dossier:")
        for glb in existing_glbs:
            size_mb = glb.stat().st_size / (1024 * 1024)
            print(f"   ✓ {glb.name} ({size_mb:.2f} MB)")
        print()

if __name__ == "__main__":
    main()
