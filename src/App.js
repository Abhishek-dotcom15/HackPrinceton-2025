import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-core';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-converter';
import '@tensorflow/tfjs-backend-cpu';
import './App.css';
import Pose3DViewer from './components/Pose3DViewer';
import ReferenceExerciseView from './components/ReferenceExerciseView';

const App = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [noPerson, setNoPerson] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('keypoints');
  const [tfReady, setTfReady] = useState(false);
  const [tfError, setTfError] = useState(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelType, setModelType] = useState('movenet');
  const [keypoints3D, setKeypoints3D] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [useSecondaryWebcam, setUseSecondaryWebcam] = useState(false);

  useEffect(() => {
    const setupTensorflow = async () => {
      try {
        await tf.setBackend('webgl');
        await tf.ready();
        console.log(`TF.js backend: ${tf.getBackend()}`);
        setTfReady(true);
      } catch (error) {
        console.error('WebGL failed, falling back to CPU');
        try {
          await tf.setBackend('cpu');
          await tf.ready();
          setTfReady(true);
        } catch (cpuError) {
          setTfError(cpuError.message);
        }
      }
    };
    setupTensorflow();
  }, []);

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

  useEffect(() => {
    if (!backendReady) return;

    const runPoseDetection = async () => {
      try {
        setModelLoading(true);
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

        setModelLoading(false);

        let lastFrameTime = 0;
        const isCpu = tf.getBackend() === 'cpu';
        const frameInterval = isCpu ? 200 : 0;

        const detectPose = async (timestamp) => {
          if (timestamp - lastFrameTime < frameInterval) {
            requestAnimationFrame(detectPose);
            return;
          }
          lastFrameTime = timestamp;

          if (
            webcamRef.current &&
            webcamRef.current.video &&
            webcamRef.current.video.readyState === 4 &&
            canvasRef.current
          ) {
            const video = webcamRef.current.video;

            try {
              const poses = await detector.estimatePoses(video);
              const ctx = canvasRef.current.getContext('2d');
              canvasRef.current.width = video.videoWidth;
              canvasRef.current.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

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

        requestAnimationFrame(detectPose);
      } catch (err) {
        setError(err.message);
        setModelLoading(false);
      }
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
    let adjacentPairs = poseDetection.util.getAdjacentPairs(
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
    <div className="app">
      <div className="tab-nav">
        <button
          className={`tab-button ${activeTab === 'keypoints' ? 'active' : ''}`}
          onClick={() => setActiveTab('keypoints')}
        >
          2D Keypoints
        </button>
        <button
          className={`tab-button ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          About
        </button>
      </div>

      <div className="content">
        {activeTab === 'keypoints' && (
          <div className="keypoints-container full-view">
            <h2 className="heading">
              Real-Time Pose Detection
              <div className="model-selector">
                <button
                  className={`model-button ${modelType === 'movenet' ? 'active' : ''}`}
                  onClick={() => setModelType('movenet')}
                  disabled={modelLoading}
                >
                  MoveNet
                </button>
                <button
                  className={`model-button ${modelType === 'blazepose' ? 'active' : ''}`}
                  onClick={() => setModelType('blazepose')}
                  disabled={modelLoading}
                >
                  BlazePose
                </button>
              </div>
            </h2>

            <button onClick={() => setDarkMode(prev => !prev)} style={{ marginBottom: '1rem' }}>
              Toggle {darkMode ? 'Light' : 'Dark'} Mode
            </button>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: 640, height: 480, position: 'relative' }}>
                <Webcam
                  ref={webcamRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '8px'
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
                    pointerEvents: 'none'
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
          </div>
        )}

        {activeTab === 'about' && (
          <div className="about-container">
            <h2 className="heading">About</h2>
            <p>This app performs real-time 2D and 3D human pose estimation using TensorFlow.js.</p>
          </div>
        )}

        {!tfReady && tfError && (
          <div className="loading-overlay">
            <div className="error-message">{tfError}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;