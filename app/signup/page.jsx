'use client';
import { useState } from 'react';

export default function Signup() {
  const [userID, setUserID] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userID, password })
    });
    if (res.ok) {
      window.location.href = '/lobby';
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Sign Up</h1>
      <form onSubmit={handleSignup}>
        <div><input placeholder="UserID" value={userID} onChange={e => setUserID(e.target.value)} /></div>
        <div><input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
        <button type="submit">Sign Up</button>
      </form>
      {error && <p style={{color: 'red'}}>{error}</p>}
      <a href="/login">Already have an account? Login</a>
    </div>
  );
}
