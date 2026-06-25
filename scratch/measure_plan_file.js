const fs = require('fs');
const THREE = require('three');
const { FBXLoader } = require('three/examples/jsm/loaders/FBXLoader.js');
const { JSDOM } = require('jsdom');
const { window } = new JSDOM();
global.window = window;
global.document = window.document;

const loader = new FBXLoader();
const buffer = fs.readFileSync('c:/Users/asamu/Desktop/Configurateur V2/3D - Morth Targets/120_C_VAS/120_C_VAS_Plan.fbx');
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

loader.parse(arrayBuffer, '', (fbx) => {
    const box = new THREE.Box3().setFromObject(fbx);
    const size = new THREE.Vector3();
    box.getSize(size);
    fs.writeFileSync('c:/Users/asamu/Desktop/Configurateur V2/scratch/plan_size.txt', `Size Y: ${size.y}`);
});
