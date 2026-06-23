'use client';
import { useEffect, useState } from 'react';

export default function Friends() {
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState('');

  const loadData = () => {
    fetch('/api/friends')
      .then(r => r.json())
      .then(data => {
        if (data.friends) setFriends(data.friends);
        if (data.pendingRequests) setRequests(data.pendingRequests);
      });
  };

  useEffect(() => {
    fetch('/api/auth/me').then(r => {
      if (!r.ok) window.location.href = '/login';
      return r.json();
    }).then(data => {
      setUser(data.user);
      loadData();
    });
  }, []);

  const sendRequest = async () => {
    if (!search) return;
    const res = await fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserID: search })
    });
    if (res.ok) {
      alert('Request sent');
      setSearch('');
    } else {
      const err = await res.json();
      alert('Error: ' + err.error);
    }
  };

  const handleAction = async (id, action) => {
    const res = await fetch(`/api/friends/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: id })
    });
    if (res.ok) {
      loadData();
    } else {
      const err = await res.json();
      alert('Error: ' + err.error);
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h1>Friends</h1>
      
      <div style={{ marginBottom: 20 }}>
        <h2>Add Friend</h2>
        <input placeholder="Enter UserID" value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={sendRequest}>Send Request</button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h2>Pending Requests</h2>
        {requests.length === 0 && <p>No pending requests.</p>}
        {requests.map(req => (
          <div key={req._id} style={{ border: '1px solid #ccc', padding: 10, marginBottom: 10 }}>
            <p>From: {req.from.userID}</p>
            <button onClick={() => handleAction(req._id, 'accept')}>Accept</button>
            <button onClick={() => handleAction(req._id, 'decline')}>Decline</button>
          </div>
        ))}
      </div>

      <div>
        <h2>Your Friends</h2>
        {friends.length === 0 && <p>You have no friends yet.</p>}
        <ul>
          {friends.map(f => (
            <li key={f._id}>{f.userID}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
