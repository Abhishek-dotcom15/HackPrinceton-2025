import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import ExerciseList from './ExerciseList';

function LandingPage() {
  const { loginWithRedirect, logout, isAuthenticated, user } = useAuth0();
  const navigate = useNavigate(); // Hook for navigation

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/exercises'); // Navigate to /exercises after login
    }
  }, [isAuthenticated, navigate]);

  return (
    <div style={styles.container}>
      {!isAuthenticated ? (
        <div style={styles.landing}>
          <div style={styles.leftSection}>
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
          </div>
          <div style={styles.rightSection}>
            <h2>Log In to Get Started</h2>
            <button style={styles.button} onClick={() => loginWithRedirect()}>
              Log In
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.authenticated}>
          <h1 style={styles.title}>Welcome, {user.name}!</h1>
          <ExerciseList />
          <div style={styles.logoutSection}>
            <button
              style={styles.logoutButton}
              onClick={() => logout({ returnTo: window.location.origin })}
            >
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  landing: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
    textAlign: 'left',
    paddingRight: '20px',
  },
  rightSection: {
    flex: 1,
    textAlign: 'center',
    borderLeft: '1px solid #ccc',
    paddingLeft: '20px',
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
  },
  authenticated: {
    textAlign: 'center',
  },
  logoutSection: {
    marginTop: '20px',
    textAlign: 'center',
  },
  logoutButton: {
    padding: '8px 16px',
    fontSize: '0.9rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#f44336',
    color: 'white',
    cursor: 'pointer',
  },
};

export default LandingPage;