import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import ExerciseList from './ExerciseList';

function LandingPage() {
  const { loginWithRedirect, logout, isAuthenticated, user } = useAuth0();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/exercises');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div style={styles.page}>
      <div style={styles.overlay}>
        {!isAuthenticated ? (
          <div style={styles.landing}>
            <div style={styles.leftSection}>
              <h1 style={styles.title}>🧘‍♀️ MoveMend</h1>
              <p style={styles.text}>
                Welcome to <strong>MoveMend</strong> – your AI-powered physiotherapy companion.
                <br />
                We use advanced pose estimation to help you recover with better form and real-time feedback!
              </p>
              <h2 style={styles.subheading}>How it Works</h2>
              <ol style={styles.list}>
                <li>✅ Select an exercise</li>
                <li>🎥 Enable your camera</li>
                <li>🧠 Follow on-screen pose corrections</li>
              </ol>
            </div>
            <div style={styles.rightSection}>
              <h2>Log In to Get Started</h2>
              <button style={styles.button} onClick={loginWithRedirect}>
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
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "'Poppins', sans-serif", // 👈 Add this line
    minHeight: '100vh',
    backgroundImage: 'url(/image2.avif)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    position: 'relative',
  },
  overlay: {
    fontFamily: "'Poppins', sans-serif", // Optional
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(5px)', // ✨ Added blur here
    minHeight: '100vh',
    padding: '40px',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  landing: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  leftSection: {
    flex: 1,
    textAlign: 'left',
    paddingRight: '40px',
  },
  rightSection: {
    flex: 1,
    textAlign: 'center',
    borderLeft: '2px solid rgba(255,255,255,0.2)',
    paddingLeft: '40px',
  },
  title: {
    fontSize: '3rem',
    marginBottom: '20px',
    fontWeight: '800',
    color: 'white',
  },
  subheading: {
    fontSize: '1.5rem',
    marginTop: '2rem',
    color: '#fdd835',
  },
  text: {
    fontSize: '1.2rem',
    lineHeight: '1.6',
    maxWidth: '600px',
    color: '#f0f0f0',
  },
  list: {
    marginTop: '1rem',
    lineHeight: '2rem',
    paddingLeft: '1.5rem',
    fontSize: '1.1rem',
    color: '#e0e0e0',
  },
  button: {
    marginTop: '2rem',
    padding: '14px 28px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#4CAF50',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  authenticated: {
    textAlign: 'center',
    paddingTop: '50px',
  },
  logoutSection: {
    marginTop: '20px',
    textAlign: 'center',
  },
  logoutButton: {
    padding: '10px 20px',
    fontSize: '1rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#f44336',
    color: 'white',
    cursor: 'pointer',
  },
};

export default LandingPage;
