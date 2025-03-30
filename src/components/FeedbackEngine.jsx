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
      // const midIndex = Math.floor(frames.length / 2);
      // const midFrame = frames[midIndex]?.keypoints3D;

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
      // const leftHipStart = startFrame[11];
      // const rightHipStart = startFrame[12];
      // const leftHipEnd = endFrame[11];
      // const rightHipEnd = endFrame[12];

      // Hip angles (between spine and thigh)
      const leftHipAngleStart = calculateAngle3D(startFrame[12], startFrame[24], startFrame[26]);
      const rightHipAngleStart = calculateAngle3D(startFrame[11], startFrame[23], startFrame[25]);
      const leftHipAngleEnd = calculateAngle3D(endFrame[12], endFrame[24], endFrame[26]);
      const rightHipAngleEnd = calculateAngle3D(endFrame[11], endFrame[23], endFrame[25]);

      // Ankle angles
      const leftAnkleAngleStart = calculateAngle3D(startFrame[26], startFrame[28], startFrame[32]);
      const rightAnkleAngleStart = calculateAngle3D(startFrame[25], startFrame[27], startFrame[31]);
      const leftAnkleAngleEnd = calculateAngle3D(endFrame[26], endFrame[28], endFrame[32]);
      const rightAnkleAngleEnd = calculateAngle3D(endFrame[25], endFrame[27], endFrame[31]);

      // Vertical and z-positions
      const kneeHeightDiffStart = Math.abs(startFrame[26].y - startFrame[25].y);
      const kneeHeightDiffEnd = Math.abs(endFrame[26].y - endFrame[25].y);
      const hipHeightStart = (startFrame[23].y + startFrame[24].y) / 2;
      const hipHeightEnd = (endFrame[23].y + endFrame[24].y) / 2;
      const hipHeightChange = hipHeightStart - hipHeightEnd;

      // Hip positions for tracking movement
      const leftHipStart = startFrame[24];
      const rightHipStart = startFrame[23];
      const leftHipEnd = endFrame[24];
      const rightHipEnd = endFrame[23];
      
      // Track spine angle (between shoulders and hips)
      const spineAngleStart = calculateAngle3D(
        {x: (startFrame[11].x + startFrame[12].x)/2, y: (startFrame[11].y + startFrame[12].y)/2, z: (startFrame[11].z + startFrame[12].z)/2}, // midpoint of shoulders
        {x: (startFrame[23].x + startFrame[24].x)/2, y: (startFrame[23].y + startFrame[24].y)/2, z: (startFrame[23].z + startFrame[24].z)/2}, // midpoint of hips
        {x: (startFrame[23].x + startFrame[24].x)/2, y: (startFrame[23].y + startFrame[24].y)/2, z: (startFrame[23].z + startFrame[24].z)/2 + 1} // point directly below hips
      );
      const spineAngleEnd = calculateAngle3D(
        {x: (endFrame[11].x + endFrame[12].x)/2, y: (endFrame[11].y + endFrame[12].y)/2, z: (endFrame[11].z + endFrame[12].z)/2}, 
        {x: (endFrame[23].x + endFrame[24].x)/2, y: (endFrame[23].y + endFrame[24].y)/2, z: (endFrame[23].z + endFrame[24].z)/2},
        {x: (endFrame[23].x + endFrame[24].x)/2, y: (endFrame[23].y + endFrame[24].y)/2, z: (endFrame[23].z + endFrame[24].z)/2 + 1}
      );

      // Calculate the maximum range of motion
      let lowestHipHeight = hipHeightStart;
      let deepestLeftKneeAngle = leftKneeAngleStart;
      let deepestRightKneeAngle = rightKneeAngleStart;
      
      frames.forEach(frame => {
        if (frame.keypoints3D) {
          const hipHeight = (frame.keypoints3D[23].y + frame.keypoints3D[24].y) / 2;
          if (hipHeight < lowestHipHeight) lowestHipHeight = hipHeight;
          
          const leftKneeAngle = calculateAngle3D(frame.keypoints3D[24], frame.keypoints3D[26], frame.keypoints3D[28]);
          if (leftKneeAngle < deepestLeftKneeAngle) deepestLeftKneeAngle = leftKneeAngle;
          
          const rightKneeAngle = calculateAngle3D(frame.keypoints3D[23], frame.keypoints3D[25], frame.keypoints3D[27]);
          if (rightKneeAngle < deepestRightKneeAngle) deepestRightKneeAngle = rightKneeAngle;
        }
      });


      if (!leftHipStart || !rightHipStart || !leftHipEnd || !rightHipEnd) {
        console.error('Error: Hip keypoints data is missing.');
        return;
      }

      const exerciseListPrompts = {
        "squat": `You are an experienced physiotherapist analyzing a squat exercise. Give specific form feedback based on this data:

KNEE ANGLES:
- Left knee started at ${leftKneeAngleStart.toFixed(1)}° and ended at ${leftKneeAngleEnd.toFixed(1)}°
- Right knee started at ${rightKneeAngleStart.toFixed(1)}° and ended at ${rightKneeAngleEnd.toFixed(1)}°
- Deepest knee flexion: left ${deepestLeftKneeAngle.toFixed(1)}°, right ${deepestRightKneeAngle.toFixed(1)}°

HIP ANGLES:
- Left hip started at ${leftHipAngleStart.toFixed(1)}° and ended at ${leftHipAngleEnd.toFixed(1)}°
- Right hip started at ${rightHipAngleStart.toFixed(1)}° and ended at ${rightHipAngleEnd.toFixed(1)}°

POSTURE:
- Spine angle at start: ${spineAngleStart.toFixed(1)}° (90° is upright)
- Spine angle at deepest point: ${spineAngleEnd.toFixed(1)}°
- Hip height change: ${hipHeightChange.toFixed(1)} units

SYMMETRY:
- Knee height difference at start: ${kneeHeightDiffStart.toFixed(2)} units
- Knee height difference at end: ${kneeHeightDiffEnd.toFixed(2)} units

ASSESSMENT GUIDELINES:
- Ideal knee range at bottom of squat: 90-110° (not too shallow or deep)
- Spine should remain relatively vertical (angle close to 90°)
- Knees should track over toes, not collapse inward
- Weight should be evenly distributed (similar angles on both sides)
- Proper depth shown by significant hip height change

Provide 3 specific, actionable form cues a physiotherapist would give. Be direct and concise.`,
    
        "lunge": `You are an experienced physiotherapist analyzing a lunge exercise. Give specific form feedback based on this data:

KNEE ANGLES:
- Front knee started at ${leftKneeAngleStart.toFixed(1)}° and ended at ${leftKneeAngleEnd.toFixed(1)}°
- Back knee started at ${rightKneeAngleStart.toFixed(1)}° and ended at ${rightKneeAngleEnd.toFixed(1)}°

ANKLE ANGLES:
- Front ankle flexibility: ${leftAnkleAngleStart.toFixed(1)}° → ${leftAnkleAngleEnd.toFixed(1)}°
- Back ankle position: ${rightAnkleAngleStart.toFixed(1)}° → ${rightAnkleAngleEnd.toFixed(1)}°

POSTURE AND ALIGNMENT:
- Spine angle: ${spineAngleStart.toFixed(1)}° (90° is upright)
- Hip height difference: ${hipHeightChange.toFixed(1)} units
- Front/back knee horizontal distance: ${Math.abs(leftHipStart.z - rightHipStart.z).toFixed(1)} units

STABILITY:
- Knee wobble (side-to-side movement): ${kneeHeightDiffEnd.toFixed(2)} units
- Hip stability: ${Math.abs(leftHipEnd.x - leftHipStart.x).toFixed(2)} units of lateral shift

ASSESSMENT GUIDELINES:
- Front knee should be at ~90° at lowest point and track over ankle (not past toes)
- Back knee should lower to ~90° ideally
- Torso should remain upright (not leaning forward excessively)
- Hips should stay square (not rotating or tilting)
- Step length should allow proper knee angles in both legs

Provide 3 specific, actionable form cues a physiotherapist would give. Be direct and concise.`,
    
        "legRaise": `You are an experienced physiotherapist analyzing a leg raise exercise. Give specific form feedback based on this data:

LEG POSITION:
- Left leg height change: ${(leftHipStart.y - leftHipEnd.y).toFixed(1)} units
- Right leg height change: ${(rightHipStart.y - rightHipEnd.y).toFixed(1)} units
- Hip extension at peak: left ${leftHipAngleEnd.toFixed(1)}°, right ${rightHipAngleEnd.toFixed(1)}°

CORE STABILITY:
- Pelvis tilt change: ${Math.abs(leftHipStart.z - leftHipEnd.z).toFixed(1)} units
- Lateral hip shift: ${Math.abs(leftHipEnd.x - leftHipStart.x).toFixed(2)} units 
- Spine alignment: ${spineAngleStart.toFixed(1)}° → ${spineAngleEnd.toFixed(1)}°

LEG CONTROL:
- Knee extension: left ${leftKneeAngleStart.toFixed(1)}° → ${leftKneeAngleEnd.toFixed(1)}°
- Knee extension: right ${rightKneeAngleStart.toFixed(1)}° → ${rightKneeAngleEnd.toFixed(1)}°

ASSESSMENT GUIDELINES:
- Legs should remain straight during raise (knee angle ~180°)
- Lower back should remain in contact with floor (minimal pelvic tilt)
- Movement should be controlled, not using momentum
- Appropriate range of motion without compromising form
- Core should remain engaged throughout movement

Provide 3 specific, actionable form cues a physiotherapist would give. Be direct and concise.`,
    
        "legExtension": `You are an experienced physiotherapist analyzing a leg extension exercise. Give specific form feedback based on this data:

KNEE EXTENSION:
- Left knee ROM: ${leftKneeAngleStart.toFixed(1)}° → ${leftKneeAngleEnd.toFixed(1)}°
- Right knee ROM: ${rightKneeAngleStart.toFixed(1)}° → ${rightKneeAngleEnd.toFixed(1)}°
- Extension quality: ${Math.abs(leftKneeAngleEnd - 180).toFixed(1)}° from full extension

HIP STABILITY:
- Hip movement during extension: ${Math.abs(leftHipEnd.y - leftHipStart.y).toFixed(2)} units
- Hip rotation (medial/lateral): ${Math.abs(leftHipEnd.z - leftHipStart.z).toFixed(2)} units
- Compensation patterns: ${spineAngleEnd - spineAngleStart > 5 ? "Possible spine movement detected" : "Spine position stable"}

CONTROL & EXECUTION:
- Starting position stability: ${Math.abs(leftKneeAngleStart - 90).toFixed(1)}° from ideal 90° start
- Symmetry between sides: ${Math.abs(leftKneeAngleEnd - rightKneeAngleEnd).toFixed(1)}° difference

ASSESSMENT GUIDELINES:
- Movement should start at ~90° knee flexion
- Extension should reach near full extension (~170-180°)
- Hips should remain stable (minimal movement)
- Movement should be controlled in both directions
- No compensation from other muscle groups or body parts
- Equal strength and range shown on both sides

Provide 3 specific, actionable form cues a physiotherapist would give. Be direct and concise.`,
    
        "hamstringCurl": `You are an experienced physiotherapist analyzing a hamstring curl exercise. Give specific form feedback based on this data:

KNEE FLEXION:
- Left knee ROM: ${leftKneeAngleStart.toFixed(1)}° → ${leftKneeAngleEnd.toFixed(1)}°
- Right knee ROM: ${rightKneeAngleStart.toFixed(1)}° → ${rightKneeAngleEnd.toFixed(1)}°
- Flexion quality: ${Math.min(leftKneeAngleEnd, rightKneeAngleEnd).toFixed(1)}° (lower is better flexion)

HIP STABILITY:
- Hip movement during curl: ${Math.abs(leftHipEnd.y - leftHipStart.y).toFixed(2)} units
- Hip rotation: ${Math.abs(leftHipEnd.z - leftHipStart.z).toFixed(2)} units
- Pelvis stability: ${Math.abs(spineAngleEnd - spineAngleStart).toFixed(1)}° change

CONTROL & EXECUTION:
- Starting position: ${Math.abs(leftKneeAngleStart - 180).toFixed(1)}° from ideal straight leg
- Symmetry between sides: ${Math.abs(leftKneeAngleEnd - rightKneeAngleEnd).toFixed(1)}° difference

ASSESSMENT GUIDELINES:
- Movement should start with legs relatively straight (~170-180°)
- Knee flexion should be significant (ideally <90° at peak contraction)
- Hips and pelvis should remain stable throughout movement
- Movement should be controlled in both directions
- No compensation using momentum or other muscle groups
- Equal strength and range shown on both sides

Provide 3 specific, actionable form cues a physiotherapist would give. Be direct and concise.`,  
      };
    
      const prompt = exerciseListPrompts[exerciseType] || 
        `You are an experienced physiotherapist. Analyze this exercise data and provide 3 specific form cues:
        
        JOINT ANGLES:
        - Left knee: ${leftKneeAngleStart.toFixed(1)}° → ${leftKneeAngleEnd.toFixed(1)}°
        - Right knee: ${rightKneeAngleStart.toFixed(1)}° → ${rightKneeAngleEnd.toFixed(1)}°
        - Hip angles: left ${leftHipAngleStart.toFixed(1)}° → ${leftHipAngleEnd.toFixed(1)}°, right ${rightHipAngleStart.toFixed(1)}° → ${rightHipAngleEnd.toFixed(1)}°
        - Spine angle: ${spineAngleStart.toFixed(1)}° → ${spineAngleEnd.toFixed(1)}°
        
        MOVEMENT PATTERNS:
        - Height change: ${hipHeightChange.toFixed(1)} units
        - Symmetry: ${Math.abs(leftKneeAngleEnd - rightKneeAngleEnd).toFixed(1)}° difference between sides
        
        Provide 3 specific, actionable form cues a physiotherapist would give. Be direct and concise.`;

      console.log(`Using prompt for exercise type: ${exerciseType}`);
      console.log(prompt);

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
