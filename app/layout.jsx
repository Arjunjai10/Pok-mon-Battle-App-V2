import '../styles/globals.css';
import { Inter, Geist } from 'next/font/google';
import NavBar from '../components/NavBar';
import PageTransition from '../components/PageTransition';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata = {
  title: 'Pokémon Battle App',
  description: 'Battle with your favorite Pokémon online!',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${geist.variable}`}>
      <body style={{ margin: 0, fontFamily: 'var(--font-geist), var(--font-inter), sans-serif', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <NavBar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </body>
    </html>
  )
}
