import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';

const App = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [noPerson, setNoPerson] = useState(false);

  useEffect(() => {
    const runPoseDetection = async () => {
      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        }
      );

      const detectPose = async () => {
        if (
          webcamRef.current &&
          webcamRef.current.video.readyState === 4
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

      detectPose();
    };

    runPoseDetection();
  }, []);

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
    </div>
  );
};

export default App;
