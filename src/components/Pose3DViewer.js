import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Grid, PerspectiveCamera, Plane } from '@react-three/drei';

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

  const leftFoot = keypoints[27]; // Left ankle
  const rightFoot = keypoints[28]; // Right ankle
  const footY = Math.min(leftFoot?.y ?? 0, rightFoot?.y ?? 0); // Get foot Y position
  const translateY = Math.abs(footY); // Ensure skeleton is grounded
  const adjustedJoints = joints.map(([x, y, z]) => [x, y + translateY, z]);

  return (
    <>
      {adjustedJoints.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      ))}

      {BLAZEPOSE_ADJACENT_PAIRS.map(([i, j], idx) => {
        if (keypoints[i]?.score > 0.5 && keypoints[j]?.score > 0.5) {
          return <Line key={idx} points={[adjustedJoints[i], adjustedJoints[j]]} color="cyan" lineWidth={3} />;
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

  // FPS Calculation
  const [fps, setFps] = useState(0);
  const lastFrameTimeRef = useRef(0);
  const frameCountRef = useRef(0);

  useEffect(() => {
    const updateFPS = (timestamp) => {
      if (lastFrameTimeRef.current) {
        const deltaTime = timestamp - lastFrameTimeRef.current;
        if (deltaTime > 1000) {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
          lastFrameTimeRef.current = timestamp;
        }
      } else {
        lastFrameTimeRef.current = timestamp;
      }
      frameCountRef.current += 1;
      requestAnimationFrame(updateFPS);
    };

    requestAnimationFrame(updateFPS);
  }, []);

  return (
    <div style={{ width: '100%', height: '500px', marginTop: '1rem', backgroundColor, position: 'relative' }}>
      <Canvas style={{ background: backgroundColor }} shadows>
        {/* Camera with default position */}
        <PerspectiveCamera makeDefault position={[0, 0.3, 1.5]} fov={75} />
        
        {/* Lights for scene */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[0, 2, 2]} intensity={1} castShadow />
        
        {/* Floor/Plane to make the skeleton appear on the ground */}
        <Plane args={[10, 10]} position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <meshStandardMaterial color={darkMode ? '#444' : '#ccc'} />
        </Plane>

        {/* Grid Helper */}
        <Grid args={[5, 5]} cellColor={gridColor} sectionColor={sectionColor} />
        
        {/* Axes Helper for orientation */}
        <axesHelper args={[1]} />
        
        {/* OrbitControls for user interactivity */}
        <OrbitControls enablePan enableZoom enableRotate />
        
        {/* Pose skeleton rendering */}
        <Keypoints3DSkeleton keypoints={keypoints3D} />
      </Canvas>

      {/* Display FPS */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
        color: darkMode ? 'white' : 'black',
        padding: '5px 10px',
        borderRadius: '5px',
        fontSize: '16px',
      }}>
        FPS: {fps}
      </div>
    </div>
  );
};

export default Pose3DViewer;
