// pages/ExerciseList.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

const exercises = [
  { name: 'Bird Dog', image: '🦅', description: 'Core + balance' },
  { name: 'Plank', image: '🪵', description: 'Core + shoulders' },
  { name: 'Bridge', image: '🌉', description: 'Glutes + hamstrings' },
];

export default function ExerciseList() {
  const navigate = useNavigate();

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
  }
};
