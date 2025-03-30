import { useEffect, useRef, useState } from 'react';
import { calculateAngle3D } from '../utils/angles';
import { getGroqFeedback } from '../utils/groq';

const FeedbackEngine = ({ keypoints3D, modelType, onFeedback, exerciseType, frames }) => {
  const lastFeedbackRef = useRef(Date.now());
  const [feedbackSent, setFeedbackSent] = useState(false);  // Track feedback status

  useEffect(() => {
    const sendFeedback = async () => {
      if (!keypoints3D || modelType !== 'blazepose') return;

      const now = Date.now();
      if (now - lastFeedbackRef.current < 15000) return; // 15 seconds cooldown

      lastFeedbackRef.current = now;

      const startFrame = frames[0]?.keypoints3D;
      const endFrame = frames[frames.length - 1]?.keypoints3D;

      if (!startFrame || !endFrame) {
        console.error('Error: keypoints3D data is not available.');
        return; // Return early if data is missing
      }

      // Get knee angles at the start and end of the movement
      const leftKneeAngleStart = calculateAngle3D(startFrame[24], startFrame[26], startFrame[28]);
      const rightKneeAngleStart = calculateAngle3D(startFrame[23], startFrame[25], startFrame[27]);
      const leftKneeAngleEnd = calculateAngle3D(endFrame[24], endFrame[26], endFrame[28]);
      const rightKneeAngleEnd = calculateAngle3D(endFrame[23], endFrame[25], endFrame[27]);

      // Get hip positions at the start and end of the movement
      const leftHipStart = startFrame[11];
      const rightHipStart = startFrame[12];
      const leftHipEnd = endFrame[11];
      const rightHipEnd = endFrame[12];

      if (!leftHipStart || !rightHipStart || !leftHipEnd || !rightHipEnd) {
        console.error('Error: Hip keypoints data is missing.');
        return;
      }

      const exerciseListPrompts = {
        "squat": `A user is performing a squat:
          - Left Knee (Start): ${leftKneeAngleStart.toFixed(1)}°
          - Right Knee (Start): ${rightKneeAngleStart.toFixed(1)}°
          - Left Knee (End): ${leftKneeAngleEnd.toFixed(1)}°
          - Right Knee (End): ${rightKneeAngleEnd.toFixed(1)}°
          - Left Hip Z: ${leftHipStart.z.toFixed(1)} → ${leftHipEnd.z.toFixed(1)}
          - Right Hip Z: ${rightHipStart.z.toFixed(1)} → ${rightHipEnd.z.toFixed(1)}
        
          Give 2–3 short physiotherapist-style cues.`,
    
        "lunge": `A user is performing a lunge:
          - Left Knee (Start): ${leftKneeAngleStart.toFixed(1)}°
          - Right Knee (Start): ${rightKneeAngleStart.toFixed(1)}°
          - Left Knee (End): ${leftKneeAngleEnd.toFixed(1)}°
          - Right Knee (End): ${rightKneeAngleEnd.toFixed(1)}°
        
          Give 2–3 short physiotherapist-style corrections.`,
    
        "legRaise": `A user is performing a leg raise:
          - Left Hip Z: ${leftHipStart.z.toFixed(1)}
          - Right Hip Z: ${rightHipStart.z.toFixed(1)}
        
          Give 2–3 brief physiotherapy-style form cues.`,
    
        "legExtension": `A user is doing a leg extension:
          - Left Knee: ${leftKneeAngleStart.toFixed(1)}°
          - Right Knee: ${rightKneeAngleStart.toFixed(1)}°
        
          Provide 2–3 short corrections on form.`,
    
        "hamstringCurl": `A user is performing a hamstring curl:
          - Left Knee: ${leftKneeAngleStart.toFixed(1)}°
          - Right Knee: ${rightKneeAngleStart.toFixed(1)}°
        
          Give 2–3 short physiotherapist-style corrections.`,
    
        
      };
    
      const prompt = exerciseListPrompts[exerciseType];

      const feedback = await getGroqFeedback(prompt);
      onFeedback(feedback);

      setFeedbackSent(true);
    };

    if (!feedbackSent) {
      sendFeedback();
    }
  }, [keypoints3D, modelType, onFeedback, exerciseType, frames]);

  return null;
};

export default FeedbackEngine;
