import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Dumpling Maker',
  description: 'Logistics and production engine for social cooking events.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrains.variable}`}>
        <div className="app-shell">
          <nav className="topbar">
            <div className="container topbar-content">
              <a href="/" className="brand" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
                <img src="/dumpling-logo.png" alt="Dumpling Maker" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                <span>Dumpling Maker</span>
              </a>
              <div className="nav-links">
                <a href="/events" className="nav-link">Events</a>
                <a href="/recipes" className="nav-link">Recipes</a>
                <a href="/staging" className="nav-link active">+ Ingest</a>
              </div>
            </div>
          </nav>
          <main className="container main-content">
            {children}
          </main>
          <footer className="footer">
            <p>Dumpling Maker &copy; 2025</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
