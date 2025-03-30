# MoveMend - Real-Time Pose Detection Application

MoveMend is a real-time pose detection web application built using TensorFlow.js, BlazePose, and React. It allows users to perform various exercises while receiving real-time feedback on their form, focusing on key movement angles, posture, and joint alignments. The application can detect poses using 3D keypoints and provide physiotherapist-style feedback to improve exercise performance.

## Features

- **Pose Detection**: Uses TensorFlow.js with BlazePose for real-time pose detection and 3D keypoint extraction.
- **Exercise Feedback**: Provides feedback based on exercise types (e.g., Squat, Lunge, Leg Raise, etc.) with dynamic cues.
- **Real-Time Feedback**: Physiotherapist-style feedback generated based on key angles and posture.
- **Dynamic Exercise Type**: The exercise type (e.g., Squat, Lunge) is dynamically passed through the URL.
- **Model Switching**: Option to switch between BlazePose and MoveNet models for pose estimation.
- **Speech Audio Feedback**: Provides real-time audio feedback, delivering verbal cues to improve exercise performance.
  
## Technologies Used

- **React**: Frontend framework for building the user interface.
- **TensorFlow.js**: Machine learning library used for pose detection in the browser.
- **BlazePose**: Pose detection model for extracting 33 keypoints, including 3D keypoints.
- **React Router**: Used for navigating between pages such as exercises and real-time camera feed.
- **Groq API**: Provides real-time, physiotherapist-style feedback based on the pose estimation results.
  
## Setup and Installation

### Prerequisites

- Node.js (v12 or later)
- npm (or yarn)

### Steps to Run Locally

1. **Clone the repository and install dependencies. Start the Node server once installed**:

   ```bash
   git clone https://github.com/khyatip19/HackPrinceton-2025.git
   cd HackPrinceton-2025
   npm install
   npm start
2. Create a .env file in the root directory and add your GROQ API key

3. Open your browser and navigate to http://localhost:3000 to view the application. 

## Backend (Optional)

If you want to run the backend with FastAPI for generating SMPL-X models (e.g., for detailed 3D mesh visualizations), follow these steps:


   ```

1. **Set up a Python virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows use venv\Scripts\activate
   ```

2. **Install backend dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the FastAPI server**:
   ```bash
   uvicorn app:app --reload
   ```

The backend will be available at [http://localhost:8000](http://localhost:8000).



## How It Works

### Pose Detection
The app uses the TensorFlow.js BlazePose model to estimate poses in real-time. The model detects 33 body keypoints, which are then processed and used to generate feedback for improving exercise form.

- BlazePose provides 3D keypoints which are essential for understanding the joint angles and overall body posture during exercises.

### Feedback Generation
Once the pose is detected, the app calculates key joint angles (e.g., knee angles, hip angles) and compares them with the expected ranges for the exercise. Physiotherapist-style feedback is then generated based on the angles and posture.

- The feedback is sent to the frontend and displayed dynamically for the user.
- Groq API is used to generate detailed feedback based on the detected 3D pose data.

### Exercise Types
Users can select from a variety of exercises, including:

- Squat
- Lunge
- Leg Raise
- Leg Extension
- Hamstring Curl
- Push-Up
- Plank
- Deadlift
- Shoulder Press
- Bicep Curl

Each exercise type has specific criteria for posture correction and form.

# MoveMend Project Structure

```
/MoveMend
├── /src
│   ├── /components
│   │   ├── Pose3DViewer.jsx       # Component for displaying 3D pose visualization
│   │   ├── FeedbackEngine.jsx     # Component for generating and displaying feedback
│   ├── /pages
│   │   ├── LandingPage.jsx        # Landing page
│   │   ├── ExerciseList.jsx       # Exercise selection page
│   │   ├── ExerciseCamera.jsx     # Camera page with pose detection and feedback
│   ├── /utils
│   │   ├── angles.js              # Angle calculation utility for joint angles
│   │   ├── groq.js                # Utility for integrating with Groq API for feedback
├── /public
│   ├── index.html                 # HTML entry point
└── package.json
```


## Troubleshooting

- **No person detected**: Make sure you are in a well-lit area and facing the camera correctly.

- **Pose detection issues**: Ensure that TensorFlow.js has successfully initialized the backend (WebGL or CPU).

- **Feedback not showing**: Ensure that keypoints are being detected and that feedback is being generated every 15 seconds.


[https://youtu.be/5RaJ6HMRXPQ](https://youtu.be/5RaJ6HMRXPQ)
