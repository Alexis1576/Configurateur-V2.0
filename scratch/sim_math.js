const halfLength = 910;
const plageGaucheMm = 108;
const gapMm = 217;
const cLengthMm = 390;

const basePos = { x: -300 }; // assumption
const displacement = 90; // halfLength - 820
const boneG_position_x = basePos.x - displacement; // -390

for (let i = 0; i < 2; i++) {
    const cuve1X = -halfLength + plageGaucheMm + i * (cLengthMm + gapMm) + cLengthMm / 2;
    const cuve2X = cuve1X + cLengthMm + gapMm;
    const centerX = (cuve1X + cuve2X) / 2;

    const isLeft = centerX < 0;
    const srcBoneX = isLeft ? boneG_position_x : (basePos.x + displacement); // symmetric roughly
    
    const refX = isLeft ? -halfLength : halfLength;
    const deltaX = centerX - refX;
    const targetX = srcBoneX + deltaX;
    
    console.log(`i=${i}, isLeft=${isLeft}, centerX=${centerX}, deltaX=${deltaX}, targetX=${targetX}`);
}
