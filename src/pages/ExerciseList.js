import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

const exercises = [
  { name: 'Squat', image: '🏋️‍♂️', value: 'squat', description: 'Glutes + quads' },
  { name: 'Lunge', image: '🦵', value: 'lunge', description: 'Quads + balance' },
  { name: 'Leg Raise', image: '🪜', value: 'legRaise', description: 'Core + flexors' },
  { name: 'Leg Extension', image: '🦿', value: 'legExtension', description: 'Quads + strength' },
  { name: 'Hamstring Curl', image: '🏃‍♂️', value: 'hamstringCurl', description: 'Hamstrings + control' },
];

export default function ExerciseList() {
  const navigate = useNavigate();
  const { logout } = useAuth0();
  const [darkMode, setDarkMode] = useState(false);
  const [hovered, setHovered] = useState(null);

  const toggleMode = () => setDarkMode(!darkMode);

  return (
    <div
      style={{
        ...styles.container,
        background: darkMode ? '#121212' : 'linear-gradient(to right, #f9f9f9, #eef2f3)',
        color: darkMode ? '#f5f5f5' : '#121212',
      }}
    >
      {/* Dark Mode + Back Button */}
      <div style={styles.topBar}>
        <button style={styles.backButton} onClick={() => navigate('/')}>← Back</button>
        <button style={styles.toggleButton} onClick={toggleMode}>
          {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>

      <h1 style={styles.title}>Choose Your Exercise</h1>

      <div style={styles.grid}>
        {exercises.map((ex) => (
          <div
            key={ex.name}
            onClick={() => navigate(`/exercise/${ex.value}`)}
            onMouseEnter={() => setHovered(ex.name)}
            onMouseLeave={() => setHovered(null)}
            style={{
              ...styles.card,
              ...(hovered === ex.name ? styles.cardHover : {}),
              backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
              boxShadow: hovered === ex.name
                ? '0 10px 25px rgba(0,0,0,0.3)'
                : darkMode
                ? '0 4px 10px rgba(255,255,255,0.1)'
                : '0 4px 8px rgba(0,0,0,0.1)',
              color: darkMode ? '#f5f5f5' : '#121212',
            }}
          >
            <div style={styles.icon}>{ex.image}</div>
            <h3>{ex.name}</h3>
            <p>{ex.description}</p>
          </div>
        ))}
      </div>

      <div style={styles.logoutSection}>
        <button
          style={styles.logoutButton}
          onClick={() => {
            logout({ returnTo: window.location.origin });
            setTimeout(() => {
              window.location.href = window.location.origin;
            }, 200);
          }}
        >
          Log Out
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    textAlign: 'center',
    minHeight: '100vh',
    padding: '40px 20px',
    fontFamily: "'Poppins', sans-serif",
    transition: 'all 0.4s ease',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '40px',
    fontWeight: 'bold',
  },
  toggleButton: {
    padding: '8px 16px',
    fontSize: '0.9rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#333',
    color: 'white',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
  },
  backButton: {
    padding: '8px 16px',
    fontSize: '0.9rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#666',
    color: 'white',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
  },
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '30px',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  card: {
    borderRadius: '16px',
    padding: '30px 20px',
    width: '240px',
    height: '240px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHover: {
    transform: 'translateY(-6px)',
  },
  icon: {
    fontSize: '4rem',
    marginBottom: '10px',
  },
  logoutSection: {
    marginTop: '40px',
  },
  logoutButton: {
    padding: '10px 20px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#f44336',
    color: 'white',
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
    transition: 'background 0.2s ease-in-out',
  },
};
