import dynamic from 'next/dynamic';

// DinoGame uses camera + canvas — must be client-only, no SSR
const DinoGame = dynamic(() => import('@/components/games/dino/DinoGame'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100vh',
        background: '#f7f7f7',
        fontFamily: '"Courier New", monospace',
        color: '#535353',
        fontSize: 14,
        letterSpacing: '0.15em',
      }}
    >
      LOADING…
    </div>
  ),
});

export default function DinoPage() {
  return (
    <main
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100vh',
        background: '#e8e8e8',
        padding: '0 16px',
      }}
    >
      <DinoGame />
    </main>
  );
}
