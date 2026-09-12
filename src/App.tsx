/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine';
import { HUD } from './components/HUD';
import { MenuScreen } from './components/MenuScreen';
import { UpgradesModal } from './components/UpgradesModal';
import { VictoryModal } from './components/VictoryModal';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { EjaculationOverlay } from './components/EjaculationOverlay';
import {
  GameState,
  GameMode,
  SwimmerCustomization,
  SwimmerUpgrades,
  GameStats,
  Swimmer,
  EjaculationPhase,
} from './types';
import { DEFAULT_CUSTOMIZATION, DEFAULT_UPGRADES, UPGRADE_CONFIG } from './game/constants';
import { sound } from './game/sound';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Persistent storage state
  const [customization, setCustomization] = useState<SwimmerCustomization>(() => {
    try {
      const saved = localStorage.getItem('sperm_race_customization');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_CUSTOMIZATION;
  });

  const [upgrades, setUpgrades] = useState<SwimmerUpgrades>(() => {
    try {
      const saved = localStorage.getItem('sperm_race_upgrades');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_UPGRADES;
  });

  const [dnaPoints, setDnaPoints] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sperm_race_dna');
      if (saved) return parseInt(saved, 10) || 50;
    } catch {
      // ignore
    }
    return 80; // Starting DNA points for initial fun upgrades
  });

  const [highScore, setHighScore] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('sperm_race_best_time');
      if (saved) return parseFloat(saved);
    } catch {
      // ignore
    }
    return null;
  });

  // Game UI States
  const [gameState, setGameState] = useState<GameState>('menu');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showUpgrades, setShowUpgrades] = useState<boolean>(false);
  const [currentZoneIndex, setCurrentZoneIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getIsMuted());

  // Drilling Climax State
  const [drillProgress, setDrillProgress] = useState<number>(0);
  const [rivalDrillProgress, setRivalDrillProgress] = useState<number>(0);
  const [ejaculationTimer, setEjaculationTimer] = useState<number>(2.6);
  const [ejaculationPhase, setEjaculationPhase] = useState<EjaculationPhase>('insertion');

  // Player & Stats snapshot for React HUD
  const [playerStatus, setPlayerStatus] = useState<Swimmer | null>(null);
  const [stats, setStats] = useState<GameStats>({
    raceTime: 0,
    distanceTraveled: 0,
    topSpeed: 0,
    atpCollected: 0,
    macrophagesEvaded: 0,
    rank: 1,
    totalCompetitors: 250000000,
    dnaPointsEarned: 0,
  });

  // Save changes to localStorage
  const handleUpdateCustomization = (newCust: SwimmerCustomization) => {
    setCustomization(newCust);
    try {
      localStorage.setItem('sperm_race_customization', JSON.stringify(newCust));
    } catch {
      // ignore
    }
  };

  const handleUpgrade = (stat: keyof SwimmerUpgrades) => {
    const currentLvl = upgrades[stat];
    if (currentLvl >= 5) return;
    const cost = UPGRADE_CONFIG[stat].costs[currentLvl];
    if (dnaPoints >= cost) {
      const updatedUpgrades = {
        ...upgrades,
        [stat]: currentLvl + 1,
      };
      const updatedPoints = dnaPoints - cost;
      setUpgrades(updatedUpgrades);
      setDnaPoints(updatedPoints);
      try {
        localStorage.setItem('sperm_race_upgrades', JSON.stringify(updatedUpgrades));
        localStorage.setItem('sperm_race_dna', String(updatedPoints));
      } catch {
        // ignore
      }
    }
  };

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Canvas resize handler with proper pixel ratio
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  // Initialize Canvas & Engine
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (canvasRef.current && !engineRef.current) {
      const engine = new GameEngine(
        canvasRef.current,
        customization,
        upgrades,
        'campaign',
        {
          onStateChange: (newState) => {
            setGameState(newState);
            if (newState === 'victory') {
              // Award DNA points
              setDnaPoints((prev) => {
                const updated = prev + (engineRef.current?.stats.dnaPointsEarned || 200);
                try {
                  localStorage.setItem('sperm_race_dna', String(updated));
                } catch {
                  // ignore
                }
                return updated;
              });
            } else if (newState === 'gameover') {
              // Award consolation DNA points
              setDnaPoints((prev) => {
                const updated = prev + 30;
                try {
                  localStorage.setItem('sperm_race_dna', String(updated));
                } catch {
                  // ignore
                }
                return updated;
              });
            }
          },
          onStatsUpdate: (newStats) => setStats(newStats),
          onPlayerStatus: (player) => setPlayerStatus(player),
          onZoneChange: (zoneIdx) => setCurrentZoneIndex(zoneIdx),
          onDrillProgress: (playerDrill, rivalDrill) => {
            setDrillProgress(playerDrill);
            setRivalDrillProgress(rivalDrill);
          },
          onEjaculationProgress: (timer, phase) => {
            setEjaculationTimer(timer);
            if (phase) {
              setEjaculationPhase(phase);
            }
          },
        }
      );
      engineRef.current = engine;
      // Initial render for background
      engine.render();
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [resizeCanvas]);

  // Update engine properties when customization or upgrades change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.customization = customization;
      engineRef.current.upgrades = upgrades;
    }
  }, [customization, upgrades]);

  // Handle Keyboard Inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') engine.input.up = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') engine.input.down = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') engine.input.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') engine.input.right = true;

      // Shooting enzyme dart (F, Control, or Enter)
      if (e.code === 'KeyF' || e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'Enter') {
        engine.input.shoot = true;
      }

      if (e.code === 'Space' || e.code === 'Enter') {
        if (gameState === 'ejaculating') {
          e.preventDefault();
          if (ejaculationPhase === 'ready_to_shoot') {
            engine.shootSperm();
          } else {
            engine.finishEjaculationAndStartRace();
          }
          return;
        }
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'fertilizing') {
          engine.manualDrillPulse();
        } else {
          engine.input.boost = true;
        }
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === 'racing' || gameState === 'fertilizing') {
          handleTogglePause();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') engine.input.up = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') engine.input.down = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') engine.input.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') engine.input.right = false;
      if (e.code === 'KeyF' || e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'Enter') {
        engine.input.shoot = false;
      }
      if (e.code === 'Space') engine.input.boost = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Handle Pointer / Mouse Steering
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    if (!engine || gameState === 'menu') return;

    engine.input.pointerActive = true;
    engine.input.pointerX = e.clientX;
    engine.input.pointerY = e.clientY;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.input.pointerActive = true;
    engine.input.pointerX = e.clientX;
    engine.input.pointerY = e.clientY;

    if (gameState === 'ejaculating') {
      // Allow user to position pointer for initial steering without accidentally skipping
      return;
    }

    if (gameState === 'fertilizing') {
      engine.manualDrillPulse();
    } else if (e.button === 0) {
      engine.input.boost = true;
    } else if (e.button === 2) {
      // Right-click to shoot enzyme dart
      engine.fireProjectile(true);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (e.button === 0) {
      engine.input.boost = false;
    }
  };

  // Game Control Actions
  const handleStartRace = (mode: GameMode) => {
    if (!engineRef.current) return;
    engineRef.current.start(mode);
    setGameState(engineRef.current.state);
    setIsPaused(false);
  };

  const handleRestartRace = () => {
    if (!engineRef.current) return;
    engineRef.current.restart();
    setGameState(engineRef.current.state);
    setIsPaused(false);
  };

  const handleSkipEjaculation = () => {
    if (engineRef.current) {
      engineRef.current.finishEjaculationAndStartRace();
    }
  };

  const handleShootSperm = () => {
    if (engineRef.current) {
      engineRef.current.shootSperm();
    }
  };

  const handleTogglePause = () => {
    const engine = engineRef.current;
    if (!engine) return;

    if (isPaused) {
      engine.resume();
      setIsPaused(false);
    } else {
      engine.pause();
      setIsPaused(true);
    }
  };

  const handleReturnToMenu = () => {
    const engine = engineRef.current;
    if (engine) {
      engine.destroy();
    }
    setGameState('menu');
    setIsPaused(false);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 60 FPS HTML5 Canvas Simulation */}
      <canvas
        ref={canvasRef}
        id="game-canvas"
        onContextMenu={(e) => e.preventDefault()}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="absolute inset-0 block cursor-crosshair touch-none"
      />

      {/* Ejaculation Surge & Insemination Sequence */}
      {gameState === 'ejaculating' && (
        <EjaculationOverlay
          onSkip={handleSkipEjaculation}
          onShoot={handleShootSperm}
          timer={ejaculationTimer}
          phase={ejaculationPhase}
        />
      )}

      {/* Main HUD overlay during racing or fertilizing */}
      {(gameState === 'racing' || gameState === 'fertilizing') && playerStatus && !isPaused && (
        <HUD
          player={playerStatus}
          stats={stats}
          currentZoneIndex={currentZoneIndex}
          gameState={gameState}
          drillProgress={drillProgress}
          rivalDrillProgress={rivalDrillProgress}
          onPause={handleTogglePause}
          onManualDrill={() => engineRef.current?.manualDrillPulse()}
          onShoot={() => engineRef.current?.fireProjectile(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onMobileBoostStart={() => {
            if (engineRef.current) engineRef.current.input.boost = true;
          }}
          onMobileBoostEnd={() => {
            if (engineRef.current) engineRef.current.input.boost = false;
          }}
        />
      )}

      {/* Main Menu / Launch Pad */}
      {gameState === 'menu' && !showUpgrades && (
        <MenuScreen
          customization={customization}
          upgrades={upgrades}
          dnaPoints={dnaPoints}
          onUpdateCustomization={handleUpdateCustomization}
          onStartGame={handleStartRace}
          onOpenUpgrades={() => setShowUpgrades(true)}
          highScore={highScore}
        />
      )}

      {/* DNA Mutation Lab Modal */}
      {showUpgrades && (
        <UpgradesModal
          upgrades={upgrades}
          dnaPoints={dnaPoints}
          onUpgrade={handleUpgrade}
          onClose={() => setShowUpgrades(false)}
        />
      )}

      {/* Victory Climax Modal */}
      {gameState === 'victory' && (
        <VictoryModal
          stats={stats}
          customization={customization}
          onRestart={handleRestartRace}
          onOpenUpgrades={() => setShowUpgrades(true)}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'gameover' && playerStatus && (
        <GameOverModal
          player={playerStatus}
          stats={stats}
          onRestart={handleRestartRace}
          onOpenUpgrades={() => setShowUpgrades(true)}
          onMenu={handleReturnToMenu}
        />
      )}

      {/* Pause Screen */}
      {isPaused && (
        <PauseModal
          onResume={handleTogglePause}
          onRestart={handleRestartRace}
          onMenu={handleReturnToMenu}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}
    </main>
  );
}
