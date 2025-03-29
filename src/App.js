import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
// Make sure CPU backend is available as fallback
import '@tensorflow/tfjs-backend-cpu';
import BodySegmentation from './components/BodySegmentation';
import './App.css';

const App = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [noPerson, setNoPerson] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('split');
  const [tfReady, setTfReady] = useState(false);
  const [tfError, setTfError] = useState(null);

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
    if (!backendReady || activeTab === 'segmentation') return;
    
    const runPoseDetection = async () => {
      try {
        // Get current backend
        const currentBackend = tf.getBackend();
        console.log('Running pose detection with backend:', currentBackend);
        
        // Adjust settings based on backend
        const isCpuBackend = currentBackend === 'cpu';
        
        // Create model with appropriate settings
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          }
        );

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
            const poses = await detector.estimatePoses(video);

            const ctx = canvasRef.current.getContext('2d');
            canvasRef.current.width = video.videoWidth;
            canvasRef.current.height = video.videoHeight;

            // Draw video background first for reference
            ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

            const keypoints = poses?.[0]?.keypoints;

            if (keypoints && keypoints.length > 0) {
              setNoPerson(false); // person found
              drawKeypoints(keypoints, ctx);
              drawSkeleton(keypoints, ctx);
            } else {
              setNoPerson(true); // no person detected
            }
          }

          requestAnimationFrame(detectPose);
        };

        requestAnimationFrame(detectPose);
        
        return () => {
          // No explicit way to cancel detection, but we can let it finish
          detector.dispose && detector.dispose();
        };
      } catch (err) {
        console.error('Error in pose detection:', err);
        setError('Failed to start pose detection');
      }
    };

    const cleanupFn = runPoseDetection();
    return () => {
      cleanupFn && cleanupFn();
    };
  }, [backendReady, activeTab]);

  const drawKeypoints = (keypoints, ctx) => {
    keypoints.forEach((keypoint) => {
      if (keypoint.score > 0.5) {
        const { x, y } = keypoint;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
        
        // Draw keypoint name
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(keypoint.name, x + 8, y + 3);
      }
    });
  };

  const drawSkeleton = (keypoints, ctx) => {
    const adjacentPairs = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);

    adjacentPairs.forEach(([i, j]) => {
      const kp1 = keypoints[i];
      const kp2 = keypoints[j];

      if (kp1.score > 0.5 && kp2.score > 0.5) {
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
          className={`tab-button ${activeTab === 'segmentation' ? 'active' : ''}`}
          onClick={() => setActiveTab('segmentation')}
        >
          Body Segmentation
        </button>
        <button 
          className={`tab-button ${activeTab === 'split' ? 'active' : ''}`}
          onClick={() => setActiveTab('split')}
        >
          Split View
        </button>
        <button 
          className={`tab-button ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          About
        </button>
      </div>
      
      <div className="content">
        {(activeTab === 'keypoints' || activeTab === 'split') && (
          <div className={`keypoints-container ${activeTab === 'split' ? 'split-view' : 'full-view'}`}>
            <h2 className="heading">2D Keypoint Detection</h2>
            
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
        
        {(activeTab === 'segmentation' || activeTab === 'split') && (
          <div className={`segmentation-container ${activeTab === 'split' ? 'split-view' : 'full-view'}`}>
            <h2 className="heading">Body Segmentation</h2>
            
            <div className="segmentation-content">
              {/* Hidden webcam is used for segmentation if not already visible */}
              {activeTab === 'segmentation' && (
                <Webcam
                  ref={webcamRef}
                  style={{
                    width: 0,
                    height: 0,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    visibility: 'hidden'
                  }}
                  width={640}
                  height={480}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    width: 640,
                    height: 480,
                    facingMode: "user"
                  }}
                />
              )}
              
              {!tfReady ? (
                <div className="loading-overlay">
                  {tfError ? 
                    <div className="error-message">{tfError}</div> :
                    <div className="loading-message">Initializing TensorFlow.js...</div>
                  }
                </div>
              ) : (
                <BodySegmentation videoRef={webcamRef} />
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
                <li><strong>2D Keypoint Detection</strong> - Track human pose skeleton points in real-time</li>
                <li><strong>Body Segmentation</strong> - Separate your body from the background with various effects:</li>
                <ul>
                  <li><strong>Body Masking</strong> - Simple silhouette extraction</li>
                  <li><strong>Background Blur</strong> - Professional background blurring</li>
                  <li><strong>Body Parts</strong> - Colorful visualization of body regions</li>
                  <li><strong>Composite Effects</strong> - Creative visual effects</li>
                </ul>
                <li><strong>Split View</strong> - See both technologies working simultaneously</li>
                <li><strong>Export Data</strong> - Save recordings for further analysis</li>
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
      </div>
    </div>
  );
};

export default App;
