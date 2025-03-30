// import React, { useRef, useEffect, useState } from "react";
// import Webcam from "react-webcam";
// import * as tf from "@tensorflow/tfjs";
// import "@tensorflow/tfjs-core";
// import * as poseDetection from "@tensorflow-models/pose-detection";
// import "@tensorflow/tfjs-backend-webgl";
// import "@tensorflow/tfjs-converter";
// import "@tensorflow/tfjs-backend-cpu";
// import "./App.css";

// import { calculateAngle3D } from "./utils/angles";
// import { getGroqFeedback } from "./utils/groq";

// // --- moved outside component to prevent eslint warnings ---
// const drawKeypoints = (keypoints, ctx) => {
//   if (!ctx || !keypoints) return;
//   keypoints.forEach((kp) => {
//     if (
//       kp?.score > 0.5 &&
//       typeof kp.x === "number" &&
//       typeof kp.y === "number"
//     ) {
//       ctx.beginPath();
//       ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
//       ctx.fillStyle = "red";
//       ctx.fill();
//       if (kp.name) {
//         ctx.fillStyle = "white";
//         ctx.font = "12px Arial";
//         ctx.fillText(kp.name, kp.x + 8, kp.y + 3);
//       }
//     }
//   });
// };

// const drawSkeleton = (keypoints, ctx, type = "movenet") => {
//   let adjacentPairs = poseDetection.util.getAdjacentPairs(
//     type === "blazepose"
//       ? poseDetection.SupportedModels.BlazePose
//       : poseDetection.SupportedModels.MoveNet
//   );
//   adjacentPairs.forEach(([i, j]) => {
//     const kp1 = keypoints[i];
//     const kp2 = keypoints[j];
//     if (kp1?.score > 0.5 && kp2?.score > 0.5) {
//       ctx.beginPath();
//       ctx.moveTo(kp1.x, kp1.y);
//       ctx.lineTo(kp2.x, kp2.y);
//       ctx.strokeStyle = "lime";
//       ctx.lineWidth = 2;
//       ctx.stroke();
//     }
//   });
// };

// // --- App Component ---
// const App = () => {
//   const webcamRef = useRef(null);
//   const canvasRef = useRef(null);
//   const [noPerson, setNoPerson] = useState(false);
//   const [backendReady, setBackendReady] = useState(false);
//   const [error, setError] = useState(null);
//   const [activeTab, setActiveTab] = useState("keypoints");
//   const [modelLoading, setModelLoading] = useState(false);
//   const [modelType, setModelType] = useState("movenet");
//   const [liveFeedback, setLiveFeedback] = useState("");
//   const [cooldownTime, setCooldownTime] = useState(0);
//   useEffect(() => {
//     const interval = setInterval(() => {
//       setCooldownTime((prev) => Math.max(prev - 1, 0));
//     }, 1000); // decrease by 1 sec every second

//     return () => clearInterval(interval);
//   }, []);

//   // const [feedbackRequested, setFeedbackRequested] = useState(false);
//   const lastFeedbackTimeRef = useRef(Date.now());

//   useEffect(() => {
//     const setupTensorflow = async () => {
//       try {
//         await tf.setBackend("webgl");
//         console.log("WebGL backend selected");
//         await tf.ready();
//         console.log(
//           `TensorFlow.js initialized with backend: ${tf.getBackend()}`
//         );
//       } catch (error) {
//         console.error("WebGL init failed:", error);
//         try {
//           await tf.setBackend("cpu");
//           await tf.ready();
//           console.log("CPU fallback initialized");
//         } catch (cpuError) {
//           setError("Failed to initialize TensorFlow. Try another browser.");
//         }
//       }
//     };
//     setupTensorflow();
//   }, []);

//   useEffect(() => {
//     const setupBackend = async () => {
//       try {
//         await tf.setBackend("webgl");
//         console.log("Using WebGL backend:", tf.getBackend());
//         setBackendReady(true);
//       } catch (webglError) {
//         console.warn("WebGL failed, falling back to CPU:", webglError);
//         try {
//           await tf.setBackend("cpu");
//           console.log("Using CPU backend:", tf.getBackend());
//           setBackendReady(true);
//         } catch (cpuError) {
//           setError("Failed to initialize backend. Try a different browser.");
//         }
//       }
//     };
//     setupBackend();
//   }, []);

//   useEffect(() => {
//     if (!backendReady) return;
//     const runPoseDetection = async () => {
//       try {
//         setModelLoading(true);
//         setError(null);
//         const currentBackend = tf.getBackend();
//         const isCpuBackend = currentBackend === "cpu";
//         let detector;

