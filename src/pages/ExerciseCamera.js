import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import * as poseDetection from '@tensorflow-models/pose-detection';
import Pose3DViewer from '../components/Pose3DViewer';
import FeedbackEngine from '../components/FeedbackEngine';

const ExerciseCamera = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [noPerson, setNoPerson] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  const [modelType, setModelType] = useState('blazepose');
  const [keypoints3D, setKeypoints3D] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [liveFeedback, setLiveFeedback] = useState('');

  // Setup backend
  useEffect(() => {
    const setupBackend = async () => {
      try {
        await tf.setBackend('webgl');
        await tf.ready();
        setBackendReady(true);
      } catch (err) {
        await tf.setBackend('cpu');
        await tf.ready();
        setBackendReady(true);
      }
    };
    setupBackend();
  }, []);

  // Pose detection
  useEffect(() => {
    if (!backendReady) return;

    const runPoseDetection = async () => {
      let detector;

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
          const ctx = canvasRef.current.getContext('2d');
          canvasRef.current.width = video.videoWidth;
          canvasRef.current.height = video.videoHeight;
          ctx.clearRect(0, 0, video.videoWidth, video.videoHeight);

          try {
            const poses = await detector.estimatePoses(video);
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
              setKeypoints3D(null);
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

  const drawSkeleton = (keypoints, ctx, model) => {
    const pairs = poseDetection.util.getAdjacentPairs(
      model === 'blazepose'
        ? poseDetection.SupportedModels.BlazePose
        : poseDetection.SupportedModels.MoveNet
    );

    pairs.forEach(([i, j]) => {
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
    <div
      style={{
        backgroundColor: darkMode ? '#121212' : '#f5f5f5',
        color: darkMode ? '#f5f5f5' : '#121212',
        minHeight: '100vh',
        padding: '2rem',
        fontFamily: 'sans-serif',
      }}
    >
      <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>
        Real-Time Pose Detection
      </h2>

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <button
          style={{ marginRight: '1rem' }}
          onClick={() => setModelType('movenet')}
          disabled={modelType === 'movenet'}
        >
          Use MoveNet
        </button>
        <button
          style={{ marginRight: '1rem' }}
          onClick={() => setModelType('blazepose')}
          disabled={modelType === 'blazepose'}
        >
          Use BlazePose
        </button>
        <button onClick={() => setDarkMode((prev) => !prev)}>
          Toggle {darkMode ? 'Light' : 'Dark'} Mode
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '2rem',
        }}
      >
        <div style={{ width: 640, height: 480, position: 'relative' }}>
          <Webcam
            ref={webcamRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '12px',
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
              borderRadius: '12px',
            }}
          />
        </div>

        {modelType === 'blazepose' && keypoints3D && (
          <div style={{ width: 640, height: 480 }}>
            <Pose3DViewer keypoints3D={keypoints3D} darkMode={darkMode} />
          </div>
        )}
      </div>

      {modelType === 'blazepose' && keypoints3D && (
        <FeedbackEngine
          keypoints3D={keypoints3D}
          modelType={modelType}
          onFeedback={setLiveFeedback}
        />
      )}

      {liveFeedback && (
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: darkMode ? '#1e1e1e' : '#fff',
            color: darkMode ? '#fff' : '#000',
            borderRadius: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            maxWidth: '80%',
            marginLeft: 'auto',
            marginRight: 'auto',
            textAlign: 'center',
          }}
        >
          <strong>Feedback:</strong> {liveFeedback}
        </div>
      )}

      {noPerson && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '10px 16px',
            color: 'white',
            borderRadius: '8px',
            fontWeight: 'bold',
            zIndex: 10,
          }}
        >
          No person detected
        </div>
      )}
    </div>
  );
};

export default ExerciseCamera;
