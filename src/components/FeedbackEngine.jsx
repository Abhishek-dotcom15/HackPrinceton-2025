// src/components/FeedbackEngine.jsx
import { useEffect, useRef } from 'react';
import { calculateAngle3D } from '../utils/angles';
import { getGroqFeedback } from '../utils/groq';

const FeedbackEngine = ({ keypoints3D, modelType, onFeedback }) => {
  const lastFeedbackRef = useRef(Date.now());

  useEffect(() => {
    const sendFeedback = async () => {
      if (!keypoints3D || modelType !== 'blazepose') return;

      const now = Date.now();
      if (now - lastFeedbackRef.current < 15000) return;

      lastFeedbackRef.current = now;

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
- Left Knee: ${leftKneeAngle?.toFixed(1)}°
- Right Knee: ${rightKneeAngle?.toFixed(1)}°
Provide corrective feedback if form is improper.
If knees are > 150°, too upright. If < 90°, too deep.
Otherwise, encourage good form.
      `;

      const feedback = await getGroqFeedback(prompt);
      onFeedback(feedback);
    };

    sendFeedback();
  }, [keypoints3D, modelType, onFeedback]);

  return null;
};

export default FeedbackEngine;
