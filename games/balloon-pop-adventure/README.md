# 🎈 Balloon Pop Adventure

A gesture-controlled balloon-popping arcade game for families, schools, hotels, and events. Players pop floating balloons by touching them with their hands via MediaPipe hand tracking.

---

## Quick Start

```bash
cd games/balloon-pop-adventure
npm install
npm run dev
```

Open `http://localhost:3000` in a Chromium-based browser (Chrome / Chromium on Raspberry Pi).

For TV / Raspberry Pi access from another device on the same network:
```
http://<your-machine-ip>:3000
```

---

## Requirements

- Node.js 18+
- A webcam / USB camera
- Chromium-based browser (Chrome, Edge, Chromium)
- Internet connection on first load (downloads MediaPipe WASM from CDN)
- For offline use after first load: the browser caches the CDN assets

---

## How to Play

1. Stand ~1–2 meters from the camera
2. Raise your hand(s) into frame
3. Touch floating balloons with your fingertips to pop them
4. Special balloons have bonus effects — see below

**No buttons or controllers needed.**

---

## Balloon Types

| Balloon      | Color          | Points | Effect                           |
|-------------|---------------|--------|----------------------------------|
| Regular      | Colorful       | +1     | Basic score                      |
| Golden 🌟   | Gold + sparkle | +5     | Big points!                      |
| Bomb 💣     | Black + red    | -3     | Screen shake, lose points        |
| Freeze ❄️   | Ice blue       | 0      | Slows all balloons for 5s        |
| Rainbow 🌈  | Rainbow glow   | 0      | 2× points for 10s (Combo Mode)  |

---

## Game Modes

| Mode    | Duration | Players | Description                          |
|---------|---------|---------|--------------------------------------|
| Classic | 60s     | 1       | Sprint for the highest score         |
| Endless | ∞       | 1       | Relax and pop until you quit         |
| Party   | 90s     | 2       | Two-hand competition, winner takes all |

---

## Controls

| Control         | Action                      |
|----------------|----------------------------|
| Index fingertip | Pop balloons                |
| Both hands      | Party Mode (2 players)      |
| Pause button    | Pause / resume game         |

---

## Difficulty Progression

| Phase   | Time (seconds) | Changes                              |
|---------|---------------|--------------------------------------|
| Easy    | 0–30          | Slow balloons, few bombs             |
| Medium  | 30–60         | Faster spawn, more specials          |
| Hard    | 60+           | Fast and chaotic — keep up!          |

Difficulty increases smoothly, not in sharp jumps.

---

## Project Structure

```
balloon-pop-adventure/
├── index.html                  # Loads MediaPipe from CDN
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx                # React entry point
    ├── App.tsx
    ├── index.css
    ├── constants/
    │   └── gameConfig.ts       # All tunable constants
    ├── game/
    │   ├── types.ts            # TypeScript interfaces
    │   ├── balloonFactory.ts   # Balloon creation
    │   ├── difficulty.ts       # Difficulty progression
    │   ├── effectsFactory.ts   # Visual effect particles
    │   └── canvasRenderer.ts   # All canvas drawing
    ├── hooks/
    │   ├── useMediaPipe.ts     # MediaPipe hands integration
    │   ├── useGameEngine.ts    # Core game loop & logic
    │   └── useAudio.ts         # Web Audio API sounds
    ├── utils/
    │   ├── storage.ts          # localStorage (high scores, settings)
    │   └── mathUtils.ts        # lerp, randomBetween, etc.
    └── components/
        ├── BalloonGame.tsx     # Root orchestrator
        ├── Menu.tsx            # Home screen
        ├── ModeSelect.tsx      # Game mode picker
        ├── Countdown.tsx       # 3-2-1-POP animation
        ├── HUD.tsx             # In-game display
        ├── PauseScreen.tsx     # Pause overlay
        ├── EndScreen.tsx       # Results + confetti
        └── SettingsPanel.tsx   # Sound toggles
```

---

## Architecture Notes

### Rendering
The game uses a single full-screen HTML5 Canvas for all game elements (balloons, effects, cursors). React components render UI overlays (menu, HUD, countdown) positioned absolute over the canvas. This keeps the 60-FPS game loop completely outside React's render cycle.

### State Management
- **Game state** (balloons, effects, power-ups) lives in a `useRef` inside `useGameEngine` — never React state. This avoids re-renders during the game loop.
- **UI state** (score display, timer, phase) is synced to React state at most ~10× per second.
- **Hand positions** flow through a ref from `useMediaPipe` to `useGameEngine`, bypassing React entirely.

### Audio
Sounds are synthesized in real-time using the Web Audio API — no audio files needed. Each balloon type has a distinct synthesized sound.

### MediaPipe
Loaded via jsDelivr CDN. The WASM and model files are also served from CDN. After the first load, browsers cache them, enabling offline use.

---

## Tuning the Game

Edit `src/constants/gameConfig.ts` to adjust:
- `SPAWN_RATE` — ms between balloon spawns per difficulty
- `BALLOON_SPEED` — balloon rise speed (fraction of screen height per second)
- `SPAWN_WEIGHTS` — relative probability of each balloon type
- `FREEZE_DURATION` / `COMBO_DURATION` — power-up durations
- `HITBOX_MULTIPLIER` — how forgiving the touch detection is (larger = easier)
- `BALLOON_MIN_RADIUS` / `BALLOON_MAX_RADIUS` — balloon sizes

---

## KinetoFun Integration

To integrate into the KinetoFun platform:
1. Export `BalloonGame` from `src/components/BalloonGame.tsx`
2. Mount it as a route: `<Route path="/games/balloon-pop" element={<BalloonGame />} />`
3. The MediaPipe CDN scripts in `index.html` must be present (or move them to the platform's root HTML)
4. `localStorage` keys are prefixed `bpa_*` to avoid collisions with other games

---

## Raspberry Pi Performance Tips

- Use Chromium with hardware acceleration: `chromium-browser --enable-gpu`
- Set `modelComplexity: 0` in `useMediaPipe.ts` (already set — uses the lite model)
- Camera resolution is set to 640×480 for faster processing
- Particle counts are capped per effect type in `gameConfig.ts`
