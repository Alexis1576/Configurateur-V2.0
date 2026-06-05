const fs = require('fs');
const fbx = fs.readFileSync('3D - Morth Targets/VO390/VO390_1.fbx', 'utf8');
const names = fbx.match(/Model: (\d+), "Model::([^"]+)"/g);
if (names) {
  console.log(names.map(n => n.split('::')[1].replace('"','')).filter(n => n.includes('Bone') || n.includes('Rive')).join('\n'));
}

