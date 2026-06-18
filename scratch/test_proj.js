const THREE = require('three');

// Simulate the OrthographicCamera bounds
const camera = new THREE.OrthographicCamera(-1, 1, 0.57, -0.57, 0.1, 100);
camera.position.set(0, 0.57, 2.0);
camera.lookAt(0, 0.57, 0);
camera.updateMatrixWorld();

// Project a point at world y = 0
const p0 = new THREE.Vector3(0, 0, 0);
p0.project(camera);

// Project a point at world y = 1.14
const p1 = new THREE.Vector3(0, 1.14, 0);
p1.project(camera);

// Project a point at world y = 0.57
const p2 = new THREE.Vector3(0, 0.57, 0);
p2.project(camera);

console.log("Point y=0 projects to:", p0.y);
console.log("Point y=0.57 projects to:", p2.y);
console.log("Point y=1.14 projects to:", p1.y);
