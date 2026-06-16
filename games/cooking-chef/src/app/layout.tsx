import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cooking Chef — KinetoFun',
  description: 'A premium TV cooking adventure controlled entirely by hand gestures.',
};

/*
 * Fix for MediaPipe SIMD WASM abort on newer Chrome:
 *   "Module.thisProgram/arguments has been replaced with plain ..."
 *
 * Root cause: Emscripten bootstrap installs throwing getters on Module.thisProgram
 * and Module.arguments (to catch accidental access), but then the SIMD JS glue
 * re-accesses them, triggering the throw → abort.
 *
 * Fix: Pre-initialize Module with real values BEFORE MediaPipe loads, so the
 * getters never install. This avoids breaking Emscripten's internal FS layer
 * (which uses Object.defineProperty legitimately) while preventing the throwing
 * getters from ever being created.
 */
const MP_FIX = `;(function(){
  window.Module=window.Module||{};
  window.Module.thisProgram='hands';
  window.Module.arguments=[];
  window.Module.quit=function(code){console.error('MediaPipe quit with code:',code);};
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
        {/* Synchronous inline fix — must be raw <script> in <head>, not a Next.js Script component */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: MP_FIX }} />
      </head>
      <body>
        {/* MediaPipe CDN — loaded via Next.js afterInteractive so the head fix runs first */}
        <Script
          src="https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1675466124/drawing_utils.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        {children}
      </body>
    </html>
  );
}
