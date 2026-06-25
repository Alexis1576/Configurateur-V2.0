const THREE = require('three');

const scene = new THREE.Scene();
const current3DObject = new THREE.Group();
scene.add(current3DObject);

const supportModel = new THREE.Group();
supportModel.scale.set(0.01, 0.01, 0.01);
current3DObject.add(supportModel);

const boneG = new THREE.Bone();
boneG.position.set(-820, 0, 0); // initial base pos
supportModel.add(boneG);

const srcMesh = new THREE.Mesh();
boneG.add(srcMesh);

const clonedObj = new THREE.Mesh();
supportModel.add(clonedObj);

// Simulate slider drag to 182
const state = { longueur: 182 };
const baseHalfLength = 820;
const halfLength = state.longueur * 10 / 2; // 910
const scaleX = state.longueur / 164; // 182/164 = 1.109756
current3DObject.scale.x = scaleX;

const displacement = halfLength - baseHalfLength; // 90
boneG.position.x = -820 - displacement; // -910

scene.updateMatrixWorld(true);

// Now apply my cloning logic
supportModel.updateMatrixWorld(true);
const meshWorldMatrix = srcMesh.matrixWorld.clone();
const invSupportMatrix = new THREE.Matrix4().copy(supportModel.matrixWorld).invert();
const localMatrix = invSupportMatrix.multiply(meshWorldMatrix);
localMatrix.decompose(clonedObj.position, clonedObj.quaternion, clonedObj.scale);

const centerX = -303.5;
const isLeft = true;
const refX = isLeft ? -halfLength : halfLength; // -910
const deltaX = centerX - refX; // -303.5 - (-910) = 606.5

clonedObj.position.x += deltaX;

scene.updateMatrixWorld(true);

console.log("boneG local pos:", boneG.position.x);
console.log("boneG world pos X:", new THREE.Vector3().setFromMatrixPosition(boneG.matrixWorld).x);
console.log("srcMesh world pos X:", new THREE.Vector3().setFromMatrixPosition(srcMesh.matrixWorld).x);
console.log("clonedObj local pos X:", clonedObj.position.x);
console.log("clonedObj world pos X:", new THREE.Vector3().setFromMatrixPosition(clonedObj.matrixWorld).x);

// Where should it be visually?
console.log("Target visual X (world):", centerX * 0.01 * scaleX);
