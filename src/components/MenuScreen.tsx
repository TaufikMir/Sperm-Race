import React, { useState } from 'react';
import { SwimmerCustomization, SwimmerUpgrades, GameMode, SwimmerClassType } from '../types';
import { COLOR_PRESETS, SWIMMER_CLASSES } from '../game/constants';
import { getVaginalTelemetry } from '../game/vaginalTelemetry';
import { VaginalInterfaceModal } from './VaginalInterfaceModal';
import {
  Play,
  Dna,
  Trophy,
  Info,
  Shield,
  Zap,
  Activity,
  ChevronRight,
  Flame,
  Flag,
  Crosshair,
  Compass,
  Magnet,
  Sparkles,
  AlertTriangle,
  Baby,
} from 'lucide-react';

interface MenuScreenProps {
  customization: SwimmerCustomization;
  upgrades: SwimmerUpgrades;
  dnaPoints: number;
  onUpdateCustomization: (c: SwimmerCustomization) => void;
  onStartGame: (mode: GameMode) => void;
  onOpenUpgrades: () => void;
  highScore: number | null;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({
  customization,
  upgrades,
  dnaPoints,
  onUpdateCustomization,
  onStartGame,
  onOpenUpgrades,
  highScore,
}) => {
  const [activeTab, setActiveTab] = useState<'race' | 'intel'>('race');
  const [selectedMode, setSelectedMode] = useState<GameMode>('campaign');
  const [showVaginalModal, setShowVaginalModal] = useState(false);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-auto">
        {/* Header Title with Biological Theme */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-800/80 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Dna className="w-3.5 h-3.5" />
            <span>The 250,000,000 Swimmer Championship</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-200 to-amber-300 font-sans tracking-tight">
            SPERM RACE
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Navigate hostile pH zones, outmaneuver immune macrophages, draft slipstreams, and be the first to fertilize the ovum!
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 mb-6 gap-2">
          <button
            onClick={() => setActiveTab('race')}
            className={`pb-2.5 px-4 font-semibold text-sm transition-all border-b-2 ${
              activeTab === 'race'
                ? 'border-sky-400 text-sky-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Launch Swimmer
          </button>
          <button
            onClick={() => setActiveTab('intel')}
            className={`pb-2.5 px-4 font-semibold text-sm transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'intel'
                ? 'border-sky-400 text-sky-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="w-4 h-4" /> Anatomical Intel
          </button>
        </div>

        {activeTab === 'race' ? (
          <div className="space-y-6">
            {/* Swimmer Customization Card */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Swimmer Designation
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={customization.name}
                    onChange={(e) => onUpdateCustomization({ ...customization, name: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-100 font-semibold text-sm focus:outline-none focus:border-sky-500 w-44"
                  />
                </div>

                {/* Chromosome Toggle */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Payload Chromosome
                  </label>
                  <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => onUpdateCustomization({ ...customization, chromosome: 'X' })}
                      className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        customization.chromosome === 'X'
                          ? 'bg-pink-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ♀ X (Girl)
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateCustomization({ ...customization, chromosome: 'Y' })}
                      className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        customization.chromosome === 'Y'
                          ? 'bg-sky-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ♂ Y (Boy)
                    </button>
                  </div>
                </div>
              </div>

              {/* Baby Runner Character Preview */}
              <div className="mb-4 bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-950/80 border border-sky-800/60 text-sky-400">
                    <Baby className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>Baby Runner Morphology</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-normal">
                        Running Legs • Pumping Arms • Sneakers
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Wearing {customization.chromosome === 'X' ? 'Pink' : 'Sky Blue'} tagged diaper, #1 racing onesie & sneakers
                    </div>
                  </div>
                </div>

                {/* Animated Running Baby Preview SVG */}
                <div className="relative shrink-0 w-32 h-14 flex items-center justify-center bg-slate-950/80 rounded-lg border border-slate-800/80 overflow-hidden px-1">
                  <svg viewBox="0 0 110 44" className="w-full h-full drop-shadow-md">
                    {/* Runner Sprint Slipstream Wake */}
                    <path
                      d="M 24 22 C 16 14, 8 30, 2 22"
                      fill="none"
                      stroke={customization.trailColor || '#38bdf8'}
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 24 22 C 16 16, 10 26, 6 22"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />

                    {/* Back Running Leg (Kicking backward) */}
                    <g transform="translate(34, 15) rotate(-28)">
                      <ellipse cx="-4" cy="0" rx="5" ry="2.8" fill="#fed7aa" />
                      <ellipse cx="-8" cy="0" rx="4" ry="2.2" fill="#fed7aa" />
                      {/* Sock */}
                      <rect x="-11" y="-2" width="2" height="4" fill="#ffffff" />
                      {/* Sneaker */}
                      <ellipse cx="-13" cy="0" rx="3.5" ry="2.4" fill={customization.color || '#38bdf8'} />
                      <rect x="-16" y="-2.2" width="2" height="4.4" rx="0.8" fill="#ffffff" />
                    </g>

                    {/* Back Pumping Arm */}
                    <g transform="translate(48, 12) rotate(-35)">
                      <ellipse cx="4" cy="0" rx="4" ry="2.2" fill="#fed7aa" />
                      <circle cx="8" cy="0" r="2" fill="#fed7aa" />
                    </g>

                    {/* Chubby Torso / Onesie */}
                    <ellipse cx="46" cy="22" rx="9" ry="7" fill={customization.color || '#38bdf8'} />
                    <path d="M 44 16 A 6.5 6.5 0 0 1 44 28" fill="none" stroke="#ffffff" strokeWidth="1.2" />

                    {/* Puffy White Diaper */}
                    <path
                      d="M 44 15 Q 31 14 29 22 Q 31 30 44 29 Z"
                      fill="#ffffff"
                    />
                    <line x1="33" y1="17" x2="33" y2="27" stroke="#cbd5e1" strokeWidth="1" />
                    <rect
                      x="37"
                      y="15"
                      width="5"
                      height="2"
                      fill={customization.chromosome === 'X' ? '#f472b6' : '#38bdf8'}
                      rx="0.5"
                    />
                    <rect
                      x="37"
                      y="27"
                      width="5"
                      height="2"
                      fill={customization.chromosome === 'X' ? '#f472b6' : '#38bdf8'}
                      rx="0.5"
                    />

                    {/* Chest Racer Patch #1 */}
                    <circle cx="49" cy="22" r="3.2" fill="#ffffff" stroke={customization.chromosome === 'X' ? '#f472b6' : '#38bdf8'} strokeWidth="0.8" />
                    <text
                      x="49"
                      y="23.5"
                      textAnchor="middle"
                      fontSize="4.5"
                      fontWeight="bold"
                      fill="#eab308"
                    >
                      #1
                    </text>

                    {/* Front Running Leg (Driving forward) */}
                    <g transform="translate(36, 29) rotate(26)">
                      <ellipse cx="-4" cy="0" rx="5" ry="2.8" fill="#fed7aa" />
                      <ellipse cx="-8" cy="0" rx="4" ry="2.2" fill="#fed7aa" />
                      {/* Sock */}
                      <rect x="-11" y="-2" width="2" height="4" fill="#ffffff" />
                      {/* Sneaker */}
                      <ellipse cx="-13" cy="0" rx="3.5" ry="2.4" fill={customization.color || '#38bdf8'} />
                      <rect x="-16" y="-2.2" width="2" height="4.4" rx="0.8" fill="#ffffff" />
                    </g>

                    {/* Front Pumping Arm */}
                    <g transform="translate(48, 30) rotate(35)">
                      <ellipse cx="4" cy="0" rx="4" ry="2.2" fill="#fed7aa" />
                      <circle cx="8" cy="0" r="2" fill="#fed7aa" />
                    </g>

                    {/* Chubby Baby Head */}
                    <ellipse cx="61" cy="22" rx="9.5" ry="8" fill="#fed7aa" />
                    {/* Rosy Cheek */}
                    <ellipse cx="62" cy="26" rx="2.5" ry="1.6" fill="rgba(244, 63, 94, 0.45)" />

                    {/* Headband / Beanie Cap */}
                    <path
                      d="M 57 14 A 8 8 0 0 0 57 30 Q 55 22 57 14 Z"
                      fill={customization.color || '#38bdf8'}
                    />
                    <line x1="57" y1="14" x2="57" y2="30" stroke="#ffffff" strokeWidth="1.2" />
                    <circle cx="53" cy="22" r="2.2" fill="#ffffff" />

                    {/* Forehead Hair Curl */}
                    <path d="M 63 16 Q 65 14 64 17" fill="none" stroke="#b45309" strokeWidth="1" strokeLinecap="round" />

                    {/* Determined Baby Runner Eye */}
                    <line x1="61" y1="17" x2="65" y2="18.5" stroke="#9a3412" strokeWidth="1" />
                    <circle cx="64" cy="20" r="2.2" fill="#0f172a" />
                    <circle cx="64.7" cy="19.3" r="0.8" fill="#ffffff" />
                    <circle cx="63.4" cy="20.6" r="0.4" fill="#ffffff" />

                    {/* Pacifier (Acrosome tip) */}
                    <ellipse cx="71" cy="22" rx="1.8" ry="4.2" fill={customization.color || '#38bdf8'} />
                    <circle cx="72" cy="22" r="1.6" fill="#ffffff" />
                    <path d="M 73.5 20 A 2 2 0 0 1 73.5 24" fill="none" stroke={customization.color || '#38bdf8'} strokeWidth="1.1" />

                    {/* Cartoon Sprint Sweat Drops */}
                    <circle cx="55" cy="13" r="1.1" fill="#38bdf8" />
                    <circle cx="53" cy="11" r="0.8" fill="#38bdf8" />
                  </svg>
                </div>
              </div>

              {/* Swimmer Class Selection */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Swimmer Morphotype (Class Specialization)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(Object.keys(SWIMMER_CLASSES) as SwimmerClassType[]).map((cKey) => {
                    const cInfo = SWIMMER_CLASSES[cKey];
                    const isSelected = (customization.swimmerClass || 'balanced') === cKey;
                    return (
                      <button
                        key={cKey}
                        type="button"
                        onClick={() =>
                          onUpdateCustomization({
                            ...customization,
                            swimmerClass: cKey,
                          })
                        }
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          isSelected
                            ? 'border-sky-400 bg-sky-950/40 ring-1 ring-sky-400/40'
                            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-100 mb-0.5">{cInfo.name}</div>
                          <div className="text-[10px] text-slate-400 leading-tight mb-2 line-clamp-2">
                            {cInfo.description}
                          </div>
                        </div>
                        <div className="text-[9px] font-mono text-sky-400 bg-sky-950/60 rounded px-1.5 py-0.5 self-start">
                          {cInfo.specialAbility}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Bioluminescent Coat
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() =>
                        onUpdateCustomization({
                          ...customization,
                          color: preset.color,
                          glowColor: preset.glowColor,
                          trailColor: preset.trailColor,
                        })
                      }
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition-all ${
                        customization.color === preset.color
                          ? 'border-sky-400 bg-sky-950/40 ring-2 ring-sky-400/30'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: preset.color }}
                      />
                      <span className="text-[10px] font-medium text-slate-300 truncate w-full">
                        {preset.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Game Modes */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Mission Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedMode('campaign')}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                    selectedMode === 'campaign'
                      ? 'border-sky-400 bg-sky-950/30 shadow-lg'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-100">The Great Race</span>
                    <Flag className="w-4 h-4 text-sky-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Journey through all 5 biological zones to the Ovum.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMode('endless')}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                    selectedMode === 'endless'
                      ? 'border-amber-400 bg-amber-950/30 shadow-lg'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-100">Endless Gauntlet</span>
                    <Activity className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Survival gauntlet. Race as far as possible before exhaustion.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMode('timetrial')}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                    selectedMode === 'timetrial'
                      ? 'border-emerald-400 bg-emerald-950/30 shadow-lg'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-100">Time Trial</span>
                    <Zap className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Pure speed sprint. Maximize slipstream and ATP management.
                  </p>
                </button>
              </div>
            </div>

            {/* Upgrade Lab Shortcut & Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={onOpenUpgrades}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Dna className="w-4 h-4 text-indigo-400" />
                <span>DNA Lab ({dnaPoints} pts)</span>
              </button>

              <button
                type="button"
                id="start-race-button"
                onClick={() => onStartGame(selectedMode)}
                className="w-full sm:flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-amber-400 hover:opacity-95 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-sky-500/25 flex items-center justify-center gap-3 transition-all active:scale-95 tracking-wide"
              >
                <Play className="w-5 h-5 fill-slate-950 shrink-0" />
                <div className="flex flex-col items-start text-left leading-tight">
                  <span className="font-black">INSEMINATE & RACE</span>
                  <span className="text-[10px] font-mono font-bold tracking-tight opacity-80 uppercase">Launch via Ejaculatory Surge</span>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto shrink-0" />
              </button>
            </div>
          </div>
        ) : (
          /* Anatomical Intel Tab */
          <div className="space-y-4 text-sm text-slate-300 max-h-[60vh] overflow-y-auto pr-1">
            {/* Interactive Anatomical Vaginal Interface Showcase Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border border-rose-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400 flex items-center justify-center text-rose-300 shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-rose-200 text-sm font-mono flex items-center gap-2">
                    ANATOMICAL VAGINAL INTERFACE
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      SAGITTAL SECTION
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300/80 mt-0.5">
                    Interactive physiological cross-section: pH scales, transverse rugae ridges, Lactobacillus biofilms, and the posterior fornix seminal pool.
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="open-vaginal-interface-intel-btn"
                onClick={() => setShowVaginalModal(true)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5"
              >
                <span>OPEN INTERFACE</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hostile Biological Obstacles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-rose-900/40">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Vaginal Acid (pH 3.8)
                </div>
                <p className="text-xs text-slate-400">
                  Acid pools corrode cell vitality and drain ATP stamina. Collect blue Alkaline Shield bubbles for immunity.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-pink-900/40">
                <div className="flex items-center gap-2 text-pink-400 font-bold text-xs uppercase mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                  Spermicide Contraceptive
                </div>
                <p className="text-xs text-slate-400">
                  Nonoxynol-9 chemical droplets that instantly rupture unprotected cell membranes. Avoid at all costs!
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-900/40">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Cervical Mucus Strands
                </div>
                <p className="text-xs text-slate-400">
                  Thick micellar mesh that increases hydrodynamic drag by 60%. Use turbo boost or cilia currents to pierce through.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-sky-900/40">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  Crosscurrent Fluid Jets
                </div>
                <p className="text-xs text-slate-400">
                  Powerful transverse fluid flows that violently push your swimmer off course toward walls or hazards.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-purple-900/40">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  Uterine Macrophages
                </div>
                <p className="text-xs text-slate-400">
                  Giant white blood cells patrolling the uterus that engulf passing competitors. Stay out of their reach!
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-fuchsia-900/40">
                <div className="flex items-center gap-2 text-fuchsia-400 font-bold text-xs uppercase mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-500" />
                  Anti-Sperm Antibodies
                </div>
                <p className="text-xs text-slate-400">
                  Agglutinating immune proteins that bind flagella together, drastically reducing motility and speed.
                </p>
              </div>
            </div>

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2">Biological Power-Ups</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-amber-900/40">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase mb-1">
                  <Zap className="w-3.5 h-3.5" />
                  ATP Fructose Crystal
                </div>
                <p className="text-xs text-slate-400">
                  Instantly restores high-energy ATP stamina to power your mitochondrial propulsion boost.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-cyan-900/40">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase mb-1">
                  <Shield className="w-3.5 h-3.5" />
                  Alkaline Seminal Shield
                </div>
                <p className="text-xs text-slate-400">
                  Provides 8 seconds of absolute immunity against acid pools, spermicide, and macrophage attacks.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-yellow-900/40">
                <div className="flex items-center gap-2 text-yellow-400 font-bold text-xs uppercase mb-1">
                  <Dna className="w-3.5 h-3.5" />
                  2X DNA Score Multiplier
                </div>
                <p className="text-xs text-slate-400">
                  Doubles all DNA points collected for 10 seconds to unlock high-tier genetic upgrades faster.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-teal-900/40">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase mb-1">
                  <Magnet className="w-3.5 h-3.5" />
                  Chemotactic ATP Magnet
                </div>
                <p className="text-xs text-slate-400">
                  Creates an electro-chemical pull field that draws all nearby ATP fructose crystals straight into your path.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-violet-900/40">
                <div className="flex items-center gap-2 text-violet-400 font-bold text-xs uppercase mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Capacitation Hyper-Motility
                </div>
                <p className="text-xs text-slate-400">
                  Unleashes extreme flagellar thrashing (+25% top speed, infinite boost stamina) for 7 seconds.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-rose-900/40">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase mb-1">
                  <Flame className="w-3.5 h-3.5" />
                  Acrosome Enzyme Burst
                </div>
                <p className="text-xs text-slate-400">
                  Adds +15% instant drilling progress and restores membrane health.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 text-slate-400">
              <p className="font-semibold text-slate-200">💡 Pro Tips:</p>
              <p>• <strong>Player Size & Visibility</strong>: Your swimmer is 55% larger with a bright bioluminescent aura so you never lose track among 250M competitors.</p>
              <p>• <strong>Touch Controls</strong>: On mobile/tablet, tap anywhere to steer towards your finger, use the on-screen Virtual Joystick / Boost button, or swipe freely.</p>
              <p>• <strong>Drafting</strong>: Swim directly in rivals&apos; slipstream wake for +25% speed bonus and zero stamina drain.</p>
            </div>
          </div>
        )}
      </div>

      {/* Anatomical Vaginal Interface Modal from Menu */}
      <VaginalInterfaceModal
        isOpen={showVaginalModal}
        onClose={() => setShowVaginalModal(false)}
        telemetry={getVaginalTelemetry(0)}
        playerX={0}
      />
    </div>
  );
};