//         try {
//           if (modelType === "blazepose") {
//             if (isCpuBackend) await tf.setBackend("webgl");
//             const detectorConfig = {
//               runtime: "mediapipe",
//               modelType: "full",
//               enableSmoothing: true,
//               solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/pose",
//             };
//             detector = await poseDetection.createDetector(
//               poseDetection.SupportedModels.BlazePose,
//               detectorConfig
//             );
//             console.log("BlazePose model loaded");
//           } else {
//             detector = await poseDetection.createDetector(
//               poseDetection.SupportedModels.MoveNet,
//               {
//                 modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
//               }
//             );
//             console.log("MoveNet model loaded");
//           }
//         } catch (modelError) {
//           console.error("Error creating detector:", modelError);
//           setError(
//             `Failed to initialize ${modelType} model: ${modelError.message}`
//           );
//           if (modelType === "blazepose") {
//             setModelType("movenet");
//           } else {
//             throw modelError;
//           }
//         }

//         setModelLoading(false);
//         let lastFrameTime = 0;
//         const frameInterval = isCpuBackend ? 200 : 0;

//         const detectPose = async (timestamp) => {
//           if (timestamp - lastFrameTime < frameInterval) {
//             requestAnimationFrame(detectPose);
//             return;
//           }

//           lastFrameTime = timestamp;

//           if (
//             webcamRef.current &&
//             webcamRef.current.video &&
//             webcamRef.current.video.readyState === 4 &&
//             canvasRef.current
//           ) {
//             const video = webcamRef.current.video;
//             try {
//               const poses = await detector.estimatePoses(video);
//               const ctx = canvasRef.current.getContext("2d");
//               if (!ctx) return requestAnimationFrame(detectPose);

//               canvasRef.current.width = video.videoWidth;
//               canvasRef.current.height = video.videoHeight;
//               ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

//               const keypoints = poses?.[0]?.keypoints;
//               if (modelType === "blazepose") {
//                 const now = Date.now();
//                 const secondsSinceLastFeedback =
//                   (now - lastFeedbackTimeRef.current) / 1000;

//                 const keypoints3D = poses?.[0]?.keypoints3D;

//                 if (secondsSinceLastFeedback >= 15 && keypoints3D) {
//                   lastFeedbackTimeRef.current = now;
//                   setCooldownTime(15); // reset cooldown to 15 seconds

//                   // Example: Adjust for different exercise types
//                   const exerciseType = "squat"; // Change this dynamically based on user input or context

//                   // Get necessary keypoints
//                   const leftKneeAngle = calculateAngle3D(
//                     keypoints3D[24],
//                     keypoints3D[26],
//                     keypoints3D[28]
//                   );
//                   const rightKneeAngle = calculateAngle3D(
//                     keypoints3D[23],
//                     keypoints3D[25],
//                     keypoints3D[27]
//                   );

//                   const leftHip = keypoints3D[11];
//                   const rightHip = keypoints3D[12];

//                   // Generalize feedback based on the exercise
//                   let prompt = "";
//                   if (exerciseType === "squat") {
//                     prompt = `
//           A user is performing a squat. The knee angles are:
//           - Left Knee: ${leftKneeAngle.toFixed(1)}°
//           - Right Knee: ${rightKneeAngle.toFixed(1)}°
//           The left hip is at position ${leftHip.z.toFixed(
//             1
//           )} and right hip at position ${rightHip.z.toFixed(1)}.

//           Provide corrective feedback if form is improper.
//           If knees are > 150°, too upright. If < 90°, too deep.
//           If hips are not aligned, adjust posture.
//         `;
//                   } else if (exerciseType === "lunge") {
//                     prompt = `
//           A user is performing a lunge. The knee angles are:
//           - Left Knee: ${leftKneeAngle.toFixed(1)}°
//           - Right Knee: ${rightKneeAngle.toFixed(1)}°
//           Ensure that the hips are square and aligned during the lunge.
//           If the knee extends too far past the toes, correct form.
//         `;
//                   } else if (exerciseType === "leg raise") {
//                     prompt = `
//           A user is performing a leg raise. The hip angle is ${leftHip.z.toFixed(
//             1
//           )} for the left leg and ${rightHip.z.toFixed(1)} for the right leg.
//           Ensure the leg is not too low or too high, keep it controlled during the movement.
//         `;
//                   } else if (exerciseType === "leg extension") {
//                     prompt = `
//           A user is performing a leg extension. The knee angle is:
//           - Left Knee: ${leftKneeAngle.toFixed(1)}°
//           - Right Knee: ${rightKneeAngle.toFixed(1)}°
//           Keep the knee fully extended and control the movement.
//         `;
//                   } else if (exerciseType === "hamstring curl") {
//                     prompt = `
//           A user is performing a hamstring curl. The knee angle is:
//           - Left Knee: ${leftKneeAngle.toFixed(1)}°
//           - Right Knee: ${rightKneeAngle.toFixed(1)}°
//           Ensure that the knee is not hyperextending during the curl.
//         `;
//                   }

//                   const feedback = await getGroqFeedback(prompt);
//                   setLiveFeedback(feedback);
//                 }
//               }

//               if (keypoints && keypoints.length > 0) {
//                 setNoPerson(false);
//                 drawKeypoints(keypoints, ctx);
//                 drawSkeleton(keypoints, ctx, modelType);
//               } else {
//                 setNoPerson(true);
//               }
//             } catch (error) {
//               console.error("Pose estimation error:", error);
//             }
//           }

