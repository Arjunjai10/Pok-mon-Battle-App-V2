import '../styles/globals.css';
import { Inter, Geist } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${geist.variable}`}>
      <body style={{ margin: 0, fontFamily: 'var(--font-geist), var(--font-inter), sans-serif' }}>
        <nav style={{ display: 'flex', gap: '10px', padding: '10px', background: 'var(--surface-1)' }}>
          <a href="/lobby">Lobby</a>
          <a href="/team-builder">Team Builder</a>
          <a href="/profile">Profile</a>
          <a href="/friends">Friends</a>
          <a href="/login">Login</a>
        </nav>
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
