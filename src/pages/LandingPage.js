// pages/LandingPage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🧘‍♀️ PhysioPose</h1>
      <p style={styles.text}>
        Welcome to PhysioPose – your AI-powered physiotherapy companion. We use advanced pose estimation to help you recover with better form and real-time feedback!
      </p>
      <h2>How it Works</h2>
      <ol>
        <li>Select an exercise</li>
        <li>Enable your camera</li>
        <li>Follow on-screen pose corrections</li>
      </ol>
      <button style={styles.button} onClick={() => navigate('/exercises')}>
        Get Started
      </button>
    </div>
  );
}

const styles = {
  container: {
    textAlign: 'center',
    padding: '40px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  title: {
    fontSize: '3rem',
    marginBottom: '20px',
  },
  text: {
    fontSize: '1.2rem',
    marginBottom: '30px',
  },
  button: {
    padding: '12px 24px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#4CAF50',
    color: 'white',
    cursor: 'pointer',
  }
};
