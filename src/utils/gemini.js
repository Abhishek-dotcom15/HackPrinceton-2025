export async function getSquatFeedback({ leftKneeAngle, rightKneeAngle }) {
  const prompt = `
A user is performing a squat. The knee angles are:
- Left knee angle: ${leftKneeAngle.toFixed(1)} degrees
- Right knee angle: ${rightKneeAngle.toFixed(1)} degrees

As a physiotherapy expert, provide corrective feedback if form is not proper.
If knees are above 150°, they're too upright. If below 90°, it's too deep.
Otherwise, give positive reinforcement.
`;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=AIzaSyA16Jty5EA8nHqSmMl1oCC-DiyDbSf0NQY",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await response.json();
  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text || "No feedback generated"
  );
}
