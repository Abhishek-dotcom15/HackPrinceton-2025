import { useEffect, useRef, useState } from "react";
import { calculateAngle3D } from "../utils/angles";
import { getGroqFeedback } from "../utils/groq";

const FeedbackEngine = ({
  keypoints3D,
  modelType,
  onFeedback,
  exerciseType,
  frames,
}) => {
  const lastFeedbackRef = useRef(Date.now());
  const [feedbackSent, setFeedbackSent] = useState(false); // Track feedback status

  useEffect(() => {
    const sendFeedback = async () => {
      if (!keypoints3D || modelType !== "blazepose") return;

      const now = Date.now();
      if (now - lastFeedbackRef.current < 15000) return; // 15 seconds cooldown

      lastFeedbackRef.current = now;

      const startFrame = frames[0]?.keypoints3D;
      const endFrame = frames[frames.length - 1]?.keypoints3D;

      if (!startFrame || !endFrame) {
        console.error("Error: keypoints3D data is not available.");
        return; // Return early if data is missing
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
      const leftHipStart = startFrame[24];
      const rightHipStart = startFrame[23];
      const leftHipEnd = endFrame[24];
      const rightHipEnd = endFrame[23];

      if (!leftHipStart || !rightHipStart || !leftHipEnd || !rightHipEnd) {
        console.error("Error: Hip keypoints data is missing.");
        return;
      }
      const exerciseListPrompts = {
        squat: `A user is performing a squat:
- Left Knee Angle (Start): ${leftKneeAngleStart.toFixed(1)}°
- Right Knee Angle (Start): ${rightKneeAngleStart.toFixed(1)}°
- Left Knee Angle (End): ${leftKneeAngleEnd.toFixed(1)}°
- Right Knee Angle (End): ${rightKneeAngleEnd.toFixed(1)}°
- Left Hip Z Movement: ${leftHipStart.z.toFixed(1)} → ${leftHipEnd.z.toFixed(1)}
- Right Hip Z Movement: ${rightHipStart.z.toFixed(1)} → ${rightHipEnd.z.toFixed(
          1
        )}

You are a physiotherapist analyzing a patient's form while performing a ${exerciseType}. Based on the joint angle and hip position data above, provide a short 1–2 sentence clinical assessment as if you were speaking directly to the patient. Be realistic and professional — avoid repeating measurements or giving generic cues. If you notice any imbalance or incorrect movement (e.g., one side not bending, hips not moving, compensations), highlight it gently and suggest a correction in natural language.`,

        lunge: `A user is performing a lunge:
- Left Knee Angle (Start): ${leftKneeAngleStart.toFixed(1)}°
- Right Knee Angle (Start): ${rightKneeAngleStart.toFixed(1)}°
- Left Knee Angle (End): ${leftKneeAngleEnd.toFixed(1)}°
- Right Knee Angle (End): ${rightKneeAngleEnd.toFixed(1)}°
- Left Hip Z Movement: ${leftHipStart.z.toFixed(1)} → ${leftHipEnd.z.toFixed(1)}
- Right Hip Z Movement: ${rightHipStart.z.toFixed(1)} → ${rightHipEnd.z.toFixed(
          1
        )}


You are a physiotherapist analyzing a patient's form while performing a ${exerciseType}. Based on the joint angle and hip position data above, provide a short 1–2 sentence clinical assessment as if you were speaking directly to the patient. Be realistic and professional — avoid repeating measurements or giving generic cues. If you notice any imbalance or incorrect movement (e.g., one side not bending, hips not moving, compensations), highlight it gently and suggest a correction in natural language.`,

        legRaise: `A user is performing a leg raise:
- Left Knee Angle (Start): ${leftKneeAngleStart.toFixed(1)}°
- Right Knee Angle (Start): ${rightKneeAngleStart.toFixed(1)}°
- Left Hip Z Movement: ${leftHipStart.z.toFixed(1)} → ${leftHipEnd.z.toFixed(1)}
- Right Hip Z Movement: ${rightHipStart.z.toFixed(1)} → ${rightHipEnd.z.toFixed(
          1
        )}


You are a physiotherapist analyzing a patient's form while performing a ${exerciseType}. Based on the joint angle and hip position data above, provide a short 1–2 sentence clinical assessment as if you were speaking directly to the patient. Be realistic and professional — avoid repeating measurements or giving generic cues. If you notice any imbalance or incorrect movement (e.g., one side not bending, hips not moving, compensations), highlight it gently and suggest a correction in natural language.`,

        legExtension: `A user is doing a leg extension:
- Left Knee Angle (Start): ${leftKneeAngleStart.toFixed(1)}°
- Right Knee Angle (Start): ${rightKneeAngleStart.toFixed(1)}°
- Left Knee Angle (End): ${leftKneeAngleEnd.toFixed(1)}°
- Right Knee Angle (End): ${rightKneeAngleEnd.toFixed(1)}°

You are a physiotherapist analyzing a patient's form while performing a ${exerciseType}. Based on the joint angle and hip position data above, provide a short 1–2 sentence clinical assessment as if you were speaking directly to the patient. Be realistic and professional — avoid repeating measurements or giving generic cues. If you notice any imbalance or incorrect movement (e.g., one side not bending, hips not moving, compensations), highlight it gently and suggest a correction in natural language.`,

        hamstringCurl: `A user is performing a hamstring curl:
- Left Knee Angle (Start): ${leftKneeAngleStart.toFixed(1)}°
- Right Knee Angle (Start): ${rightKneeAngleStart.toFixed(1)}°
- Left Knee Angle (End): ${leftKneeAngleEnd.toFixed(1)}°
- Right Knee Angle (End): ${rightKneeAngleEnd.toFixed(1)}°


You are a physiotherapist analyzing a patient's form while performing a ${exerciseType}. Based on the joint angle and hip position data above, provide a short 1–2 sentence clinical assessment as if you were speaking directly to the patient. Be realistic and professional — avoid repeating measurements or giving generic cues. If you notice any imbalance or incorrect movement (e.g., one side not bending, hips not moving, compensations), highlight it gently and suggest a correction in natural language.`,
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
