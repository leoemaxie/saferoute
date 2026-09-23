import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SafeRoute — Community Safety Signals',
  description:
    'Transparent, time-sensitive safety intelligence from community reports. Evidence, corroboration, and recency — never unverified safety claims.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-void-black text-pure-white antialiased">{children}</body>
    </html>
  );
}
