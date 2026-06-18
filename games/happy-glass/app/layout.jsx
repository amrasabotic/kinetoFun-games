import Script from 'next/script';
import './globals.css';

export const metadata = {
  title: 'Happy Glass',
  description: 'Guide water into the glass using hand gestures',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          strategy="beforeInteractive"
          src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
          crossOrigin="anonymous"
        />
        <Script
          strategy="beforeInteractive"
          src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}
