import React from 'react';
import { GameStats, Swimmer } from '../types';
import { Skull, RotateCcw, Dna, ArrowLeft } from 'lucide-react';

interface GameOverModalProps {
  player: Swimmer;
  stats: GameStats;
  onRestart: () => void;
  onOpenUpgrades: () => void;
  onMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  player,
  stats,
  onRestart,
  onOpenUpgrades,
  onMenu,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border-2 border-rose-900/80 rounded-3xl p-6 sm:p-7 shadow-2xl text-center relative my-auto animate-in zoom-in-95">
        {/* Skull Icon */}
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-950/80 border border-rose-700/60 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-900/30 mb-3">
          <Skull className="w-8 h-8" />
        </div>

        <div className="inline-block px-3 py-0.5 rounded-full bg-rose-950/90 border border-rose-800 text-rose-300 text-xs font-bold uppercase tracking-wider mb-2">
          Cell Termination
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tight">
          OUT OF THE RACE
        </h2>

        <p className="text-sm text-slate-300 mt-2 px-2">
          {player.deathReason || 'Depleted cell vitality in the reproductive tract.'}
        </p>

        {/* Stats summary */}
        <div className="grid grid-cols-2 gap-2 my-4">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="block text-[10px] text-slate-400 font-semibold uppercase">
              Distance Reached
            </span>
            <span className="text-base font-bold font-mono text-slate-100">
              {stats.distanceTraveled} μm
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="block text-[10px] text-slate-400 font-semibold uppercase">
              Consolation DNA
            </span>
            <span className="text-base font-bold font-mono text-indigo-300">
              +{stats.dnaPointsEarned || 30} PTS
            </span>
          </div>
        </div>

        {((stats.obstaclesDestroyed ?? 0) > 0 || (stats.spermsEliminated ?? 0) > 0) && (
          <div className="flex items-center justify-around p-2.5 mb-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
            <div className="text-rose-400">
              <span className="text-slate-400 block text-[10px]">HAZARDS BLASTED</span>
              <span className="font-bold text-sm">💥 {stats.obstaclesDestroyed ?? 0}</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-800" />
            <div className="text-amber-400">
              <span className="text-slate-400 block text-[10px]">RIVALS ELIMINATED</span>
              <span className="font-bold text-sm">💀 {stats.spermsEliminated ?? 0}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-bold text-sm shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>TRY AGAIN</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onOpenUpgrades}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Dna className="w-3.5 h-3.5 text-indigo-400" />
              <span>Mutate / Upgrade</span>
            </button>
            <button
              type="button"
              onClick={onMenu}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Main Menu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
