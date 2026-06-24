'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './NavBar.module.css';

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
    <nav className={styles.nav}>
      <div className={styles.brand}>
        Pokémon Battle App
      </div>
      <div className={styles.links}>
        <Link href="/lobby" className={styles.link}>Lobby</Link>
        <Link href="/team-builder" className={styles.link}>Team Builder</Link>
        <Link href="/friends" className={styles.link}>Friends</Link>
        <Link href="/profile" className={styles.link}>Profile</Link>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          Log Out
        </button>
      </div>
    </nav>
  );
}