//           requestAnimationFrame(detectPose);
//         };

//         requestAnimationFrame(detectPose);
//         return () => detector?.dispose?.();
//       } catch (err) {
//         console.error("Pose detection error:", err);
//         setError(`Failed to start detection: ${err.message}`);
//         setModelLoading(false);
//       }
//     };

//     const cleanupFn = runPoseDetection();
//     return () => {
//       if (typeof cleanupFn?.then === "function") {
//         cleanupFn.catch((err) => console.error("Cleanup error:", err));
//       } else if (typeof cleanupFn === "function") {
//         cleanupFn();
//       }
//     };
//   }, [backendReady, activeTab, modelType]);
//   // }, [backendReady, activeTab, modelType, feedbackRequested]);

//   const handleModelChange = (newModelType) => {
//     if (newModelType !== modelType && !modelLoading) {
//       setModelType(newModelType);
//       setLiveFeedback("");
//       // setFeedbackRequested(false);
//     }
//   };

//   return (
//     <div className="app">
//       <div className="tab-nav">
//         <button
//           className={`tab-button ${activeTab === "keypoints" ? "active" : ""}`}
//           onClick={() => setActiveTab("keypoints")}
//         >
//           2D Keypoints
//         </button>
//         <button
//           className={`tab-button ${activeTab === "about" ? "active" : ""}`}
//           onClick={() => setActiveTab("about")}
//         >
//           About
//         </button>
//       </div>
//       <div className="content">
//         {activeTab === "keypoints" && (
//           <div className="keypoints-container full-view">
//             <h2 className="heading">
//               2D Keypoint Detection
//               <div className="model-selector">
//                 <button
//                   className={`model-button ${
//                     modelType === "movenet" ? "active" : ""
//                   }`}
//                   onClick={() => handleModelChange("movenet")}
//                   disabled={modelLoading}
//                 >
//                   MoveNet
//                 </button>
//                 <button
//                   className={`model-button ${
//                     modelType === "blazepose" ? "active" : ""
//                   }`}
//                   onClick={() => handleModelChange("blazepose")}
//                   disabled={modelLoading}
//                 >
//                   BlazePose
//                 </button>
//               </div>
//             </h2>
//             <div className="detection-content">
//               <Webcam
//                 ref={webcamRef}
//                 className="webcam"
//                 videoConstraints={{
//                   width: { ideal: 1280 },
//                   height: { ideal: 720 },
//                   facingMode: "user",
//                 }}
//               />
//               <canvas ref={canvasRef} className="detection-canvas" />
//               {liveFeedback && (
//                 <div className="live-feedback status-message info-message">
//                   <strong>Feedback:</strong> {liveFeedback}
//                 </div>
//               )}
//               {cooldownTime > 0 && (
//                 <div className="status-message info-message">
//                   Next feedback in: {cooldownTime}s
//                 </div>
//               )}
//               {modelLoading && (
//                 <div className="status-message info-message">
//                   Loading {modelType === "blazepose" ? "BlazePose" : "MoveNet"}{" "}
//                   model...
//                 </div>
//               )}
//               {noPerson && (
//                 <div className="status-message warning-message">
//                   No person detected
//                 </div>
//               )}
//               {error && (
//                 <div className="status-message error-message">
//                   Error: {error}
//                 </div>
//               )}
//               {!backendReady && !error && (
//                 <div className="status-message info-message">
//                   Initializing TensorFlow.js...
//                 </div>
//               )}
//             </div>
//           </div>
//         )}
//         {activeTab === "about" && (
//           <div className="about-container">
//             <h2 className="heading">About Computer Vision Features</h2>
//             <div className="about-content">
//               <p>
//                 This app shows real-time pose detection using TensorFlow.js.
//               </p>
//               <ul>
//                 <li>
//                   <strong>MoveNet:</strong> Lightweight, fast model
//                 </li>
//                 <li>
//                   <strong>BlazePose:</strong> More accurate, 33 keypoints
//                 </li>
//               </ul>
//               <p>
//                 All processing is local in your browser—no video is sent to a
//                 server.
//               </p>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default App;

// import React, { useRef, useEffect, useState } from "react";
// import Webcam from "react-webcam";
// import * as tf from "@tensorflow/tfjs";
// import "@tensorflow/tfjs-core";
// import * as poseDetection from "@tensorflow-models/pose-detection";
// import "@tensorflow/tfjs-backend-webgl";
// import "@tensorflow/tfjs-converter";
// import "@tensorflow/tfjs-backend-cpu";
// import "./App.css";

// import { calculateAngle3D } from "./utils/angles";
// import { getGroqFeedback } from "./utils/groq";

