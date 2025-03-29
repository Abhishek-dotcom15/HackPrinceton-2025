import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export default function AuthPages() {
  const { loginWithRedirect, logout, isAuthenticated, user } = useAuth0();

  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <h1>Welcome to PhysioPose</h1>
      {!isAuthenticated ? (
        <button onClick={() => loginWithRedirect()} style={styles.button}>
          Log In
        </button>
      ) : (
        <div>
          <p>Welcome, {user.name}!</p>
          <button onClick={() => logout({ returnTo: window.location.origin })} style={styles.button}>
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  button: {
    padding: '12px 24px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#4CAF50',
    color: 'white',
    cursor: 'pointer',
  },
};