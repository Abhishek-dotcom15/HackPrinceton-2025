import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';

const ReferencecExerciseView = ({ useWebcam, onVideoRef }) => {
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoFileRef = useRef(null);
  const [videoURL, setVideoURL] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoURL(url);
    }
  };

  return (
    <div style={{ width: 640, height: 480, border: '1px solid gray' }}>
      {useWebcam ? (
        <Webcam
          ref={(ref) => {
            webcamRef.current = ref;
            if (onVideoRef) onVideoRef(ref);
          }}
          style={{ width: '100%', height: '100%' }}
          videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
        />
      ) : (
        <>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            ref={fileInputRef}
          />
          {videoURL && (
            <video
              ref={(ref) => {
                videoFileRef.current = ref;
                if (onVideoRef) onVideoRef(ref);
              }}
              src={videoURL}
              style={{ width: '100%', height: '100%' }}
              controls
            />
          )}
        </>
      )}
    </div>
  );
};

export default ReferencecExerciseView;