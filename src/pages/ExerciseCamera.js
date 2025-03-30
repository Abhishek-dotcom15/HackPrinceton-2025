import React, { useRef, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  const navigate = useNavigate();

  const [noPerson, setNoPerson] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  const [modelType, setModelType] = useState('blazepose');
  const [keypoints3D, setKeypoints3D] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [liveFeedback, setLiveFeedback] = useState('');
  const [error, setError] = useState(null);
  // const [activeTab, setActiveTab] = useState('keypoints');
  const [modelLoading, setModelLoading] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  
  const [frames, setFrames] = useState([]); // Store frames for feedback calculation
  const lastFeedbackTimeRef = useRef(Date.now());
  const frameQueueRef = useRef([]); // Queue to store frames (keypoints3D and timestamp)

  const { name } = useParams();  // This will extract the 'name' parameter from the URL
  const [exerciseType, setExerciseType] = useState(name);  // Initialize exerciseType with the dynamic 'name'
  const [feedbackRendered, setFeedbackRendered] = useState(false); // Track feedback rendering

  useEffect(() => {
    const interval = setInterval(() => {
      setCooldownTime((prev) => Math.max(prev - 1, 0));
    }, 1000); // decrease by 1 sec every second

    return () => clearInterval(interval);
  }, []);

  // Setup TensorFlow
  useEffect(() => {
    const setupTensorflow = async () => {
      try {
        await tf.setBackend('webgl');
        console.log('WebGL backend selected');
        await tf.ready();
        console.log(`TensorFlow.js initialized with backend: ${tf.getBackend()}`);
      } catch (error) {
        console.error('WebGL init failed:', error);
        try {
          await tf.setBackend('cpu');
          await tf.ready();
          console.log('CPU fallback initialized');
        } catch (cpuError) {
          setError('Failed to initialize TensorFlow. Try another browser.');
        }
      }
    };
    setupTensorflow();
  }, []);

  useEffect(() => {
    // Update exerciseType when 'name' changes (if the user navigates to another exercise)
    setExerciseType(name);
  }, [name]);  // Listen for changes to 'name' in the URL

  // Setup Backend
  useEffect(() => {
    const setupBackend = async () => {
      try {
        await tf.setBackend('webgl');
        console.log('Using WebGL backend:', tf.getBackend());
        setBackendReady(true);
      } catch (webglError) {
        console.warn('WebGL failed, falling back to CPU:', webglError);
        try {
          await tf.setBackend('cpu');
          console.log('Using CPU backend:', tf.getBackend());
          setBackendReady(true);
        } catch (cpuError) {
          setError('Failed to initialize backend. Try a different browser.');
        }
      }
    };
    setupBackend();
  }, []);

  // Run Pose Detection
  useEffect(() => {

     
    
    if (!backendReady) return;

    
    const runPoseDetection = async () => {
      try {
        setModelLoading(true);
        setError(null);
        let detector;

        try {
          // Only BlazePose will be used now
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
          console.log('BlazePose model loaded');
        } catch (modelError) {
          console.error('Error creating detector:', modelError);
          setError(
            `Failed to initialize BlazePose model: ${modelError.message}`
          );
          setModelLoading(false);
          return;
        }

        setModelLoading(false);
        let lastFrameTime = 0;
        const frameInterval = 200;

        // Pose Detection Logic
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
              if (!ctx) return requestAnimationFrame(detectPose);

              canvasRef.current.width = video.videoWidth;
              canvasRef.current.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

              const keypoints = poses?.[0]?.keypoints;
              const kp3d = poses?.[0]?.keypoints3D;
              setKeypoints3D(kp3d || null);




              if (keypoints && keypoints.length > 0) {
                setNoPerson(false);

                drawKeypoints(keypoints, ctx);
                drawSkeleton(keypoints, ctx);

                // Add the new frame to the queue
                // const newFrame = { keypoints3D, timestamp };
                const newFrame = { keypoints3D: kp3d, timestamp };

                frameQueueRef.current.push(newFrame);

                // Remove frames older than 10 seconds
                while (frameQueueRef.current.length > 0 && timestamp - frameQueueRef.current[0].timestamp > 10000) {
                  frameQueueRef.current.shift();
                }

                // Update the state with the latest frames
                setFrames([...frameQueueRef.current]);

                // Handle feedback every 15 seconds if there are at least 10 frames
                const now = Date.now();
                const secondsSinceLast = (now - lastFeedbackTimeRef.current) / 1000;

                // Log keypoints3D and frames to check their values
                console.log("Keypoints 3D:", keypoints3D);
                console.log("Frames:", frames);
            

                if (secondsSinceLast >= 15 && keypoints3D && frames.length >= 10) {
                  lastFeedbackTimeRef.current = now;
                  setCooldownTime(15);

                  // Trigger feedback rendering and reset frames after feedback
                  setFeedbackRendered(false); // Reset the feedbackRendered flag before rendering feedback
                }
              } else {
                setNoPerson(true);
              }
            } catch (error) {
              console.error('Pose estimation error:', error);
            }
          }

          requestAnimationFrame(detectPose);
        };

        requestAnimationFrame(detectPose);
        return () => detector?.dispose?.();
      } catch (err) {
        console.error('Pose detection error:', err);
        setError(`Failed to start detection: ${err.message}`);
        setModelLoading(false);
      }
    };

    const cleanupFn = runPoseDetection();
    return () => {
      if (typeof cleanupFn?.then === 'function') {
        cleanupFn.catch((err) => console.error('Cleanup error:', err));
      } else if (typeof cleanupFn === 'function') {
        cleanupFn();
      }
    };
  }, [backendReady, exerciseType]);

  // Trigger reset after feedback is rendered
  useEffect(() => {
    if (feedbackRendered && keypoints3D && frames.length >= 10) {
      setFrames([]); // Reset the frames
    }
  }, [feedbackRendered, keypoints3D, frames]);

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

  const drawSkeleton = (keypoints, ctx) => {
    const pairs = poseDetection.util.getAdjacentPairs(
      
        poseDetection.SupportedModels.BlazePose
        
    );

    pairs.forEach(([i, j]) => {
      const kp1 = keypoints[i];
      const kp2 = keypoints[j];
      
      if (kp1?.score > 0.5 && kp2?.score > 0.5) {
        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);
        ctx.strokeStyle = "lime";
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
      {/* BACK BUTTON */}
      <button
        onClick={() => navigate('/exercises')}
        style={{
          marginBottom: '1rem',
          padding: '8px 16px',
          backgroundColor: '#444',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        ← Back to Exercises
      </button>

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
          modelType="blazepose"
          exerciseType={exerciseType}
          frames={frames}
          onFeedback={(feedback) => {
            setLiveFeedback(feedback);
            setFeedbackRendered(true); // Feedback is rendered, set the flag
          }}
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
