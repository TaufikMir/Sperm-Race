import React from 'react';
import { SwimmerUpgrades } from '../types';
import { UPGRADE_CONFIG } from '../game/constants';
import { Dna, ArrowLeft, Check, Sparkles } from 'lucide-react';
import { sound } from '../game/sound';

interface UpgradesModalProps {
  upgrades: SwimmerUpgrades;
  dnaPoints: number;
  onUpgrade: (stat: keyof SwimmerUpgrades) => void;
  onClose: () => void;
}

export const UpgradesModal: React.FC<UpgradesModalProps> = ({
  upgrades,
  dnaPoints,
  onUpgrade,
  onClose,
}) => {
  const statsList: (keyof SwimmerUpgrades)[] = [
    'motility',
    'mitochondria',
    'aerodynamics',
    'acrosome',
    'resistance',
  ];

  const handlePurchase = (stat: keyof SwimmerUpgrades) => {
    const currentLvl = upgrades[stat];
    if (currentLvl >= 5) return;
    const cost = UPGRADE_CONFIG[stat].costs[currentLvl];
    if (dnaPoints >= cost) {
      sound.playPickupAtp();
      onUpgrade(stat);
    } else {
      sound.playHazardHit();
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
              <Dna className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 tracking-tight">
                DNA MUTATION LAB
              </h2>
              <p className="text-xs text-slate-400">
                Evolve your swimmer genetics for optimal motility & survival.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-indigo-950/60 border border-indigo-700/60 rounded-xl px-3.5 py-1.5 text-indigo-300 font-mono font-bold text-sm shadow-inner">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{dnaPoints} DNA PTS</span>
          </div>
        </div>

        {/* Upgrade Cards List */}
        <div className="space-y-3 mb-6">
          {statsList.map((stat) => {
            const config = UPGRADE_CONFIG[stat];
            const currentLevel = upgrades[stat];
            const isMax = currentLevel >= 5;
            const nextCost = isMax ? 0 : config.costs[currentLevel];
            const canAfford = dnaPoints >= nextCost;

            return (
              <div
                key={stat}
                className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-all hover:border-slate-700"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-sm text-slate-200">
                      {config.name}
                    </span>
                    <span className="text-[11px] font-mono text-sky-400 font-semibold bg-sky-950/70 px-2 py-0.5 rounded-md">
                      LVL {currentLevel}/5
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {config.description}
                  </p>

                  {/* Level Pips */}
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <div
                        key={lvl}
                        className={`h-1.5 w-6 rounded-full ${
                          lvl <= currentLevel
                            ? 'bg-gradient-to-r from-sky-400 to-indigo-500'
                            : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Purchase Button */}
                <div>
                  {isMax ? (
                    <div className="px-3.5 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-emerald-400 text-xs font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> MAX
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => handlePurchase(stat)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95 ${
                        canAfford
                          ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-90 text-white shadow-sky-500/20'
                          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{nextCost} PTS</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Back Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold flex items-center gap-2 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Race Pad</span>
          </button>
        </div>
      </div>
    </div>
  );
};
