import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';

const App = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [noPerson, setNoPerson] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  const [error, setError] = useState(null);

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

            ctx.clearRect(0, 0, video.videoWidth, video.videoHeight);

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
      } catch (err) {
        console.error('Error in pose detection:', err);
        setError('Failed to start pose detection');
      }
    };

    runPoseDetection();
  }, [backendReady]);

  const drawKeypoints = (keypoints, ctx) => {
    keypoints.forEach((keypoint) => {
      if (keypoint.score > 0.5) {
        const { x, y } = keypoint;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
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
    <div>
      <Webcam
        ref={webcamRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 640,
          height: 480,
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 640,
          height: 480,
        }}
      />
      {noPerson && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          padding: '8px 12px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 'bold',
        }}>
          No person detected
        </div>
      )}
      {error && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          padding: '12px 16px',
          backgroundColor: 'rgba(255,0,0,0.8)',
          color: 'white',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 'bold',
          maxWidth: '80%',
          zIndex: 1000,
        }}>
          Error: {error}
        </div>
      )}
      {!backendReady && !error && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          padding: '12px 16px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 'bold',
        }}>
          Initializing TensorFlow.js...
        </div>
      )}
    </div>
  );
};

export default App;
