import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Nunito } from 'next/font/google';
import './globals.css';


import NavBar from '@/components/NavBar';
import { ChiliProvider } from '@/context/ChiliContext';
import ModelSettings from '@/components/ModelSettings';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', weight: ['700', '800'] });

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
      <body className={`${inter.variable} ${jetbrains.variable} ${nunito.variable}`}>
        <ChiliProvider>

          <div className="app-shell">
            <NavBar />
            <main className="container main-content">
              {children}
            </main>
            <footer className="footer">
              <p>Dumpling Maker &copy; 2025</p>
            </footer>
            <ModelSettings />
          </div>
        </ChiliProvider>
      </body>
    </html>
  );
}
