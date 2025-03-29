// Pose3DViewer.js
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Grid, PerspectiveCamera } from '@react-three/drei';

const BLAZEPOSE_ADJACENT_PAIRS = [
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [11, 12], [11, 13], [13, 15],
  [15, 17], [12, 14], [14, 16], [16, 18],
  [11, 23], [12, 24], [23, 24], [23, 25],
  [24, 26], [25, 27], [27, 29], [26, 28],
  [28, 30], [29, 31], [30, 32]
];

const Keypoints3DSkeleton = ({ keypoints }) => {
  if (!keypoints) return null;
  const joints = keypoints.map(kp => [kp.x, -kp.y, -kp.z]);

  return (
    <>
      {joints.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.015, 16, 16]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      ))}

      {BLAZEPOSE_ADJACENT_PAIRS.map(([i, j], idx) => {
        if (keypoints[i]?.score > 0.5 && keypoints[j]?.score > 0.5) {
          return <Line key={idx} points={[joints[i], joints[j]]} color="cyan" lineWidth={2} />;
        }
        return null;
      })}
    </>
  );
};

const Pose3DViewer = ({ keypoints3D, darkMode }) => {
  const backgroundColor = darkMode ? '#111' : '#fff';
  const gridColor = darkMode ? '#444' : '#ccc';
  const sectionColor = darkMode ? '#666' : '#aaa';

  return (
    <div style={{ width: '100%', height: '400px', marginTop: '1rem', backgroundColor }}>
      <Canvas style={{ background: backgroundColor }} shadows>
        <PerspectiveCamera makeDefault position={[0, 0.2, 1]} fov={75} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[0, 2, 2]} intensity={1} castShadow />
        <Grid args={[2, 2]} cellColor={gridColor} sectionColor={sectionColor} />
        <axesHelper args={[1]} />
        <OrbitControls enablePan enableZoom enableRotate />
        <Keypoints3DSkeleton keypoints={keypoints3D} />
      </Canvas>
    </div>
  );
};

export default Pose3DViewer;