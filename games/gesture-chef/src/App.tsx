import { useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import { HomeScreen } from './components/screens/HomeScreen';
import { RecipeSelectionScreen } from './components/screens/RecipeSelectionScreen';
import { ResultsScreen } from './components/screens/ResultsScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { MinigameWrapper } from './components/minigames/MinigameWrapper';
import { audioManager } from './utils/audio';
import { saveProgress } from './utils/storage';
import { DEFAULT_PROGRESS } from './utils/storage';
import { cameraInputProvider } from './input/CameraInputProvider';
import type { Difficulty } from './types';

export default function App() {
  const {
    screen, selectedRecipe, currentMinigameIndex,
    currentMinigameType, settings, progress, lastSession,
    navigateTo, selectRecipe, completeMinigame, updateSettings,
  } = useGameState();

  // Sync audio settings on mount and changes
  useEffect(() => {
    audioManager.setSoundEnabled(settings.soundEnabled);
    audioManager.setMusicEnabled(settings.musicEnabled);
  }, [settings.soundEnabled, settings.musicEnabled]);

  // Manage camera input provider lifecycle
  useEffect(() => {
    const shouldRunCamera = screen === 'playing' && settings.cameraEnabled;

    if (shouldRunCamera && !cameraInputProvider.isActive()) {
      cameraInputProvider.start().catch(err => {
        console.error('Failed to start camera:', err);
      });
    } else if (!shouldRunCamera && cameraInputProvider.isActive()) {
      cameraInputProvider.stop();
    }

    return () => {
      if (cameraInputProvider.isActive()) {
        cameraInputProvider.stop();
      }
    };
  }, [screen, settings.cameraEnabled]);

  const handleDifficultyChange = (d: Difficulty) => {
    updateSettings({ ...settings, difficulty: d });
  };

  const handleResetProgress = () => {
    if (window.confirm('Reset all stars, scores, and unlocked recipes?')) {
      saveProgress(DEFAULT_PROGRESS);
      window.location.reload();
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* ── Home ── */}
      {screen === 'home' && (
        <HomeScreen
          totalStars={progress.totalStars}
          bestScore={progress.bestScore}
          settings={settings}
          onPlay={() => navigateTo('recipe-select')}
          onSettings={() => navigateTo('settings')}
        />
      )}

      {/* ── Recipe Selection ── */}
      {screen === 'recipe-select' && (
        <RecipeSelectionScreen
          progress={progress}
          settings={settings}
          onSelectRecipe={selectRecipe}
          onBack={() => navigateTo('home')}
          onDifficultyChange={handleDifficultyChange}
        />
      )}

      {/* ── Playing (minigame sequence) ── */}
      {screen === 'playing' && selectedRecipe && currentMinigameType && (
        <MinigameWrapper
          key={`${selectedRecipe.id}-${currentMinigameIndex}`}
          minigameType={currentMinigameType}
          minigameIndex={currentMinigameIndex}
          totalMinigames={selectedRecipe.minigames.length}
          recipeName={selectedRecipe.name}
          difficulty={settings.difficulty}
          cameraEnabled={settings.cameraEnabled}
          onComplete={completeMinigame}
        />
      )}

      {/* ── Results ── */}
      {screen === 'results' && lastSession && (
        <ResultsScreen
          session={lastSession}
          onPlayAgain={() => {
            if (lastSession) selectRecipe(lastSession.recipe);
          }}
          onHome={() => navigateTo('home')}
        />
      )}

      {/* ── Settings ── */}
      {screen === 'settings' && (
        <SettingsScreen
          settings={settings}
          onUpdate={updateSettings}
          onBack={() => navigateTo('home')}
          totalStars={progress.totalStars}
          onResetProgress={handleResetProgress}
        />
      )}
    </div>
  );
}
