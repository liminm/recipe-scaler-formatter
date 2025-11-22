import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Food Processor',
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
              <a href="/" className="brand">
                Food Processor
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
            <p>Food Processor &copy; 2025</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
