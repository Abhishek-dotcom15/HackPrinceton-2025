import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-core";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-converter";
import "@tensorflow/tfjs-backend-cpu";
import "./App.css";

import { calculateAngle3D } from "./utils/angles";
import { getGroqFeedback } from "./utils/groq";

// --- moved outside component to prevent eslint warnings ---
const drawKeypoints = (keypoints, ctx) => {
  if (!ctx || !keypoints) return;
  keypoints.forEach((kp) => {
    if (
      kp?.score > 0.5 &&
      typeof kp.x === "number" &&
      typeof kp.y === "number"
    ) {
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "red";
      ctx.fill();
      if (kp.name) {
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.fillText(kp.name, kp.x + 8, kp.y + 3);
      }
    }
  });
};

const drawSkeleton = (keypoints, ctx, type = "movenet") => {
  let adjacentPairs = poseDetection.util.getAdjacentPairs(
    type === "blazepose"
      ? poseDetection.SupportedModels.BlazePose
      : poseDetection.SupportedModels.MoveNet
  );
  adjacentPairs.forEach(([i, j]) => {
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

// --- App Component ---
const App = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [noPerson, setNoPerson] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("keypoints");
  const [modelLoading, setModelLoading] = useState(false);
  const [modelType, setModelType] = useState("movenet");
  const [liveFeedback, setLiveFeedback] = useState("");
  const [feedbackRequested, setFeedbackRequested] = useState(false);

  useEffect(() => {
    const setupTensorflow = async () => {
      try {
        await tf.setBackend("webgl");
        console.log("WebGL backend selected");
        await tf.ready();
        console.log(
          `TensorFlow.js initialized with backend: ${tf.getBackend()}`
        );
      } catch (error) {
        console.error("WebGL init failed:", error);
        try {
          await tf.setBackend("cpu");
          await tf.ready();
          console.log("CPU fallback initialized");
        } catch (cpuError) {
          setError("Failed to initialize TensorFlow. Try another browser.");
        }
      }
    };
    setupTensorflow();
  }, []);

  useEffect(() => {
    const setupBackend = async () => {
      try {
        await tf.setBackend("webgl");
        console.log("Using WebGL backend:", tf.getBackend());
        setBackendReady(true);
      } catch (webglError) {
        console.warn("WebGL failed, falling back to CPU:", webglError);
        try {
          await tf.setBackend("cpu");
          console.log("Using CPU backend:", tf.getBackend());
          setBackendReady(true);
        } catch (cpuError) {
          setError("Failed to initialize backend. Try a different browser.");
        }
      }
    };
    setupBackend();
  }, []);

  useEffect(() => {
    if (!backendReady) return;
    const runPoseDetection = async () => {
      try {
        setModelLoading(true);
        setError(null);
        const currentBackend = tf.getBackend();
        const isCpuBackend = currentBackend === "cpu";
        let detector;

        try {
          if (modelType === "blazepose") {
            if (isCpuBackend) await tf.setBackend("webgl");
            const detectorConfig = {
              runtime: "mediapipe",
              modelType: "full",
              enableSmoothing: true,
              solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/pose",
            };
            detector = await poseDetection.createDetector(
              poseDetection.SupportedModels.BlazePose,
              detectorConfig
            );
            console.log("BlazePose model loaded");
          } else {
            detector = await poseDetection.createDetector(
              poseDetection.SupportedModels.MoveNet,
              {
                modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
              }
            );
            console.log("MoveNet model loaded");
          }
        } catch (modelError) {
          console.error("Error creating detector:", modelError);
          setError(
            `Failed to initialize ${modelType} model: ${modelError.message}`
          );
          if (modelType === "blazepose") {
            setModelType("movenet");
          } else {
            throw modelError;
          }
        }

        setModelLoading(false);
        let lastFrameTime = 0;
        const frameInterval = isCpuBackend ? 200 : 0;

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
              const ctx = canvasRef.current.getContext("2d");
              if (!ctx) return requestAnimationFrame(detectPose);

              canvasRef.current.width = video.videoWidth;
              canvasRef.current.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

              const keypoints = poses?.[0]?.keypoints;
              if (modelType === "blazepose" && !feedbackRequested) {
                const keypoints3D = poses?.[0]?.keypoints3D;
                if (keypoints3D) {
                  const leftKneeAngle = calculateAngle3D(
                    keypoints3D[24],
                    keypoints3D[26],
                    keypoints3D[28]
                  );
                  const rightKneeAngle = calculateAngle3D(
                    keypoints3D[23],
                    keypoints3D[25],
                    keypoints3D[27]
                  );

                  const prompt = `
A user is performing a squat. The knee angles are:
- Left: ${leftKneeAngle.toFixed(1)}°
- Right: ${rightKneeAngle.toFixed(1)}°

Provide corrective feedback if form is improper.
If knees are > 150°, too upright. If < 90°, too deep.
Else, encourage good form.`;

                  const feedback = await getGroqFeedback(prompt);
                  setLiveFeedback(feedback);
                  setFeedbackRequested(true);
                }
              }

              if (keypoints && keypoints.length > 0) {
                setNoPerson(false);
                drawKeypoints(keypoints, ctx);
                drawSkeleton(keypoints, ctx, modelType);
              } else {
                setNoPerson(true);
              }
            } catch (error) {
              console.error("Pose estimation error:", error);
            }
          }

          requestAnimationFrame(detectPose);
        };

        requestAnimationFrame(detectPose);
        return () => detector?.dispose?.();
      } catch (err) {
        console.error("Pose detection error:", err);
        setError(`Failed to start detection: ${err.message}`);
        setModelLoading(false);
      }
    };

    const cleanupFn = runPoseDetection();
    return () => {
      if (typeof cleanupFn?.then === "function") {
        cleanupFn.catch((err) => console.error("Cleanup error:", err));
      } else if (typeof cleanupFn === "function") {
        cleanupFn();
      }
    };
  }, [backendReady, activeTab, modelType, feedbackRequested]);

  const handleModelChange = (newModelType) => {
    if (newModelType !== modelType && !modelLoading) {
      setModelType(newModelType);
      setLiveFeedback("");
      setFeedbackRequested(false);
    }
  };

  return (
    <div className="app">
      <div className="tab-nav">
        <button
          className={`tab-button ${activeTab === "keypoints" ? "active" : ""}`}
          onClick={() => setActiveTab("keypoints")}
        >
          2D Keypoints
        </button>
        <button
          className={`tab-button ${activeTab === "about" ? "active" : ""}`}
          onClick={() => setActiveTab("about")}
        >
          About
        </button>
      </div>
      <div className="content">
        {activeTab === "keypoints" && (
          <div className="keypoints-container full-view">
            <h2 className="heading">
              2D Keypoint Detection
              <div className="model-selector">
                <button
                  className={`model-button ${
                    modelType === "movenet" ? "active" : ""
                  }`}
                  onClick={() => handleModelChange("movenet")}
                  disabled={modelLoading}
                >
                  MoveNet
                </button>
                <button
                  className={`model-button ${
                    modelType === "blazepose" ? "active" : ""
                  }`}
                  onClick={() => handleModelChange("blazepose")}
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
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  facingMode: "user",
                }}
              />
              <canvas ref={canvasRef} className="detection-canvas" />
              {liveFeedback && (
                <div className="live-feedback status-message info-message">
                  <strong>Feedback:</strong> {liveFeedback}
                </div>
              )}
              {modelLoading && (
                <div className="status-message info-message">
                  Loading {modelType === "blazepose" ? "BlazePose" : "MoveNet"}{" "}
                  model...
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
        {activeTab === "about" && (
          <div className="about-container">
            <h2 className="heading">About Computer Vision Features</h2>
            <div className="about-content">
              <p>
                This app shows real-time pose detection using TensorFlow.js.
              </p>
              <ul>
                <li>
                  <strong>MoveNet:</strong> Lightweight, fast model
                </li>
                <li>
                  <strong>BlazePose:</strong> More accurate, 33 keypoints
                </li>
              </ul>
              <p>
                All processing is local in your browser—no video is sent to a
                server.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