// // --- moved outside component to prevent eslint warnings ---
// const drawKeypoints = (keypoints, ctx) => {
//   if (!ctx || !keypoints) return;
//   keypoints.forEach((kp) => {
//     if (
//       kp?.score > 0.5 &&
//       typeof kp.x === "number" &&
//       typeof kp.y === "number"
//     ) {
//       ctx.beginPath();
//       ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
//       ctx.fillStyle = "red";
//       ctx.fill();
//       if (kp.name) {
//         ctx.fillStyle = "white";
//         ctx.font = "12px Arial";
//         ctx.fillText(kp.name, kp.x + 8, kp.y + 3);
//       }
//     }
//   });
// };

// const drawSkeleton = (keypoints, ctx) => {
//   let adjacentPairs = poseDetection.util.getAdjacentPairs(
//     poseDetection.SupportedModels.BlazePose
//   );
//   adjacentPairs.forEach(([i, j]) => {
//     const kp1 = keypoints[i];
//     const kp2 = keypoints[j];
//     if (kp1?.score > 0.5 && kp2?.score > 0.5) {
//       ctx.beginPath();
//       ctx.moveTo(kp1.x, kp1.y);
//       ctx.lineTo(kp2.x, kp2.y);
//       ctx.strokeStyle = "lime";
//       ctx.lineWidth = 2;
//       ctx.stroke();
//     }
//   });
// };

// // --- App Component ---
// const App = () => {
//   const webcamRef = useRef(null);
//   const canvasRef = useRef(null);
//   const [noPerson, setNoPerson] = useState(false);
//   const [backendReady, setBackendReady] = useState(false);
//   const [error, setError] = useState(null);
//   const [activeTab, setActiveTab] = useState("keypoints");
//   const [modelLoading, setModelLoading] = useState(false);
//   const [liveFeedback, setLiveFeedback] = useState("");
//   const [cooldownTime, setCooldownTime] = useState(0);
//   const [exerciseType, setExerciseType] = useState("squat"); // Default to "squat"
//   const [frames, setFrames] = useState([]); // Store frames for feedback calculation

//   const lastFeedbackTimeRef = useRef(Date.now());

//   useEffect(() => {
//     const interval = setInterval(() => {
//       setCooldownTime((prev) => Math.max(prev - 1, 0));
//     }, 1000); // decrease by 1 sec every second

//     return () => clearInterval(interval);
//   }, []);

//   // Setup TensorFlow
//   useEffect(() => {
//     const setupTensorflow = async () => {
//       try {
//         await tf.setBackend("webgl");
//         console.log("WebGL backend selected");
//         await tf.ready();
//         console.log(
//           `TensorFlow.js initialized with backend: ${tf.getBackend()}`
//         );
//       } catch (error) {
//         console.error("WebGL init failed:", error);
//         try {
//           await tf.setBackend("cpu");
//           await tf.ready();
//           console.log("CPU fallback initialized");
//         } catch (cpuError) {
//           setError("Failed to initialize TensorFlow. Try another browser.");
//         }
//       }
//     };
//     setupTensorflow();
//   }, []);

//   // Setup Backend
//   useEffect(() => {
//     const setupBackend = async () => {
//       try {
//         await tf.setBackend("webgl");
//         console.log("Using WebGL backend:", tf.getBackend());
//         setBackendReady(true);
//       } catch (webglError) {
//         console.warn("WebGL failed, falling back to CPU:", webglError);
//         try {
//           await tf.setBackend("cpu");
//           console.log("Using CPU backend:", tf.getBackend());
//           setBackendReady(true);
//         } catch (cpuError) {
//           setError("Failed to initialize backend. Try a different browser.");
//         }
//       }
//     };
//     setupBackend();
//   }, []);

//   // Run Pose Detection
//   useEffect(() => {
//     if (!backendReady) return;
//     const runPoseDetection = async () => {
//       try {
//         setModelLoading(true);
//         setError(null);
//         let detector;

//         try {
//           // Only BlazePose will be used now
//           const detectorConfig = {
//             runtime: "mediapipe",
//             modelType: "full",
//             enableSmoothing: true,
//             solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/pose",
//           };
//           detector = await poseDetection.createDetector(
//             poseDetection.SupportedModels.BlazePose,
//             detectorConfig
//           );
//           console.log("BlazePose model loaded");
//         } catch (modelError) {
//           console.error("Error creating detector:", modelError);
//           setError(
//             `Failed to initialize BlazePose model: ${modelError.message}`
//           );
//           setModelLoading(false);
//           return;
//         }

//         setModelLoading(false);
//         let lastFrameTime = 0;
//         const frameInterval = 200;

//         // Pose Detection Logic
//         const detectPose = async (timestamp) => {
//           if (timestamp - lastFrameTime < frameInterval) {
//             requestAnimationFrame(detectPose);
//             return;
//           }

//           lastFrameTime = timestamp;

//           if (
//             webcamRef.current &&
//             webcamRef.current.video &&
//             webcamRef.current.video.readyState === 4 &&
//             canvasRef.current
//           ) {
//             const video = webcamRef.current.video;
//             try {
//               const poses = await detector.estimatePoses(video);
//               const ctx = canvasRef.current.getContext("2d");
//               if (!ctx) return requestAnimationFrame(detectPose);

