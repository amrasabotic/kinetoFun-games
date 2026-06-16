import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'World Explorer 🌍',
  description: 'Educational geography game with gesture controls',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0f0c29] overflow-hidden">{children}</body>
    </html>
  );
}
