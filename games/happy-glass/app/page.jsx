import dynamic from 'next/dynamic';

const HappyGlassGame = dynamic(
  () => import('@/components/games/HappyGlass/HappyGlassGame'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', height: '100vh', background: '#1a237e', color: '#90caf9',
        fontFamily: 'sans-serif', fontSize: 18, letterSpacing: '0.1em',
      }}>
        LOADING…
      </div>
    ),
  }
);

export default function HappyGlassPage() {
  return (
    <main style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100%', height: '100vh', background: '#1a237e',
    }}>
      <HappyGlassGame />
    </main>
  );
}
