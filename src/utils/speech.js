export const speakText = (text) => {
  if ("speechSynthesis" in window) {
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();

    // Choose a preferred natural-sounding voice (modify as needed)
    const preferredVoice = voices.find(
      (voice) =>
        voice.name.includes("Google") ||
        voice.name.includes("Samantha") || // macOS
        voice.name.includes("Microsoft") // Windows
    );

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.pitch = 1.2;
    utterance.rate = 1.2;
    utterance.volume = 1;

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    synth.cancel(); // Stop any current speech
    synth.speak(utterance);
  } else {
    console.warn("Text-to-speech not supported in this browser.");
  }
};
