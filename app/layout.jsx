export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'sans-serif' }}>
        <nav style={{ display: 'flex', gap: '10px', padding: '10px', background: '#eee' }}>
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
