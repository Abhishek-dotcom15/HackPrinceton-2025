import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import ExerciseList from './ExerciseList';

function LandingPage() {
  const { loginWithRedirect, logout, isAuthenticated, user } = useAuth0();
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/exercises');
    }

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isAuthenticated, navigate]);

  const sharedSectionStyle = {
    flex: 1,
    textAlign: isMobile ? 'center' : 'left',
    padding: isMobile ? '0' : '0 40px',
  };

  return (
    <div style={styles.page}>
      <div style={styles.overlay}>
        {!isAuthenticated ? (
          <div
            style={{
              ...styles.landing,
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '40px' : '0',
              textAlign: isMobile ? 'center' : 'left',
            }}
          >
            <div style={sharedSectionStyle}>
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

            <div
              style={{
                ...sharedSectionStyle,
                borderLeft: isMobile ? 'none' : '2px solid rgba(255,255,255,0.2)',
                paddingLeft: isMobile ? 0 : '40px',
              }}
            >
              <h2 style={{ marginBottom: '1.5rem' }}>Log In to Get Started</h2>
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
    fontFamily: "'Poppins', sans-serif",
    minHeight: '100vh',
    backgroundImage: 'url(/image2.avif)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    position: 'relative',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(5px)',
    minHeight: '100vh',
    padding: '40px 20px',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  landing: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    width: '100%',
  },
  title: {
    fontSize: '2.5rem',
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
    fontSize: '1.1rem',
    lineHeight: '1.6',
    maxWidth: '600px',
    color: '#f0f0f0',
    margin: '0 auto',
  },
  list: {
    marginTop: '1rem',
    lineHeight: '2rem',
    paddingLeft: '1.5rem',
    fontSize: '1.05rem',
    color: '#e0e0e0',
    textAlign: 'left',
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
