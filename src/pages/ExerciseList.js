import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

const exercises = [
  { name: 'Bird Dog', image: '🦅', description: 'Core + balance' },
  { name: 'Plank', image: '🪵', description: 'Core + shoulders' },
  { name: 'Bridge', image: '🌉', description: 'Glutes + hamstrings' },
];

export default function ExerciseList() {
  const navigate = useNavigate();
  const { logout } = useAuth0(); // Import logout function from Auth0

  return (
    <div style={styles.container}>
      <h1>Choose Your Exercise</h1>
      <div style={styles.grid}>
        {exercises.map((ex) => (
          <div
            key={ex.name}
            style={styles.card}
            onClick={() => navigate(`/exercise/${ex.name.toLowerCase()}`)}
          >
            <div style={styles.icon}>{ex.image}</div>
            <h3>{ex.name}</h3>
            <p>{ex.description}</p>
          </div>
        ))}
      </div>
      {/* Logout Button */}
      <div style={styles.logoutSection}>
        <button
          style={styles.logoutButton}
          onClick={() => {
            console.log('Logging out...');
            logout({ returnTo: window.location.origin });
            setTimeout(() => {
              window.location.href = window.location.origin; // Force redirection
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
    padding: '20px',
  },
  grid: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    flexWrap: 'wrap',
  },
  card: {
    border: '1px solid #ccc',
    borderRadius: '10px',
    padding: '20px',
    width: '180px',
    cursor: 'pointer',
    backgroundColor: '#f9f9f9',
    transition: '0.3s',
  },
  icon: {
    fontSize: '2.5rem',
  },
  logoutSection: {
    marginTop: '20px',
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