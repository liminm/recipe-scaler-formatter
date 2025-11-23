import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

import IdleDumplingManager from '@/components/IdleDumplingManager';
import NavBar from '@/components/NavBar';
import { DebugProvider } from '@/context/DebugContext';

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
        <DebugProvider>
          <IdleDumplingManager />
          <div className="app-shell">
            <NavBar />
            <main className="container main-content">
              {children}
            </main>
            <footer className="footer">
              <p>Dumpling Maker &copy; 2025</p>
            </footer>
          </div>
        </DebugProvider>
      </body>
    </html>
  );
}
