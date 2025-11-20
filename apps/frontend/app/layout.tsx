import type { Metadata } from 'next';
import { Inter, Archivo_Black } from 'next/font/google';
import '../styles/globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const archivoBlack = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-archivo',
});

export const metadata: Metadata = {
  title: 'Blockbuster - Decentralized Streaming on Sui',
  description: 'The Blockbuster they can\'t kill. Built on Sui blockchain.',
  keywords: ['streaming', 'blockchain', 'Sui', 'NFT', 'Web3', 'decentralized'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${archivoBlack.variable}`}>
      <body className="bg-grid-bg text-white font-body">
        <Providers>
          <div className="min-h-screen">
            {/* Grid background effect */}
            <div className="fixed inset-0 bg-grid-pattern bg-[length:50px_50px] opacity-10 pointer-events-none animate-grid-move" />

            {/* Content */}
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
