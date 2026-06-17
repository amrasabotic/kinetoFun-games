'use client';
import dynamic from 'next/dynamic';

const MouthOpenCatchGame = dynamic(
  () => import('../components/MouthOpenCatchGame'),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center w-full h-full"
         style={{ background: '#0F0A1E', color: '#fff', fontFamily: 'Nunito, sans-serif', fontSize: 24 }}>
      Loading Chompy…
    </div>
  )}
);

export default function Page() {
  return <MouthOpenCatchGame />;
}
