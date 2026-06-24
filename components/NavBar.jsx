'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function NavBar() {
  const pathname = usePathname();
  
  // Do not show on unauthenticated pages
  if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
    return null;
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <nav style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '15px 30px', 
      background: 'var(--surface-1)',
      borderBottom: '1px solid var(--surface-2)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--accent-purple)' }}>
        Pokémon Battle App
      </div>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Link href="/lobby" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}>Lobby</Link>
        <Link href="/team-builder" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}>Team Builder</Link>
        <Link href="/friends" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}>Friends</Link>
        <Link href="/profile" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}>Profile</Link>
        <button 
          onClick={handleLogout}
          style={{
            background: 'transparent',
            border: '1px solid var(--accent-purple)',
            color: 'var(--text-primary)',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'background 0.2s'
          }}
          onMouseOver={e => e.target.style.background = 'rgba(108, 99, 255, 0.1)'}
          onMouseOut={e => e.target.style.background = 'transparent'}
        >
          Log Out
        </button>
      </div>
    </nav>
  );
}
