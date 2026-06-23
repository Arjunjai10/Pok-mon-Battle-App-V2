'use client';
import { useEffect, useState } from 'react';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data.user) window.location.href = '/login';
        setUser(data.user);
      })
      .catch(() => window.location.href = '/login');

    fetch('/api/teams')
      .then(r => r.json())
      .then(data => setTeams(data));
  }, []);

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h1>Profile</h1>
      <p>UserID: {user.userID}</p>

      <h2>Saved Teams</h2>
      {teams.length === 0 ? <p>No teams saved.</p> : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {teams.map(t => (
            <div key={t._id} style={{ border: '1px solid #ccc', padding: 10, cursor: 'pointer' }} onClick={() => window.location.href = '/team-builder'}>
              <h3>{t.teamName}</h3>
              <ul>
                {t.pokemon.map((p, i) => (
                  <li key={i}>{p.nickname || `Pokemon ID: ${p.pokemonId}`} {p.heldItem && `(${p.heldItem})`}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