//               canvasRef.current.width = video.videoWidth;
//               canvasRef.current.height = video.videoHeight;
//               ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

//               const keypoints = poses?.[0]?.keypoints;
//               const keypoints3D = poses?.[0]?.keypoints3D;

//               // Only proceed if keypoints are found
//               if (keypoints && keypoints.length > 0) {
//                 // Store keypoints for every frame
//                 setFrames((prevFrames) => {
//                   const newFrames = [...prevFrames, { keypoints, timestamp }];
//                   return newFrames.filter(
//                     (frame) => timestamp - frame.timestamp < 10000
//                   ); // Keep only frames from the last 10 seconds
//                 });

//                 // After 10 seconds, provide feedback
//                 if (frames.length >= 10) {
//                   const feedbackPrompt = generateFeedbackPrompt(
//                     exerciseType,
//                     frames
//                   );
//                   const feedback = await getGroqFeedback(feedbackPrompt);
//                   setLiveFeedback(feedback);
//                   setCooldownTime(10); // Cooldown of 10 seconds
//                   setFrames([]); // Reset frames after feedback
//                 }

//                 drawKeypoints(keypoints, ctx);
//                 drawSkeleton(keypoints, ctx);
//               } else {
//                 setNoPerson(true);
//               }
//             } catch (error) {
//               console.error("Pose estimation error:", error);
//             }
//           }

//           requestAnimationFrame(detectPose);
//         };

//         requestAnimationFrame(detectPose);
//         return () => detector?.dispose?.();
//       } catch (err) {
//         console.error("Pose detection error:", err);
//         setError(`Failed to start detection: ${err.message}`);
//         setModelLoading(false);
//       }
//     };

//     const cleanupFn = runPoseDetection();
//     return () => {
//       if (typeof cleanupFn?.then === "function") {
//         cleanupFn.catch((err) => console.error("Cleanup error:", err));
//       } else if (typeof cleanupFn === "function") {
//         cleanupFn();
//       }
//     };
//   }, [backendReady, activeTab, frames]);

//   // Feedback Generation Based on Exercise Type
//   const generateFeedbackPrompt = (exerciseType, frames) => {
//     const startFrame = frames[0].keypoints3D;
//     const endFrame = frames[frames.length - 1].keypoints3D;

//     // Get knee angles at the start and end of the movement
//     const leftKneeAngleStart = calculateAngle3D(
//       startFrame[24],
//       startFrame[26],
//       startFrame[28]
//     );
//     const rightKneeAngleStart = calculateAngle3D(
//       startFrame[23],
//       startFrame[25],
//       startFrame[27]
//     );
//     const leftKneeAngleEnd = calculateAngle3D(
//       endFrame[24],
//       endFrame[26],
//       endFrame[28]
//     );
//     const rightKneeAngleEnd = calculateAngle3D(
//       endFrame[23],
//       endFrame[25],
//       endFrame[27]
//     );

//     // Get hip positions at the start and end of the movement
//     const leftHipStart = startFrame[11];
//     const rightHipStart = startFrame[12];
//     const leftHipEnd = endFrame[11];
//     const rightHipEnd = endFrame[12];

//     let prompt = "";
//     if (exerciseType === "squat") {
//       prompt = `
//       A user is performing a squat. The knee angles at the start and end of the movement are:
//       - Left Knee (Start): ${leftKneeAngleStart.toFixed(1)}°
//       - Right Knee (Start): ${rightKneeAngleStart.toFixed(1)}°
//       - Left Knee (End): ${leftKneeAngleEnd.toFixed(1)}°
//       - Right Knee (End): ${rightKneeAngleEnd.toFixed(1)}°
//       The left hip at the start is at position ${leftHipStart.z.toFixed(
//         1
//       )} and at the end is at position ${leftHipEnd.z.toFixed(1)}.
//       The right hip at the start is at position ${rightHipStart.z.toFixed(
//         1
//       )} and at the end is at position ${rightHipEnd.z.toFixed(1)}.

//       Provide corrective feedback on the squatting form based on these angles.
//       If knees are > 150°, too upright. If < 90°, too deep.
//       If hips are not aligned, adjust posture.
//     `;
//     } else if (exerciseType === "lunge") {
//       prompt = `
//       A user is performing a lunge. The knee angles are:
//       - Left Knee (Start): ${leftKneeAngleStart.toFixed(1)}°
//       - Right Knee (Start): ${rightKneeAngleStart.toFixed(1)}°
//       - Left Knee (End): ${leftKneeAngleEnd.toFixed(1)}°
//       - Right Knee (End): ${rightKneeAngleEnd.toFixed(1)}°
//       Ensure that the hips are square and aligned during the lunge.
//       If the knee extends too far past the toes, correct form.
//     `;
//     } else if (exerciseType === "leg raise") {
//       prompt = `
//       A user is performing a leg raise. The hip angle is ${leftHip.z.toFixed(
//         1
//       )} for the left leg and ${rightHip.z.toFixed(1)} for the right leg.
//       Ensure the leg is not too low or too high, keep it controlled during the movement.
//     `;
//     } else if (exerciseType === "leg extension") {
//       prompt = `
//       A user is performing a leg extension. The knee angle is:
//       - Left Knee: ${leftKneeAngleStart.toFixed(1)}°
//       - Right Knee: ${rightKneeAngleStart.toFixed(1)}°
//       Keep the knee fully extended and control the movement.
//     `;
//     } else if (exerciseType === "hamstring curl") {
//       prompt = `
//       A user is performing a hamstring curl. The knee angle is:
//       - Left Knee: ${leftKneeAngleStart.toFixed(1)}°
//       - Right Knee: ${rightKneeAngleStart.toFixed(1)}°
//       Ensure that the knee is not hyperextending during the curl.
//     `;
//     }

