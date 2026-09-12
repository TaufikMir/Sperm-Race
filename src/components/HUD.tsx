import React, { useState, useRef } from 'react';
import { motion, useDragControls } from 'motion/react';
import { Swimmer, GameStats, GameState } from '../types';
import { ZONES, TRACK_LENGTH } from '../game/constants';
import { getVaginalTelemetry } from '../game/vaginalTelemetry';
import { VaginalInterfaceModal } from './VaginalInterfaceModal';
import {
  Volume2,
  VolumeX,
  Pause,
  Zap,
  Heart,
  Shield,
  Flag,
  Flame,
  Activity,
  Sparkles,
  Magnet,
  Dna,
  Crosshair,
  Wind,
  AlertCircle,
  Compass,
  GripHorizontal,
  GripVertical,
  RotateCcw,
} from 'lucide-react';
import { sound } from '../game/sound';

interface HUDProps {
  player: Swimmer;
  stats: GameStats;
  currentZoneIndex: number;
  gameState: GameState;
  drillProgress: number;
  rivalDrillProgress: number;
  onPause: () => void;
  onManualDrill: () => void;
  onShoot?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onMobileBoostStart: () => void;
  onMobileBoostEnd: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  stats,
  currentZoneIndex,
  gameState,
  drillProgress,
  rivalDrillProgress,
  onPause,
  onManualDrill,
  onShoot,
  isMuted,
  onToggleMute,
  onMobileBoostStart,
  onMobileBoostEnd,
}) => {
  const [showVaginalModal, setShowVaginalModal] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const hudContainerRef = useRef<HTMLDivElement>(null);
  const mobileControlsDrag = useDragControls();

  const currentZone = ZONES[currentZoneIndex] || ZONES[0];
  const progressRatio = Math.min(1, Math.max(0, player.x / TRACK_LENGTH));
  const staminaPercent = Math.round((player.stamina / player.maxStamina) * 100);
  const healthPercent = Math.round((player.health / player.maxHealth) * 100);
  const telemetry = getVaginalTelemetry(player.x);

  const handleResetLayout = () => {
    sound.playClick();
    setResetKey((prev) => prev + 1);
  };

  return (
    <div
      id="game-hud"
      ref={hudContainerRef}
      className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 sm:p-3 md:p-4 select-none overflow-hidden"
    >
      {/* Absolute Top Ultra-Slim Progress Line (Visible on all devices without blocking view) */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900/60 z-20 overflow-hidden pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-sky-400 via-indigo-400 to-amber-400 transition-all duration-150"
          style={{ width: `${progressRatio * 100}%` }}
        />
      </div>

      {/* Top Bar: Ultra-sleek, draggable stats header */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-3 w-full max-w-7xl mx-auto z-10">
        {/* Left: Movable Rank & Velocity Pill + Zone Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Draggable Rank & Velocity Pill */}
          <motion.div
            key={`rank-pill-${resetKey}`}
            drag
            dragConstraints={hudContainerRef}
            dragMomentum={false}
            dragElastic={0.08}
            whileDrag={{ scale: 1.03, zIndex: 50, cursor: 'grabbing' }}
            className="flex items-center gap-1 sm:gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-800/80 rounded-lg sm:rounded-xl px-1.5 py-0.5 sm:px-2.5 sm:py-1 shadow-md pointer-events-auto cursor-grab active:cursor-grabbing touch-none select-none group"
            title="Movable: Drag anywhere on screen to unblock view"
          >
            <GripVertical className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-500 group-hover:text-slate-300 shrink-0 opacity-70" />
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400">#</span>
              <span className="text-sm sm:text-base md:text-lg font-black text-amber-400 font-mono tracking-tight">
                {stats.rank}
              </span>
              <span className="text-[9px] text-slate-500 font-mono hidden md:inline">/ 250M</span>
            </div>
            <div className="h-3 w-[1px] bg-slate-700/60 mx-0.5" />
            <div className="flex items-center gap-1 text-[11px] sm:text-xs text-sky-300 font-medium">
              <Activity className="w-3 h-3 text-sky-400" />
              <span>{Math.round(player.speed * 12)} <span className="text-[9px] text-sky-400/80 font-mono">μm/s</span></span>
            </div>
            {((stats.obstaclesDestroyed ?? 0) > 0 || (stats.spermsEliminated ?? 0) > 0) && (
              <>
                <div className="h-3 w-[1px] bg-slate-700/60 mx-0.5 hidden sm:block" />
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono">
                  <span className="text-rose-400 flex items-center gap-0.5 font-bold" title="Hazards Destroyed">
                    <Crosshair className="w-3 h-3 text-rose-500" />
                    <span>{stats.obstaclesDestroyed ?? 0}</span>
                  </span>
                  {(stats.spermsEliminated ?? 0) > 0 && (
                    <span className="text-amber-400 flex items-center gap-0.5 font-bold" title="Rivals Eliminated">
                      <span>💀 {stats.spermsEliminated}</span>
                    </span>
                  )}
                </div>
              </>
            )}
          </motion.div>

          {/* Draggable Zone & Vaginal Telemetry Pill */}
          <motion.div
            key={`zone-pill-${resetKey}`}
            drag
            dragConstraints={hudContainerRef}
            dragMomentum={false}
            dragElastic={0.08}
            whileDrag={{ scale: 1.03, zIndex: 50, cursor: 'grabbing' }}
            className="hidden md:flex items-center gap-1.5 pointer-events-auto select-none touch-none"
            title="Movable: Drag anywhere on screen"
          >
            {/* Current Zone Badge */}
            <div className="flex items-center gap-1.5 bg-slate-900/75 backdrop-blur-sm border border-slate-800/60 rounded-lg px-2 py-0.5 sm:py-1 text-xs cursor-grab active:cursor-grabbing group">
              <GripVertical className="w-2.5 h-2.5 text-slate-500 group-hover:text-slate-300 opacity-70" />
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: currentZone.accentColor }}
              />
              <span className="font-semibold text-slate-200">{currentZone.name}</span>
            </div>

            {/* Quick Vaginal Telemetry Pill */}
            <button
              id="hud-vaginal-telemetry-pill"
              onClick={() => {
                sound.playScanner();
                setShowVaginalModal(true);
              }}
              className="cursor-pointer flex items-center gap-1.5 bg-slate-900/80 hover:bg-rose-950/80 border border-rose-500/40 hover:border-rose-400 rounded-lg px-2 py-0.5 sm:py-1 text-[11px] font-mono text-rose-300 backdrop-blur-sm shadow-sm transition-all active:scale-95 group"
              title="Click to view full Anatomical Vaginal Interface"
            >
              <Compass className="w-3 h-3 text-rose-400 animate-spin-slow" />
              <span className="font-bold text-rose-200 group-hover:text-white transition-colors">
                {telemetry.currentSegment.split('•')[0].trim()}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-amber-300 font-bold">pH {telemetry.phLevel}</span>
            </button>
          </motion.div>
        </div>

        {/* Center: Draggable Track Distance Progress Bar */}
        <motion.div
          key={`progress-bar-${resetKey}`}
          drag
          dragConstraints={hudContainerRef}
          dragMomentum={false}
          dragElastic={0.08}
          whileDrag={{ scale: 1.02, zIndex: 45, cursor: 'grabbing' }}
          className="flex-1 max-w-xs xl:max-w-sm hidden lg:flex flex-col items-center gap-0.5 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 px-3 py-1 rounded-xl shadow-md pointer-events-auto cursor-grab active:cursor-grabbing touch-none select-none group"
          title="Movable: Drag track progress bar anywhere"
        >
          <div className="w-full flex justify-between items-center text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-1">
              <GripHorizontal className="w-3 h-3 text-slate-500 group-hover:text-slate-300 opacity-70" />
              <span>0 μm</span>
            </div>
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <Flag className="w-2.5 h-2.5" /> OVUM ({TRACK_LENGTH} μm)
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-amber-400 transition-all duration-150 rounded-full"
              style={{ width: `${progressRatio * 100}%` }}
            />
            {ZONES.map((z, idx) => (
              <div
                key={idx}
                className="absolute top-0 bottom-0 w-[1px] bg-slate-600/60"
                style={{ left: `${(z.startDistance / TRACK_LENGTH) * 100}%` }}
              />
            ))}
          </div>
        </motion.div>

        {/* Right: Audio, Anatomy, Reset Layout & Pause buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto shrink-0">
          <button
            id="reset-hud-layout-btn"
            onClick={handleResetLayout}
            className="h-7 px-1.5 sm:h-8 sm:px-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-500 text-slate-300 flex items-center gap-1 transition-all shadow-sm active:scale-95 text-xs font-mono"
            title="Reset all movable stats to default positions"
          >
            <RotateCcw className="w-3 h-3 text-sky-400" />
            <span className="hidden sm:inline text-[10px] font-bold">RESET HUD</span>
          </button>

          <button
            id="open-vaginal-interface-btn"
            onClick={() => {
              sound.playScanner();
              setShowVaginalModal(true);
            }}
            className="h-7 px-1.5 sm:h-8 sm:px-2 rounded-lg bg-slate-900/80 hover:bg-rose-950/80 border border-rose-500/40 hover:border-rose-400 text-rose-200 flex items-center gap-1 transition-all shadow-sm active:scale-95 text-xs font-mono font-bold"
            title="Open Anatomical Vaginal Interface & Cross-Section"
          >
            <Compass className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden xs:inline text-[10px] sm:text-[11px]">ANATOMY</span>
          </button>

          <button
            id="toggle-sound-btn"
            onClick={onToggleMute}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 flex items-center justify-center transition-all shadow-sm active:scale-95"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-sky-400" />}
          </button>

          <button
            id="pause-game-btn"
            onClick={onPause}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 flex items-center justify-center transition-all shadow-sm active:scale-95"
            title="Pause Game"
          >
            <Pause className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center Screen: Fertilization Climax Egg Punching HUD */}
      {gameState === 'fertilizing' && (
        <div className="my-auto mx-auto pointer-events-auto flex flex-col items-center bg-slate-950/90 backdrop-blur-md border-2 border-amber-500/80 rounded-2xl p-5 sm:p-7 shadow-2xl max-w-sm w-full animate-in zoom-in-95">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 mb-2">
            <span className="text-2xl animate-bounce">👊</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight text-center">
            PUNCH THE EGG TO ENTER!
          </h2>
          <p className="text-xs text-slate-300 text-center mt-1 mb-4">
            Unleash rapid baby punch combos into the Zona Pellucida membrane to punch through before rivals enter!
          </p>

          {/* Punch Breach Meter */}
          <div className="w-full space-y-2 mb-4 font-mono text-xs">
            <div>
              <div className="flex justify-between text-sky-300 mb-1">
                <span>YOUR PUNCH BREACH</span>
                <span className="font-bold">{Math.round(drillProgress)}%</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 transition-all duration-75"
                  style={{ width: `${drillProgress}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-rose-400 mb-1">
                <span>RIVAL CLOSEST PUNCH</span>
                <span className="font-bold">{Math.round(rivalDrillProgress)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all duration-75"
                  style={{ width: `${rivalDrillProgress}%` }}
                />
              </div>
            </div>
          </div>

          <button
            id="drill-action-btn"
            onClick={onManualDrill}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 active:scale-95 text-slate-950 font-black rounded-xl text-base shadow-lg shadow-amber-500/30 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <span>👊</span>
            <span>PUNCH EGG! (MASH SPACE/TAP!)</span>
          </button>
        </div>
      )}

      {/* Bottom Bar: Movable Vital Stats Console, Movable Controls Reminder & Movable Mobile Action Buttons */}
      <div className="flex flex-row items-end justify-between gap-2 w-full max-w-7xl mx-auto z-10">
        {/* Left: Movable Vitality, ATP Stamina & Enzyme Ammo Console */}
        <motion.div
          key={`vital-stats-${resetKey}`}
          id="hud-bottom-vital-stats"
          drag
          dragConstraints={hudContainerRef}
          dragMomentum={false}
          dragElastic={0.08}
          whileDrag={{ scale: 1.02, zIndex: 50, cursor: 'grabbing' }}
          className="bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 shadow-2xl flex flex-col gap-1.5 w-40 xs:w-48 sm:w-60 md:w-64 max-w-xs pointer-events-auto shrink-0 cursor-grab active:cursor-grabbing touch-none select-none group"
          title="Movable: Drag anywhere on screen to unblock view"
        >
          {/* Header Drag Handle */}
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 border-b border-slate-800/80 pb-1">
            <span className="flex items-center gap-1 text-slate-300 font-bold">
              <GripHorizontal className="w-3 h-3 text-slate-500 group-hover:text-slate-300 opacity-70" />
              <span>VITAL STATS</span>
            </span>
            <span className="text-[8px] text-slate-400 uppercase tracking-wider hidden xs:inline">DRAG</span>
          </div>

          {/* ATP Energy Gauge & Dynamic Gait Badge */}
          <div>
            <div className="flex items-center justify-between text-[10px] sm:text-xs font-mono mb-0.5 sm:mb-1">
              <span className="flex items-center gap-0.5 sm:gap-1 text-sky-300 font-bold">
                <Zap className="w-3 h-3 text-sky-400 fill-sky-400 shrink-0" />
                <span className="hidden xs:inline">ATP</span>
              </span>
              <div className="flex items-center gap-1">
                {player.gait && (
                  <span className={`text-[8px] sm:text-[9px] font-mono px-1 py-0.2 rounded font-semibold ${
                    player.gait.gaitType === 'sprint'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                      : player.gait.gaitType === 'exhausted'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : player.gait.gaitType === 'fatigued'
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {player.gait.gaitType.slice(0, 3).toUpperCase()}
                  </span>
                )}
                <span className="text-slate-300 font-semibold">{staminaPercent}%</span>
              </div>
            </div>
            <div className="w-full h-1.5 sm:h-2 bg-slate-800 rounded-full overflow-hidden p-[1px]">
              <div
                className={`h-full rounded-full transition-all duration-100 ${
                  player.boosting
                    ? 'bg-gradient-to-r from-amber-400 to-rose-500 animate-pulse'
                    : player.gait?.gaitType === 'exhausted'
                    ? 'bg-gradient-to-r from-rose-600 to-amber-600'
                    : 'bg-gradient-to-r from-sky-500 to-cyan-300'
                }`}
                style={{ width: `${staminaPercent}%` }}
              />
            </div>
          </div>

          {/* Cell Vitality / Health */}
          <div>
            <div className="flex items-center justify-between text-[10px] sm:text-xs font-mono mb-0.5 sm:mb-1">
              <span className="flex items-center gap-0.5 sm:gap-1 text-rose-400 font-bold">
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500 shrink-0" />
                <span className="hidden xs:inline">VITALITY</span>
              </span>
              <span className="text-slate-300 font-semibold">{healthPercent}%</span>
            </div>
            <div className="w-full h-1.5 sm:h-2 bg-slate-800 rounded-full overflow-hidden p-[1px]">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-emerald-400 rounded-full transition-all duration-150"
                style={{ width: `${healthPercent}%` }}
              />
            </div>
          </div>

          {/* Enzyme Darts Ammo */}
          <div>
            <div className="flex items-center justify-between text-[10px] sm:text-xs font-mono mb-0.5 sm:mb-1">
              <span className="flex items-center gap-0.5 sm:gap-1 text-pink-400 font-bold">
                <Crosshair className="w-3 h-3 text-pink-400 shrink-0" />
                <span className="hidden xs:inline">DARTS</span>
              </span>
              <span className="text-slate-300 font-semibold">{player.enzymeDarts}/{player.maxEnzymeDarts}</span>
            </div>
            <div className="w-full h-1.5 sm:h-2 bg-slate-800 rounded-full overflow-hidden p-[1px]">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-150"
                style={{ width: `${Math.round((player.enzymeDarts / player.maxEnzymeDarts) * 100)}%` }}
              />
            </div>
          </div>

          {/* Active Power-up & Status Badges */}
          {(player.shieldTimer > 0 ||
            (player.capacitationTimer && player.capacitationTimer > 0) ||
            (player.magnetTimer && player.magnetTimer > 0) ||
            (player.scoreMultiplierTimer && player.scoreMultiplierTimer > 0) ||
            player.drafting ||
            player.overcharging ||
            (player.stumbleTimer ?? 0) > 0 ||
            (player.slowTimer ?? 0) > 0) && (
            <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-800/80">
              {player.shieldTimer > 0 && (
                <div className="flex items-center gap-0.5 text-[9px] text-cyan-300 bg-cyan-950/80 border border-cyan-700/80 rounded px-1 py-0.2">
                  <Shield className="w-2.5 h-2.5 text-cyan-400" />
                  <span>{player.shieldTimer.toFixed(0)}s</span>
                </div>
              )}
              {player.capacitationTimer && player.capacitationTimer > 0 && (
                <div className="flex items-center gap-0.5 text-[9px] text-purple-300 bg-purple-950/80 border border-purple-700/80 rounded px-1 py-0.2 animate-pulse">
                  <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                  <span>CAP {player.capacitationTimer.toFixed(0)}s</span>
                </div>
              )}
              {player.magnetTimer && player.magnetTimer > 0 && (
                <div className="flex items-center gap-0.5 text-[9px] text-teal-300 bg-teal-950/80 border border-teal-700/80 rounded px-1 py-0.2">
                  <Magnet className="w-2.5 h-2.5 text-teal-400" />
                  <span>MAG</span>
                </div>
              )}
              {player.scoreMultiplierTimer && player.scoreMultiplierTimer > 0 && (
                <div className="flex items-center gap-0.5 text-[9px] text-amber-300 bg-amber-950/80 border border-amber-700/80 rounded px-1 py-0.2">
                  <Dna className="w-2.5 h-2.5 text-amber-400" />
                  <span>2X</span>
                </div>
              )}
              {player.drafting && (
                <div className="flex items-center gap-0.5 text-[9px] text-emerald-300 bg-emerald-950/90 border border-emerald-500/90 rounded px-1 py-0.2 animate-pulse">
                  <Wind className="w-2.5 h-2.5 text-emerald-400" />
                  <span>DRAFT</span>
                </div>
              )}
              {player.overcharging && (
                <div className="flex items-center gap-0.5 text-[9px] text-amber-200 bg-rose-950/90 border border-rose-500 rounded px-1 py-0.2 animate-bounce">
                  <Flame className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                  <span className="font-bold">BOOST!</span>
                </div>
              )}
              {(player.stumbleTimer ?? 0) > 0 && (
                <div className="flex items-center gap-0.5 text-[9px] text-yellow-200 bg-yellow-950/90 border border-yellow-500 rounded px-1 py-0.2">
                  <AlertCircle className="w-2.5 h-2.5 text-yellow-400" />
                  <span>BUMP</span>
                </div>
              )}
              {(player.slowTimer ?? 0) > 0 && (
                <div className="flex items-center gap-0.5 text-[9px] text-amber-200 bg-amber-950/90 border border-amber-500 rounded px-1 py-0.2 animate-pulse">
                  <AlertCircle className="w-2.5 h-2.5 text-amber-400" />
                  <span>SLOW</span>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Center: Draggable Desktop Controls reminder */}
        <motion.div
          key={`desktop-controls-${resetKey}`}
          drag
          dragConstraints={hudContainerRef}
          dragMomentum={false}
          dragElastic={0.08}
          whileDrag={{ scale: 1.02, zIndex: 45, cursor: 'grabbing' }}
          className="hidden xl:flex items-center gap-2.5 bg-slate-900/85 backdrop-blur-md border border-slate-800/80 px-3.5 py-1.5 rounded-xl text-xs text-slate-300 font-medium shadow-lg pointer-events-auto cursor-grab active:cursor-grabbing touch-none select-none group"
          title="Movable: Drag controls guide anywhere"
        >
          <GripVertical className="w-3 h-3 text-slate-500 group-hover:text-slate-300 opacity-70" />
          <span><strong className="text-sky-300">WASD / Touch</strong> Steer</span>
          <span>•</span>
          <span><strong className="text-amber-400">Space</strong> Turbo</span>
          <span>•</span>
          <span><strong className="text-rose-400">F / Ctrl</strong> Shoot</span>
          <span>•</span>
          <span><strong className="text-emerald-400">Draft</strong> Slipstream</span>
        </motion.div>

        {/* Right: Draggable Mobile Touch Controls Pod (Shoot & Boost Buttons) */}
        <motion.div
          key={`mobile-controls-${resetKey}`}
          drag
          dragControls={mobileControlsDrag}
          dragListener={false}
          dragConstraints={hudContainerRef}
          dragMomentum={false}
          dragElastic={0.08}
          whileDrag={{ scale: 1.03, zIndex: 50 }}
          className="pointer-events-auto flex flex-col items-end gap-1 ml-auto shrink-0 touch-none select-none"
        >
          {/* Mobile Drag Grip Handle - Player can reposition buttons to left or anywhere */}
          <div
            onPointerDown={(e) => mobileControlsDrag.start(e)}
            className="flex items-center justify-center gap-1 px-2 py-0.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-md cursor-grab active:cursor-grabbing text-[9px] font-mono text-slate-400 select-none shadow-sm backdrop-blur-sm"
            title="Drag to reposition Shoot & Boost buttons anywhere on screen (left, right, top)"
          >
            <GripHorizontal className="w-3 h-3 text-slate-400" />
            <span className="text-[8px] uppercase tracking-wider font-bold">DRAG BUTTONS</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mobile Shoot Enzyme Dart Button */}
            <button
              id="mobile-shoot-btn"
              onClick={onShoot}
              disabled={player.enzymeDarts <= 0}
              className={`w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center font-black text-[10px] sm:text-[11px] transition-all shadow-xl select-none active:scale-90 touch-none ${
                player.enzymeDarts > 0
                  ? 'bg-gradient-to-br from-rose-600 to-pink-600 text-white shadow-rose-600/40 border border-rose-400 cursor-pointer active:brightness-125'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'
              }`}
              title="Shoot Acrosomal Enzyme Dart (Key: F / Ctrl)"
            >
              <Crosshair className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
              <span>SHOOT</span>
            </button>

            {/* Mobile Boost Button */}
            <button
              id="mobile-boost-btn"
              onPointerDown={onMobileBoostStart}
              onPointerUp={onMobileBoostEnd}
              onPointerLeave={onMobileBoostEnd}
              className={`w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center font-black text-[11px] sm:text-xs transition-all shadow-xl select-none active:scale-90 touch-none ${
                player.stamina > 10 || (player.capacitationTimer && player.capacitationTimer > 0)
                  ? 'bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-amber-500/40 border border-amber-400 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
              title="Touch or click to Boost"
            >
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 fill-current" />
              <span>BOOST</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Anatomical Vaginal Interface Modal */}
      <VaginalInterfaceModal
        isOpen={showVaginalModal}
        onClose={() => setShowVaginalModal(false)}
        telemetry={telemetry}
        playerX={player.x}
      />
    </div>
  );
};

