const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');
code = code.replace(/import \*/g, '//import *');
code = code.replace(/const \$ =/g, 'const $ = (id) => ({id, style:{}, classList:{add:()=>{}, remove:()=>{}}, addEventListener:()=>{}, dispatchEvent:()=>{}, value:0, min:0, max:100}); //');
code = code.replace(/document.querySelectorAll/g, '(() => [])');
code = code.replace(/new THREE/g, '({Color: class{}, PerspectiveCamera: class{ position={set:()=>{}, copy:()=>{}} }, Scene: class{ background={} }, WebGLRenderer: class{ setSize(){}; setPixelRatio(){}; domElement={} }, DirectionalLight: class{ position={set:()=>{}} }, AmbientLight: class{}, Mesh: class{ position={set:()=>{}}, scale={set:()=>{}} }, PlaneGeometry: class{}, MeshStandardMaterial: class{}, AxesHelper: class{}, Vector3: class{}})');
code += \
async function test() {
  try {
    await fetchCatalogue();
    console.log('Catalogue loaded.');
  } catch (e) {
    console.error('FAILED:', e);
  }
}
test();
\;
fs.writeFileSync('test_run.js', code);