//     return prompt;
//   };

//   return (
//     <div className="app">
//       <div className="tab-nav">
//         <button
//           className={`tab-button ${activeTab === "keypoints" ? "active" : ""}`}
//           onClick={() => setActiveTab("keypoints")}
//         >
//           2D Keypoints
//         </button>
//         <button
//           className={`tab-button ${activeTab === "about" ? "active" : ""}`}
//           onClick={() => setActiveTab("about")}
//         >
//           About
//         </button>
//       </div>
//       <div className="content">
//         {activeTab === "keypoints" && (
//           <div className="keypoints-container full-view">
//             <h2 className="heading">
//               2D Keypoint Detection
//               <div className="exercise-selector">
//                 <select
//                   onChange={(e) => setExerciseType(e.target.value)}
//                   value={exerciseType}
//                 >
//                   <option value="squat">Squat</option>
//                   <option value="lunge">Lunge</option>
//                   <option value="legRaise">Leg Raise</option>
//                   <option value="legExtension">Leg Extension</option>
//                   <option value="hamstringCurl">Hamstring Curl</option>
//                 </select>
//               </div>
//             </h2>
//             <div className="detection-content">
//               <Webcam
//                 ref={webcamRef}
//                 className="webcam"
//                 videoConstraints={{
//                   width: { ideal: 1280 },
//                   height: { ideal: 720 },
//                   facingMode: "user",
//                 }}
//               />
//               <canvas ref={canvasRef} className="detection-canvas" />
//               {liveFeedback && (
//                 <div className="live-feedback status-message info-message">
//                   <strong>Feedback:</strong> {liveFeedback}
//                 </div>
//               )}
//               {cooldownTime > 0 && (
//                 <div className="status-message info-message">
//                   Next feedback in: {cooldownTime}s
//                 </div>
//               )}
//               {modelLoading && (
//                 <div className="status-message info-message">
//                   Loading BlazePose model...
//                 </div>
//               )}
//               {noPerson && (
//                 <div className="status-message warning-message">
//                   No person detected
//                 </div>
//               )}
//               {error && (
//                 <div className="status-message error-message">
//                   Error: {error}
//                 </div>
//               )}
//               {!backendReady && !error && (
//                 <div className="status-message info-message">
//                   Initializing TensorFlow.js...
//                 </div>
//               )}
//             </div>
//           </div>
//         )}
//         {activeTab === "about" && (
//           <div className="about-container">
//             <h2 className="heading">About Computer Vision Features</h2>
//             <div className="about-content">
//               <p>
//                 This app shows real-time pose detection using TensorFlow.js.
//               </p>
//               <ul>
//                 <li>
//                   <strong>BlazePose:</strong> More accurate, 33 keypoints
//                 </li>
//               </ul>
//               <p>
//                 All processing is local in your browser—no video is sent to a
//                 server.
//               </p>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default App;

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

