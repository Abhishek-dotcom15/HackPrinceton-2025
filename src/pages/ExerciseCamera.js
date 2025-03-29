import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import * as poseDetection from '@tensorflow-models/pose-detection';
import Pose3DViewer from '../components/Pose3DViewer'; // Import 3D Viewer
import ReferenceExerciseView from '../components/ReferenceExerciseView'; // Import Reference View

const ExerciseCamera = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [noPerson, setNoPerson] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  const [modelType, setModelType] = useState('movenet'); // Default to MoveNet
  const [keypoints3D, setKeypoints3D] = useState(null); // For 3D Pose Viewer
  const [darkMode, setDarkMode] = useState(true); // Dark mode toggle
  const [useSecondaryWebcam, setUseSecondaryWebcam] = useState(false); // Secondary webcam toggle

  // TensorFlow.js Backend Setup
  useEffect(() => {
    const setupBackend = async () => {
      try {
        await tf.setBackend('webgl');
        await tf.ready();
        setBackendReady(true);
      } catch (err) {
        console.warn('WebGL failed, falling back to CPU');
        await tf.setBackend('cpu');
        await tf.ready();
        setBackendReady(true);
      }
    };
    setupBackend();
  }, []);

  // Pose Detection Logic
  useEffect(() => {
    if (!backendReady) return;

    const runPoseDetection = async () => {
      let detector;

      // Load the selected model (MoveNet or BlazePose)
      if (modelType === 'blazepose') {
        detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.BlazePose,
          {
            runtime: 'mediapipe',
            modelType: 'full',
            enableSmoothing: true,
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/pose',
          }
        );
      } else {
        detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          }
        );
      }

      const detectPose = async () => {
        if (
          webcamRef.current &&
          webcamRef.current.video.readyState === 4 &&
          canvasRef.current
        ) {
          const video = webcamRef.current.video;

          try {
            const poses = await detector.estimatePoses(video);
            const ctx = canvasRef.current.getContext('2d');
            canvasRef.current.width = video.videoWidth;
            canvasRef.current.height = video.videoHeight;
            ctx.clearRect(0, 0, video.videoWidth, video.videoHeight);

            const keypoints = poses?.[0]?.keypoints;

            if (modelType === 'blazepose') {
              const kp3d = poses?.[0]?.keypoints3D;
              setKeypoints3D(kp3d || null);
            }

            if (keypoints && keypoints.length > 0) {
              setNoPerson(false);
              drawKeypoints(keypoints, ctx);
              drawSkeleton(keypoints, ctx, modelType);
            } else {
              setNoPerson(true);
            }
          } catch (err) {
            console.error('Pose estimation error:', err);
          }
        }

        requestAnimationFrame(detectPose);
      };

      detectPose();
    };

    runPoseDetection();
  }, [backendReady, modelType]);

  // Draw Keypoints
  const drawKeypoints = (keypoints, ctx) => {
    keypoints.forEach((keypoint) => {
      if (keypoint && keypoint.score > 0.5) {
        const { x, y } = keypoint;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
        if (keypoint.name) {
          ctx.fillStyle = 'white';
          ctx.font = '12px Arial';
          ctx.fillText(keypoint.name, x + 8, y + 3);
        }
      }
    });
  };

  // Draw Skeleton
  const drawSkeleton = (keypoints, ctx, model) => {
    const adjacentPairs = poseDetection.util.getAdjacentPairs(
      model === 'blazepose'
        ? poseDetection.SupportedModels.BlazePose
        : poseDetection.SupportedModels.MoveNet
    );

    adjacentPairs.forEach(([i, j]) => {
      const kp1 = keypoints[i];
      const kp2 = keypoints[j];
      if (kp1 && kp2 && kp1.score > 0.5 && kp2.score > 0.5) {
        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);
        ctx.strokeStyle = 'lime';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setModelType('movenet')} disabled={modelType === 'movenet'}>
          Use MoveNet
        </button>
        <button onClick={() => setModelType('blazepose')} disabled={modelType === 'blazepose'}>
          Use BlazePose
        </button>
        <button onClick={() => setDarkMode((prev) => !prev)}>
          Toggle {darkMode ? 'Light' : 'Dark'} Mode
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: 640, height: 480, position: 'relative' }}>
          <Webcam
            ref={webcamRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '8px',
            }}
            videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          />
        </div>

        <div>
          <h4>Reference View</h4>
          <label>
            <input
              type="checkbox"
              checked={useSecondaryWebcam}
              onChange={() => setUseSecondaryWebcam((prev) => !prev)}
            />
            Use webcam
          </label>
          <ReferenceExerciseView useWebcam={useSecondaryWebcam} />
        </div>
      </div>

      {modelType === 'blazepose' && keypoints3D && (
        <>
          <h3 style={{ marginTop: '2rem' }}>3D Pose View</h3>
          <Pose3DViewer keypoints3D={keypoints3D} darkMode={darkMode} />
        </>
      )}

      {noPerson && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            padding: '8px 12px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 'bold',
          }}
        >
          No person detected
        </div>
      )}
    </div>
  );
};

export default ExerciseCamera;