import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Play, Sparkles, Shield, Droplets, Activity, Gauge, CheckCircle2, GripHorizontal, Zap, Target } from 'lucide-react';
import { EjaculationPhase } from '../types';

interface EjaculationOverlayProps {
  onSkip: () => void;
  onShoot?: () => void;
  timer: number;
  phase?: EjaculationPhase;
}

export const EjaculationOverlay: React.FC<EjaculationOverlayProps> = ({ onSkip, onShoot, timer, phase = 'insertion' }) => {
  const [countdownText, setCountdownText] = useState('STAGE 1: PENILE INSERTION');
  const [countdownSubtitle, setCountdownSubtitle] = useState('Penile shaft and glans glide through vulvar vestibule into the vaginal introitus');
  const [countdownNumber, setCountdownNumber] = useState('INSERTION');
  const [activeStep, setActiveStep] = useState(1);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === 'insertion') {
      setCountdownText('STAGE 1: PENILE INSERTION');
      setCountdownSubtitle('Penile shaft and glans glides through vulvar vestibule into the vaginal introitus');
      setCountdownNumber('INSERTION');
      setActiveStep(1);
    } else if (phase === 'ready_to_shoot') {
      setCountdownText('READY: PENIS FULLY INSERTED');
      setCountdownSubtitle('Glans docked in vaginal vault — trigger manual bulbospongiosus sperm expulsion');
      setCountdownNumber('READY!');
      setActiveStep(1);
    } else if (phase === 'ejaculation') {
      setCountdownText('STAGE 2: EJACULATION & EXPULSION');
      setCountdownSubtitle('Bulbospongiosus contractions launch 250,000,000 sperm surge from urethral meatus');
      setCountdownNumber('EJACULATING!');
      setActiveStep(2);
    } else {
      setCountdownText('STAGE 3: SPERM TRAVELING IN VAGINA');
      setCountdownSubtitle('Sperm navigates through transverse rugae mucosal folds towards the cervix');
      setCountdownNumber('SWIM!');
      setActiveStep(3);
    }
  }, [phase, timer]);

  // Calculate progress percent based on phase
  let progressPercent = 0;
  if (phase === 'insertion') {
    progressPercent = Math.max(0, Math.min(100, ((2.6 - timer) / 2.6) * 100));
  } else if (phase === 'ready_to_shoot') {
    progressPercent = 100;
  } else if (phase === 'ejaculation') {
    progressPercent = Math.max(0, Math.min(100, ((4.2 - timer) / 2.8) * 100));
  } else {
    progressPercent = Math.max(0, Math.min(100, ((1.4 - timer) / 1.4) * 100));
  }

  const steps = [
    { num: 1, label: 'Penile Insertion', sub: 'Glans Ingress' },
    { num: 2, label: 'Ejaculatory Surge', sub: '250M Expulsion' },
    { num: 3, label: 'Vaginal Travel', sub: 'Canal Swimming' },
  ];

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-2 sm:p-4 select-none font-sans overflow-hidden"
    >
      {/* Top: Header with Glans Inserted & Ready to Shoot Banners above, and Skip button */}
      <div className="w-full flex flex-col items-center z-10 space-y-1.5 pointer-events-none">
        <div className="w-full flex items-center justify-between pointer-events-auto">
          {/* Status pill top-left */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-sm border border-rose-500/50 px-2.5 py-1 rounded-lg shadow-md text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span className="font-mono text-[9px] sm:text-[10px] text-rose-300 font-bold uppercase tracking-wider">
              {phase === 'ready_to_shoot' ? 'PENIS INSERTED' : 'INSEMINATION'}
            </span>
          </div>

          {/* Top Center: Prominent Ready to Shoot & Glans Inserted Banner (Moved Above) */}
          {phase === 'ready_to_shoot' ? (
            <div className="flex flex-col items-center pointer-events-none px-2">
              <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-slate-950/90 border-2 border-rose-500/80 backdrop-blur-md shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-pulse">
                <Droplets className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
                <span className="text-xs sm:text-sm md:text-base font-black font-mono tracking-wider text-white uppercase drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]">
                  READY TO SHOOT
                </span>
                <span className="text-[9px] sm:text-xs text-rose-300 font-mono hidden xs:inline">
                  • GLANS INSERTED
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-950/80 border border-slate-700/70 backdrop-blur-sm">
              <Droplets className="w-3 h-3 text-rose-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-wider text-rose-300 uppercase">
                {countdownText}
              </span>
            </div>
          )}

          {/* Skip button (clickable, top right) */}
          <div>
            <button
              type="button"
              id="skip-ejaculation-btn"
              onClick={onSkip}
              className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-100 border border-slate-700/80 hover:border-slate-500 font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <Play className="w-3 h-3 fill-current text-sky-400" />
              <span>SKIP</span>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">(SPACE)</span>
            </button>
          </div>
        </div>

        {/* Informative subtitle notice right above when glans is inserted and ready to shoot */}
        {phase === 'ready_to_shoot' && (
          <div className="pointer-events-none text-[9px] sm:text-[11px] font-medium text-slate-200 bg-slate-950/85 backdrop-blur-md px-3.5 py-0.5 rounded-full border border-rose-500/40 shadow-md">
            Glans positioned in vaginal lumen — Tap Shoot button at bottom to release sperm
          </div>
        )}
      </div>

      {/* Center: Completely Unobstructed Center View (No blocking banners) */}
      {phase === 'ready_to_shoot' ? (
        /* Zero obstruction in center during ready_to_shoot so glans and vagina are completely visible */
        <div className="my-auto pointer-events-none h-1" />
      ) : (
        <div className="flex flex-col items-center justify-center text-center my-auto px-2 pointer-events-none">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3.5 sm:py-1 rounded-full bg-slate-950/80 border border-rose-500/70 backdrop-blur-md mb-0.5 sm:mb-1 shadow-lg">
            <Droplets className="w-3 h-3 text-rose-400 animate-pulse" />
            <span className="text-[10px] sm:text-xs font-mono font-bold tracking-wider text-rose-300 uppercase">
              {countdownText}
            </span>
          </div>

          {/* Pulsing Phase / Status Label */}
          <div className="relative my-0.5">
            <div className="text-4xl sm:text-6xl md:text-7xl font-black font-mono tracking-tight text-white/95 drop-shadow-[0_0_25px_rgba(244,63,94,0.7)] animate-pulse leading-none">
              {countdownNumber}
            </div>
          </div>

          {/* Real-time Surge Progress Bar */}
          <div className="w-48 sm:w-64 md:w-80 h-1.5 sm:h-2 bg-slate-900/80 rounded-full overflow-hidden border border-slate-700/70 my-1 backdrop-blur-sm shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-sky-400 to-emerald-400 transition-all duration-75"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="text-[10px] sm:text-xs font-medium text-slate-200 max-w-xs sm:max-w-md bg-slate-950/75 backdrop-blur-md px-2.5 py-0.5 sm:px-3.5 sm:py-1 rounded-lg sm:rounded-xl border border-slate-800/80 shadow-md leading-tight sm:leading-snug">
            {countdownSubtitle}
          </p>
        </div>
      )}

      {/* Bottom Area: Shoot Sperm Button & Telemetry */}
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center space-y-2 z-20 pointer-events-auto">
        {/* Prominent Shoot Sperm Button at the bottom */}
        {phase === 'ready_to_shoot' && (
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 230 }}
            className="w-full max-w-md px-2 flex flex-col items-center"
          >
            <div className="relative group w-full">
              {/* Outer pulsing glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-rose-600 via-pink-500 to-sky-500 rounded-2xl sm:rounded-3xl blur-md opacity-85 group-hover:opacity-100 animate-pulse transition duration-200" />
              
              <button
                type="button"
                id="shoot-sperm-btn"
                onClick={onShoot}
                className="relative w-full flex items-center justify-center gap-2.5 sm:gap-3.5 px-5 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-rose-600 via-red-500 to-rose-700 hover:from-rose-500 hover:to-red-600 active:scale-95 text-white font-black text-sm sm:text-lg md:text-xl rounded-2xl sm:rounded-3xl shadow-[0_0_35px_rgba(244,63,94,0.7)] border-2 border-rose-300/80 cursor-pointer transition-all uppercase tracking-wider"
              >
                <div className="p-1 sm:p-1.5 bg-white/20 rounded-xl shrink-0">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300 animate-bounce fill-current" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-black">SHOOT SPERM</span>
                    <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-white/25 font-mono font-normal hidden xs:inline">
                      SPACE
                    </span>
                  </div>
                  <div className="text-[9px] sm:text-xs text-rose-100 font-normal normal-case tracking-normal truncate">
                    Release 250,000,000 sperm into vagina
                  </div>
                </div>
              </button>
            </div>
            <p className="mt-1 text-[10px] sm:text-xs text-rose-300/90 font-mono text-center animate-pulse">
              ✦ Penis inserted into vaginal lumen — Press button or Spacebar ✦
            </p>
          </motion.div>
        )}

        {/* Draggable 3-Step Anatomical Progression Bar & Biological Telemetry */}
        <motion.div
          drag
          dragConstraints={overlayRef}
          dragMomentum={false}
          dragElastic={0.08}
          whileDrag={{ scale: 1.02, zIndex: 50, cursor: 'grabbing' }}
          className="w-full space-y-1 sm:space-y-1.5 cursor-grab active:cursor-grabbing touch-none select-none group"
          title="Movable: Drag anywhere on screen to unblock view"
        >
        <div className="flex items-center justify-center gap-1 text-[9px] font-mono text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity">
          <GripHorizontal className="w-3 h-3 text-slate-400" />
          <span className="uppercase tracking-widest text-[8px]">DRAG TELEMETRY</span>
        </div>

        {/* 3-Step Anatomical Progression Bar (Desktop / Tablet) */}
        <div className="hidden sm:grid grid-cols-3 gap-1.5 bg-slate-950/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800/80 shadow-lg text-[11px] font-mono">
          {steps.map((step) => {
            const isDone = activeStep > step.num;
            const isCurrent = activeStep === step.num;
            return (
              <div
                key={step.num}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
                  isCurrent
                    ? 'bg-rose-950/90 border border-rose-500 text-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                    : isDone
                    ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-900/40 border border-slate-800/50 text-slate-500'
                }`}
              >
                <div className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        isCurrent ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {step.num}
                    </span>
                  )}
                </div>
                <div className="truncate">
                  <div className="font-bold truncate leading-tight text-[10px]">{step.label}</div>
                  <div className="text-[8px] opacity-75 truncate">{step.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Telemetry Gauges - Ultra-compact on mobile */}
        <div className="w-full max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2 text-[10px] sm:text-xs font-mono">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/80 p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl shadow-md">
            <span className="block text-[9px] sm:text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-sky-400" /> <span className="truncate">Expulsion</span>
            </span>
            <span className="font-bold text-slate-100 flex items-center gap-1 text-[11px] sm:text-sm mt-0.5">
              <Droplets className="w-3 h-3 text-sky-400 shrink-0" /> <span className="truncate">3.5mL @ 45km/h</span>
            </span>
          </div>

          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/80 p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl shadow-md">
            <span className="block text-[9px] sm:text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <Gauge className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" /> <span className="truncate">Swarm</span>
            </span>
            <span className="font-bold text-amber-300 flex items-center gap-1 text-[11px] sm:text-sm mt-0.5">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" /> <span className="truncate">250,000,000</span>
            </span>
          </div>

          <div className="hidden sm:block bg-slate-900/90 backdrop-blur-md border border-slate-800/80 p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl shadow-md">
            <span className="block text-[9px] sm:text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" /> Buffer
            </span>
            <span className="font-bold text-emerald-400 flex items-center gap-1 text-xs sm:text-sm mt-0.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" /> pH 7.8 Active
            </span>
          </div>

          <div className="hidden sm:block bg-slate-900/90 backdrop-blur-md border border-slate-800/80 p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl shadow-md">
            <span className="block text-[9px] sm:text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <span>☣️</span> Canal
            </span>
            <span className="font-bold text-rose-400 flex items-center gap-1 text-xs sm:text-sm mt-0.5">
              <span>🛡️</span> pH 3.8 Lactic
            </span>
          </div>
        </div>
      </motion.div>
      </div>
    </div>
  );
};