const drawSkeleton = (keypoints, ctx) => {
  let adjacentPairs = poseDetection.util.getAdjacentPairs(
    poseDetection.SupportedModels.BlazePose
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
  const [liveFeedback, setLiveFeedback] = useState("");
  const [cooldownTime, setCooldownTime] = useState(0);
  const [exerciseType, setExerciseType] = useState("squat"); // Default to "squat"
  const [frames, setFrames] = useState([]); // Store frames for feedback calculation

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

  // Setup Backend
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
        } catch (modelError) {
          console.error("Error creating detector:", modelError);
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
              const ctx = canvasRef.current.getContext("2d");
              if (!ctx) return requestAnimationFrame(detectPose);

              canvasRef.current.width = video.videoWidth;
              canvasRef.current.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

              const keypoints = poses?.[0]?.keypoints;
              // const keypoints3D = poses?.[0]?.keypoints3D;

              // Only proceed if keypoints are found
              if (keypoints && keypoints.length > 0) {
                // Store keypoints for every frame
                setFrames((prevFrames) => {
                  const newFrames = [...prevFrames, { keypoints, timestamp }];
                  return newFrames.filter(
                    (frame) => timestamp - frame.timestamp < 10000
                  ); // Keep only frames from the last 10 seconds
                });

                // After 10 seconds, provide feedback
                if (frames.length >= 10) {
                  const feedbackPrompt = generateFeedbackPrompt(
                    exerciseType,
                    frames
                  );
                  const feedback = await getGroqFeedback(feedbackPrompt);
                  setLiveFeedback(feedback);
                  setCooldownTime(10); // Cooldown of 10 seconds
                  setFrames([]); // Reset frames after feedback
                }

                drawKeypoints(keypoints, ctx);
                drawSkeleton(keypoints, ctx);
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
  }, [backendReady, activeTab, frames, exerciseType]);

  // Feedback Generation Based on Exercise Type
  const generateFeedbackPrompt = (exerciseType, frames) => {
    // Ensure frames are available and valid
    const startFrame = frames[0]?.keypoints3D;
    const endFrame = frames[frames.length - 1]?.keypoints3D;

    if (!startFrame || !endFrame) {
      console.error("Error: keypoints3D data is not available.");
      return "Error: Keypoints data is missing.";
    }

    // Get knee angles at the start and end of the movement
    const leftKneeAngleStart = calculateAngle3D(
      startFrame[24],
      startFrame[26],
      startFrame[28]
    );
    const rightKneeAngleStart = calculateAngle3D(
      startFrame[23],
      startFrame[25],
      startFrame[27]
    );
    const leftKneeAngleEnd = calculateAngle3D(
      endFrame[24],
      endFrame[26],
      endFrame[28]
    );
    const rightKneeAngleEnd = calculateAngle3D(
      endFrame[23],
      endFrame[25],
      endFrame[27]
    );

    // Get hip positions at the start and end of the movement
    const leftHipStart = startFrame[11]; // Left hip is at index 11
    const rightHipStart = startFrame[12]; // Right hip is at index 12
    const leftHipEnd = endFrame[11]; // Left hip is at index 11
    const rightHipEnd = endFrame[12]; // Right hip is at index 12

    // Ensure that hip data exists
    if (!leftHipStart || !rightHipStart || !leftHipEnd || !rightHipEnd) {
      console.error("Error: Hip keypoints data is missing.");
      return "Error: Hip keypoints data is missing.";
    }

    let prompt = "";
    if (exerciseType === "squat") {
      prompt = `
      A user is performing a squat. The knee angles at the start and end of the movement are:
      - Left Knee (Start): ${leftKneeAngleStart.toFixed(1)}°
      - Right Knee (Start): ${rightKneeAngleStart.toFixed(1)}°
      - Left Knee (End): ${leftKneeAngleEnd.toFixed(1)}°
      - Right Knee (End): ${rightKneeAngleEnd.toFixed(1)}°
      The left hip at the start is at position ${leftHipStart.z.toFixed(
        1
      )} and at the end is at position ${leftHipEnd.z.toFixed(1)}.
      The right hip at the start is at position ${rightHipStart.z.toFixed(
        1
      )} and at the end is at position ${rightHipEnd.z.toFixed(1)}.

      Provide corrective feedback on the squatting form based on these angles.
      If knees are > 150°, too upright. If < 90°, too deep.
      If hips are not aligned, adjust posture.
    `;
    } else if (exerciseType === "lunge") {
      prompt = `
      A user is performing a lunge. The knee angles are:
      - Left Knee (Start): ${leftKneeAngleStart.toFixed(1)}°
      - Right Knee (Start): ${rightKneeAngleStart.toFixed(1)}°
      - Left Knee (End): ${leftKneeAngleEnd.toFixed(1)}°
      - Right Knee (End): ${rightKneeAngleEnd.toFixed(1)}°
      Ensure that the hips are square and aligned during the lunge.
      If the knee extends too far past the toes, correct form.
    `;
    } else if (exerciseType === "leg raise") {
      prompt = `
      A user is performing a leg raise. The hip angle is ${leftHipStart.z.toFixed(
        1
      )} for the left leg and ${rightHipStart.z.toFixed(1)} for the right leg.
      Ensure the leg is not too low or too high, keep it controlled during the movement.
    `;
    } else if (exerciseType === "leg extension") {
      prompt = `
      A user is performing a leg extension. The knee angle is:
      - Left Knee: ${leftKneeAngleStart.toFixed(1)}°
      - Right Knee: ${rightKneeAngleStart.toFixed(1)}°
      Keep the knee fully extended and control the movement.
    `;
    } else if (exerciseType === "hamstring curl") {
      prompt = `
      A user is performing a hamstring curl. The knee angle is:
      - Left Knee: ${leftKneeAngleStart.toFixed(1)}°
      - Right Knee: ${rightKneeAngleStart.toFixed(1)}°
      Ensure that the knee is not hyperextending during the curl.
    `;
    }

    return prompt;
  };

  // const generateFeedbackPrompt = (exerciseType, frames) => {
  //   const startFrame = frames[0].keypoints3D;
  //   const endFrame = frames[frames.length - 1].keypoints3D;

  //   if (!startFrame || !endFrame) {
  //     console.error("Error: keypoints3D data is not available.");
  //     return "Error: Keypoints data is missing.";
  //   }

  //   // Get knee angles at the start and end of the movement
  //   const leftKneeAngleStart = calculateAngle3D(
  //     startFrame[24],
  //     startFrame[26],
  //     startFrame[28]
  //   );
  //   const rightKneeAngleStart = calculateAngle3D(
  //     startFrame[23],
  //     startFrame[25],
  //     startFrame[27]
  //   );
  //   const leftKneeAngleEnd = calculateAngle3D(
  //     endFrame[24],
  //     endFrame[26],
  //     endFrame[28]
  //   );
  //   const rightKneeAngleEnd = calculateAngle3D(
  //     endFrame[23],
  //     endFrame[25],
  //     endFrame[27]
  //   );

  //   // Get hip positions at the start and end of the movement (leftHip and rightHip)
  //   const leftHipStart = startFrame[11]; // Left hip is at index 11
  //   const rightHipStart = startFrame[12]; // Right hip is at index 12
  //   const leftHipEnd = endFrame[11]; // Left hip is at index 11
  //   const rightHipEnd = endFrame[12]; // Right hip is at index 12

  //   // Ensure that hip data exists
  //   if (!leftHipStart || !rightHipStart || !leftHipEnd || !rightHipEnd) {
  //     console.error("Error: Hip keypoints data is missing.");
  //     return "Error: Hip keypoints data is missing.";
  //   }

  //   let prompt = "";
  //   if (exerciseType === "squat") {
  //     prompt = `
  //     A user is performing a squat. The knee angles at the start and end of the movement are:
  //     - Left Knee (Start): ${leftKneeAngleStart.toFixed(1)}°
  //     - Right Knee (Start): ${rightKneeAngleStart.toFixed(1)}°
  //     - Left Knee (End): ${leftKneeAngleEnd.toFixed(1)}°
  //     - Right Knee (End): ${rightKneeAngleEnd.toFixed(1)}°
  //     The left hip at the start is at position ${leftHipStart.z.toFixed(
  //       1
  //     )} and at the end is at position ${leftHipEnd.z.toFixed(1)}.
  //     The right hip at the start is at position ${rightHipStart.z.toFixed(
  //       1
  //     )} and at the end is at position ${rightHipEnd.z.toFixed(1)}.

  //     Provide corrective feedback on the squatting form based on these angles.
  //     If knees are > 150°, too upright. If < 90°, too deep.
  //     If hips are not aligned, adjust posture.
  //   `;
  //   } else if (exerciseType === "lunge") {
  //     prompt = `
  //     A user is performing a lunge. The knee angles are:
  //     - Left Knee (Start): ${leftKneeAngleStart.toFixed(1)}°
  //     - Right Knee (Start): ${rightKneeAngleStart.toFixed(1)}°
  //     - Left Knee (End): ${leftKneeAngleEnd.toFixed(1)}°
  //     - Right Knee (End): ${rightKneeAngleEnd.toFixed(1)}°
  //     Ensure that the hips are square and aligned during the lunge.
  //     If the knee extends too far past the toes, correct form.
  //   `;
  //   } else if (exerciseType === "leg raise") {
  //     prompt = `
  //     A user is performing a leg raise. The hip angle is ${leftHip.z.toFixed(
  //       1
  //     )} for the left leg and ${rightHip.z.toFixed(1)} for the right leg.
  //     Ensure the leg is not too low or too high, keep it controlled during the movement.
  //   `;
  //   } else if (exerciseType === "leg extension") {
  //     prompt = `
  //     A user is performing a leg extension. The knee angle is:
  //     - Left Knee: ${leftKneeAngleStart.toFixed(1)}°
  //     - Right Knee: ${rightKneeAngleStart.toFixed(1)}°
  //     Keep the knee fully extended and control the movement.
  //   `;
  //   } else if (exerciseType === "hamstring curl") {
  //     prompt = `
  //     A user is performing a hamstring curl. The knee angle is:
  //     - Left Knee: ${leftKneeAngleStart.toFixed(1)}°
  //     - Right Knee: ${rightKneeAngleStart.toFixed(1)}°
  //     Ensure that the knee is not hyperextending during the curl.
  //   `;
  //   }

  //   return prompt;
  // };

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
              <div className="exercise-selector">
                <select
                  onChange={(e) => setExerciseType(e.target.value)}
                  value={exerciseType}
                >
                  <option value="squat">Squat</option>
                  <option value="lunge">Lunge</option>
                  <option value="legRaise">Leg Raise</option>
                  <option value="legExtension">Leg Extension</option>
                  <option value="hamstringCurl">Hamstring Curl</option>
                </select>
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
              {cooldownTime > 0 && (
                <div className="status-message info-message">
                  Next feedback in: {cooldownTime}s
                </div>
              )}
              {cooldownTime > 0 && (
                <div className="status-message info-message">
                  Next feedback in: {cooldownTime}s
                </div>
              )}
              {modelLoading && (
                <div className="status-message info-message">
                  Loading BlazePose model...
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
