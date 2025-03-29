import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-core';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-converter';
// Make sure CPU backend is available as fallback
import '@tensorflow/tfjs-backend-cpu';
// import '@mediapipe/pose'; // Import MediaPipe pose for BlazePose model
import './App.css';

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
  const [modelType, setModelType] = useState('movenet'); // 'movenet' or 'blazepose'

  useEffect(() => {
    const setupTensorflow = async () => {
      try {
        // Try to initialize TensorFlow.js with WebGL backend for better performance
        console.log('Initializing TensorFlow.js...');
        
        // Make sure we have all backends registered
        await tf.setBackend('webgl');
        console.log('WebGL backend selected');
        
        await tf.ready();
        const backend = tf.getBackend();
        console.log(`TensorFlow.js initialized with backend: ${backend}`);
        setTfReady(true);
      } catch (error) {
        console.error('Failed to initialize TensorFlow.js with WebGL:', error);
        
        // Try CPU backend as fallback
        try {
          await tf.setBackend('cpu');
          await tf.ready();
          console.log('TensorFlow.js initialized with CPU backend (fallback)');
          setTfReady(true);
        } catch (cpuError) {
          console.error('Failed to initialize TensorFlow.js with CPU:', cpuError);
          setTfError(`TensorFlow.js initialization failed: ${error.message}. CPU fallback also failed.`);
        }
      }
    };
    
    setupTensorflow();
  }, []);

  useEffect(() => {
    const setupBackend = async () => {
      try {
        // Try WebGL first (preferred for performance)
        try {
          await tf.setBackend('webgl');
          console.log('Using WebGL backend:', tf.getBackend());
          setBackendReady(true);
        } catch (webglError) {
          console.warn('WebGL backend failed, trying CPU fallback:', webglError);
          
          // If WebGL fails, try CPU backend
          try {
            await tf.setBackend('cpu');
            console.log('Using CPU backend:', tf.getBackend());
            setBackendReady(true);
          } catch (cpuError) {
            throw new Error('Both WebGL and CPU backends failed to initialize');
          }
        }
      } catch (err) {
        console.error('Error setting up TensorFlow backend:', err);
        setError('Failed to initialize TensorFlow backend. Please make sure your browser supports WebGL or try a different browser.');
      }
    };
    
    setupBackend();
  }, []);

  useEffect(() => {
    if (!backendReady) return;
    
    const runPoseDetection = async () => {
      try {
        setModelLoading(true);
        setError(null); // Clear any previous errors
        
        // Get current backend
        const currentBackend = tf.getBackend();
        console.log(`Running pose detection with ${modelType} model on ${currentBackend} backend`);
        
        // Adjust settings based on backend
        const isCpuBackend = currentBackend === 'cpu';
        
        // Create model based on selected type
        let detector;
        
        try {
          if (modelType === 'blazepose') {
            // BlazePose model with full configuration
            // Make sure WebGL backend is used for BlazePose
            if (isCpuBackend) {
              await tf.setBackend('webgl');
              console.log('Switched to WebGL for BlazePose');
            }
            
            // Use tfjs runtime instead of mediapipe to avoid initialization issues
            const detectorConfig = {
              runtime: 'mediapipe',
              modelType: 'full',
              enableSmoothing: true,
              solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/pose',

            };
            
            detector = await poseDetection.createDetector(
              poseDetection.SupportedModels.BlazePose,
              detectorConfig
            );
            console.log(`BlazePose model loaded with ${detectorConfig.runtime} runtime`);
          } else {
            // Default to MoveNet model
            detector = await poseDetection.createDetector(
              poseDetection.SupportedModels.MoveNet,
              {
                modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
                
              }
            );
            console.log('MoveNet model loaded');
          }
        } catch (modelError) {
          console.error('Error creating detector:', modelError);
          setError(`Failed to initialize ${modelType} model: ${modelError.message}`);
          // Fallback to MoveNet if BlazePose fails
          if (modelType === 'blazepose') {
            console.log('Falling back to MoveNet...');
            setModelType('movenet');
            detector = await poseDetection.createDetector(
              poseDetection.SupportedModels.MoveNet,
              {
                modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
              }
            );
            console.log('Fallback to MoveNet successful');
          } else {
            throw modelError; // Re-throw if MoveNet also fails
          }
        }
        
        setModelLoading(false);

        let lastFrameTime = 0;
        const frameInterval = isCpuBackend ? 200 : 0; // 5 FPS for CPU, full speed for GPU
        
        const detectPose = async (timestamp) => {
          // Throttle frame rate for CPU backend
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
              if (!ctx) {
                console.error('Failed to get canvas context');
                requestAnimationFrame(detectPose);
                return;
              }
              
              canvasRef.current.width = video.videoWidth;
              canvasRef.current.height = video.videoHeight;

              // Draw video background first for reference
              ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

              const keypoints = poses?.[0]?.keypoints;

              if (modelType === 'blazepose') {
                console.log('Enabling 3D keypoint logging for BlazePose');

                try {
                  const keypoints3D = poses?.[0]?.keypoints3D;

                  if (keypoints3D) {
                    console.log(keypoints3D);
                  } else {
                    console.log('3D keypoints not present in poses');
                  }
                } catch (error) {
                  console.error('Error in 3D keypoint logging:', error);
                }
              }

              

              
              

              if (keypoints && keypoints.length > 0) {
                setNoPerson(false); // person found
                drawKeypoints(keypoints, ctx);
                drawSkeleton(keypoints, ctx, modelType);
              } else {
                setNoPerson(true); // no person detected
              }
            } catch (error) {
              console.error('Error in pose estimation:', error);
              // Don't set error state here to prevent continuous errors
            }
          }

          requestAnimationFrame(detectPose);
        };

        requestAnimationFrame(detectPose);
        
        return () => {
          // No explicit way to cancel detection, but we can let it finish
          if (detector && typeof detector.dispose === 'function') {
            try {
              detector.dispose();
            } catch (disposeError) {
              console.error('Error disposing detector:', disposeError);
            }
          }
        };
      } catch (err) {
        console.error('Error in pose detection:', err);
        setError(`Failed to start pose detection: ${err.message}`);
        setModelLoading(false);
      }
    };

    const cleanupFn = runPoseDetection();
    return () => {
      if (cleanupFn && typeof cleanupFn.then === 'function') {
        cleanupFn.catch(err => console.error('Error during cleanup:', err));
      } else if (typeof cleanupFn === 'function') {
        cleanupFn();
      }
    };
  }, [backendReady, activeTab, modelType]);

  const drawKeypoints = (keypoints, ctx) => {
    if (!ctx || !keypoints || !Array.isArray(keypoints)) return;
    
    keypoints.forEach((keypoint) => {
      if (keypoint && keypoint.score > 0.5) {
        const { x, y } = keypoint;
        if (typeof x !== 'number' || typeof y !== 'number') return;
        
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
        
        // Draw keypoint name
        if (keypoint.name) {
          ctx.fillStyle = 'white';
          ctx.font = '12px Arial';
          ctx.fillText(keypoint.name, x + 8, y + 3);
        }
      }
    });
  };

  const drawSkeleton = (keypoints, ctx, type = 'movenet') => {
    if (!ctx || !keypoints || !Array.isArray(keypoints)) return;
    
    try {
      // Get the appropriate adjacent pairs based on model type
      let adjacentPairs;
      try {
        adjacentPairs = type === 'blazepose' 
          ? poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.BlazePose)
          : poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);
      } catch (error) {
        console.error('Error getting adjacent pairs:', error);
        // Fallback to MoveNet connection pattern
        adjacentPairs = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);
      }

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
    } catch (error) {
      console.error('Error drawing skeleton:', error);
    }
  };

  const handleModelChange = (newModelType) => {
    if (newModelType !== modelType && !modelLoading) {
      console.log(`Switching model from ${modelType} to ${newModelType}`);
      setModelType(newModelType);
    }
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
              2D Keypoint Detection
              <div className="model-selector">
                <button 
                  className={`model-button ${modelType === 'movenet' ? 'active' : ''}`} 
                  onClick={() => handleModelChange('movenet')}
                  disabled={modelLoading}
                >
                  MoveNet
                </button>
                <button 
                  className={`model-button ${modelType === 'blazepose' ? 'active' : ''}`} 
                  onClick={() => handleModelChange('blazepose')}
                  disabled={modelLoading}
                >
                  BlazePose
                </button>
              </div>
            </h2>
            
            <div className="detection-content">
              <Webcam
                ref={webcamRef}
                className="webcam"
                videoConstraints={{
                  width: 640,
                  height: 480,
                  facingMode: "user"
                }}
              />
              <canvas
                ref={canvasRef}
                className="detection-canvas"
              />
              
              {modelLoading && (
                <div className="status-message info-message">
                  Loading {modelType === 'blazepose' ? 'BlazePose' : 'MoveNet'} model...
                </div>
              )}
              
              {noPerson && (
                <div className="status-message warning-message">
                  No person detected
                </div>
              )}
              
              {error && (
                <div className="status-message error-message">
                  Error: {error}
                </div>
              )}
              
              {!backendReady && !error && (
                <div className="status-message info-message">
                  Initializing TensorFlow.js...
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'about' && (
          <div className="about-container">
            <h2 className="heading">About Computer Vision Features</h2>
            <div className="about-content">
              <p>
                This application demonstrates real-time computer vision capabilities in the browser.
              </p>
              <h3>Features:</h3>
              <ul>
                <li><strong>2D Keypoint Detection</strong> - Track human pose skeleton points in real-time with multiple models:</li>
                <ul>
                  <li><strong>MoveNet</strong> - Lightweight and fast pose detection model</li>
                  <li><strong>BlazePose</strong> - MediaPipe's more accurate pose tracking model with 33 keypoints</li>
                </ul>
              </ul>
              <p>
                Powered by TensorFlow.js and MediaPipe models, providing high-performance computer vision
                capabilities without requiring any server processing.
              </p>
              <h3>Privacy:</h3>
              <p>
                All processing happens locally in your browser. No video data is sent to any server.
              </p>
            </div>
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
