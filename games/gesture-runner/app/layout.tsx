import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gesture Runner — KinetoFun',
  description: 'Run, jump, slide and dodge with your body! Camera-based gesture game.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ background: '#000818' }}>
      <body>
        {/* MediaPipe CDN Scripts — loaded after interactive so they don't block render */}
        <Script
          src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1620248257/drawing_utils.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        {children}
      </body>
    </html>
  );
}
