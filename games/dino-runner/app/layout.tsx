import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dino Runner — KinetoFun',
  description: 'Chrome Dino Runner controlled by hand gestures. Open palm to jump, fist to duck.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.js"
          strategy="beforeInteractive"
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}
