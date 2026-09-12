import React from 'react';
import { VaginalTelemetry } from '../types';
import { X, Activity, Droplets, Thermometer, ShieldAlert, Sparkles, Compass, Layers } from 'lucide-react';

interface VaginalInterfaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: VaginalTelemetry;
  playerX: number;
}

export const VaginalInterfaceModal: React.FC<VaginalInterfaceModalProps> = ({
  isOpen,
  onClose,
  telemetry,
  playerX,
}) => {
  if (!isOpen) return null;

  // Normalizing position within the 0 to 1600 um vaginal gauntlet
  const clampedX = Math.max(0, Math.min(1600, playerX));
  const tractPct = Math.min(100, Math.max(0, (clampedX / 1600) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border-2 border-rose-500/50 rounded-2xl shadow-2xl shadow-rose-950/50 overflow-hidden text-slate-100 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Title & Close Button */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-rose-500/30 bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400 flex items-center justify-center text-rose-300">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-rose-200 tracking-tight font-mono">
                  ANATOMICAL VAGINAL INTERFACE
                </h2>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  LIVE HISTOLOGICAL TELEMETRY
                </span>
              </div>
              <p className="text-xs text-rose-300/70">
                Female Reproductive Tract • Sagittal Section & Physiological Environment
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-slate-700"
            title="Close Interface"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* 1. Real-time Anatomical Sagittal Cross-Section Schematic */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300 font-semibold">
                <Layers className="w-4 h-4 text-rose-400" />
                <span>SAGITTAL CROSS-SECTION • LIVE SPERM TRACE</span>
              </div>
              <div className="text-xs font-mono text-rose-300 font-bold">
                DEPTH: {Math.round(playerX)} μm / 1,600 μm ({tractPct.toFixed(1)}%)
              </div>
            </div>

            {/* Interactive SVG Sagittal Diagram */}
            <div className="relative w-full h-44 sm:h-52 bg-slate-900/90 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="mucosaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4c0519" />
                    <stop offset="25%" stopColor="#881337" />
                    <stop offset="70%" stopColor="#9f1239" />
                    <stop offset="85%" stopColor="#0284c7" /> {/* Seminal pool blue transition */}
                    <stop offset="100%" stopColor="#065f46" /> {/* Cervix green */}
                  </linearGradient>

                  <linearGradient id="lumenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(244, 63, 94, 0.35)" />
                    <stop offset="50%" stopColor="rgba(15, 23, 42, 0.85)" />
                    <stop offset="100%" stopColor="rgba(244, 63, 94, 0.35)" />
                  </linearGradient>

                  <pattern id="rugaePattern" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 0 10 Q 5 0, 10 10 T 20 10" fill="none" stroke="rgba(251, 113, 133, 0.35)" strokeWidth="1.5" />
                  </pattern>
                </defs>

                {/* Surrounding Muscularis / Fibrous Pelvic Adventitia */}
                <rect x="0" y="0" width="800" height="200" fill="#090d16" />

                {/* ========================================== */}
                {/* 1. MALE COPULATORY ORGAN (x = 0 to 120)   */}
                {/* ========================================== */}
                {/* Penile Shaft Upper Wall & Buck's Fascia */}
                <path d="M 0 65 L 70 65 Q 90 55, 95 62 L 115 90 L 0 90 Z" fill="#4c0519" stroke="#881337" strokeWidth="1.5" />
                {/* Penile Shaft Lower Wall */}
                <path d="M 0 135 L 70 135 Q 90 145, 95 138 L 115 110 L 0 110 Z" fill="#4c0519" stroke="#881337" strokeWidth="1.5" />
                {/* Glans Penis Body */}
                <path d="M 70 58 Q 95 50, 115 90 L 115 110 Q 95 150, 70 142 Q 65 100, 70 58 Z" fill="#be185d" stroke="#f43f5e" strokeWidth="1.5" />
                {/* Penile Urethra Lumen with Seminal Fluid */}
                <rect x="0" y="93" width="95" height="14" fill="rgba(56, 189, 248, 0.4)" />
                {/* Fossa Navicularis Chamber */}
                <ellipse cx="102" cy="100" rx="8" ry="11" fill="rgba(255, 255, 255, 0.55)" stroke="#38bdf8" strokeWidth="1" />
                {/* External Urethral Meatus Slit at x = 115 */}
                <line x1="115" y1="88" x2="115" y2="112" stroke="#ffffff" strokeWidth="2.5" />
                <circle cx="115" cy="100" r="3" fill="#38bdf8" />
                <text x="8" y="54" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="monospace">
                  PENIS & URETHRA
                </text>
                <text x="65" y="170" fill="#fda4af" fontSize="8" fontWeight="bold" fontFamily="monospace">
                  MEATUS (EXPULSION)
                </text>

                {/* Seminal Jet Stream Eruption into Vestibule (x = 115 to 150) */}
                <path d="M 115 98 L 150 92 L 150 108 L 115 102 Z" fill="rgba(255, 255, 255, 0.7)" />
                <line x1="115" y1="96" x2="145" y2="94" stroke="#ffffff" strokeWidth="1.5" />
                <line x1="115" y1="104" x2="145" y2="106" stroke="#ffffff" strokeWidth="1.5" />

                {/* ========================================== */}
                {/* 2. VULVAR VESTIBULE & INTROITUS (x = 150) */}
                {/* ========================================== */}
                {/* Upper Vaginal Wall (Anterior Wall, ~7.5cm) */}
                <path
                  d="M 150 40 Q 300 45, 480 48 T 680 55 C 720 58, 740 75, 750 90 L 800 90 L 800 0 L 150 0 Z"
                  fill="#330a16"
                  stroke="#be185d"
                  strokeWidth="2"
                />

                {/* Lower Vaginal Wall (Posterior Wall, ~9.0cm) with Posterior Fornix Dip */}
                <path
                  d="M 150 160 Q 300 155, 480 152 T 660 148 C 690 148, 730 168, 760 168 C 780 168, 790 135, 760 110 L 800 110 L 800 200 L 150 200 Z"
                  fill="#330a16"
                  stroke="#be185d"
                  strokeWidth="2"
                />

                {/* Rugae mucosal lining pattern */}
                <rect x="155" y="45" width="510" height="25" fill="url(#rugaePattern)" opacity="0.6" />
                <rect x="155" y="130" width="510" height="25" fill="url(#rugaePattern)" opacity="0.6" />

                {/* Vaginal Lumen (The Interior Cavity) */}
                <path
                  d="M 150 40 Q 300 45, 480 48 T 680 55 C 720 58, 740 75, 750 90 L 760 100 L 750 110 C 730 120, 700 148, 660 148 Q 480 152, 300 155 T 150 160 Z"
                  fill="url(#lumenGrad)"
                />

                {/* Posterior Fornix Seminal Pool (Receptaculum Seminis) at x=640 to 760 */}
                <path
                  d="M 640 148 C 670 148, 720 170, 750 168 C 765 167, 765 135, 745 125 C 700 125, 660 135, 640 148 Z"
                  fill="rgba(56, 189, 248, 0.4)"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                <text x="640" y="184" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="monospace">
                  POSTERIOR FORNIX (SEMEN BUFFER)
                </text>

                {/* Portio Vaginalis of Cervix (External Os) at x=750 */}
                <ellipse cx="750" cy="100" rx="16" ry="24" fill="#881337" stroke="#fb7185" strokeWidth="2" />
                <circle cx="750" cy="100" r="5" fill="#020617" stroke="#f43f5e" strokeWidth="1.5" />
                <text x="700" y="85" fill="#fb7185" fontSize="8" fontWeight="bold" fontFamily="monospace">
                  CERVICAL OS
                </text>

                {/* Vaginal Introitus & Vulvar Vestibule Marker at x=150 */}
                <line x1="150" y1="20" x2="150" y2="180" stroke="#fda4af" strokeWidth="2" strokeDasharray="4 3" />
                <text x="145" y="28" fill="#fda4af" fontSize="8" fontWeight="bold" fontFamily="monospace">
                  INTROITUS (0 μm)
                </text>

                {/* Anatomical Landmark Labels */}
                <text x="260" y="32" fill="#fda4af" fontSize="8" fontFamily="monospace">
                  ANTERIOR WALL & RUGAE
                </text>
                <text x="260" y="178" fill="#fda4af" fontSize="8" fontFamily="monospace">
                  POSTERIOR WALL & RUGAE
                </text>

                {/* Live Swimmer Cursor Marker */}
                {(() => {
                  // If playerX < 0, map to penile tract (x=20 to 150)
                  // If playerX >= 0, map to vaginal tract (x=150 to 750)
                  let svgX = 150;
                  if (playerX < 0) {
                    svgX = Math.max(15, 150 + (playerX / 500) * 135);
                  } else {
                    svgX = Math.min(755, 150 + (playerX / 1600) * 600);
                  }
                  const svgY = 100 + Math.sin(svgX * 0.05) * 10;
                  return (
                    <g>
                      <circle cx={svgX} cy={svgY} r="10" fill="none" stroke="#38bdf8" strokeWidth="2" className="animate-ping" />
                      <circle cx={svgX} cy={svgY} r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                      <line x1={svgX} y1="20" x2={svgX} y2="180" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 2" opacity="0.75" />
                      <text x={Math.min(svgX + 8, 680)} y={svgY - 12} fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
                        YOU ({Math.round(playerX)} μm)
                      </text>
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Current Segment Banner */}
            <div className="mt-3 flex items-start gap-2 bg-rose-950/40 border border-rose-900/60 rounded-lg p-2.5">
              <Compass className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-rose-200 font-mono">
                  {telemetry.currentSegment}
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                  {telemetry.anatomicalDescription}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Physiological Telemetry Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Metric 1: pH Level & Chemical Mantle */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Droplets className="w-3.5 h-3.5 text-rose-400" /> VAGINAL pH LEVEL
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      telemetry.phZone === 'acidic_mantle'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    }`}
                  >
                    {telemetry.phZone === 'acidic_mantle' ? 'ACIDIC MANTLE' : 'SEMINAL BUFFER'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-rose-400">
                    pH {telemetry.phLevel}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {telemetry.phLevel < 5 ? '(Hostile Acid)' : '(Buffered)'}
                  </span>
                </div>
              </div>

              {/* pH Meter Bar */}
              <div className="mt-2.5">
                <div className="flex justify-between text-[9px] font-mono text-slate-500 mb-1">
                  <span>3.5 (Acidic)</span>
                  <span>7.0 (Neutral)</span>
                  <span>8.5 (Alkaline)</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-sky-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(5, ((telemetry.phLevel - 3.5) / 5) * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Metric 2: Microbial Microbiome Biofilm */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> MICROBIOME FLORA
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">DÖDERLEIN FLORA</span>
                </div>
                <div className="text-sm font-bold text-amber-200 mt-1">
                  Lactobacillus crispatus
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {telemetry.lactobacillusDensity}
                </p>
              </div>

              <div className="mt-2 text-[10px] font-mono bg-amber-950/30 border border-amber-800/40 rounded p-1.5 text-amber-300/90">
                ⚡ Lactic Acid Synthesis: {telemetry.glycogenLactateRate}
              </div>
            </div>

            {/* Metric 3: Fluid Viscosity & Lubrication Film */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Droplets className="w-3.5 h-3.5 text-cyan-400" /> FLUID VISCOSITY
                  </span>
                  <span className="text-[10px] text-cyan-300 font-mono">SHEAR DYNAMICS</span>
                </div>
                <div className="text-sm font-bold text-cyan-200 mt-1">
                  {telemetry.mucusViscosity}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Vaginal transudate & Bartholin mucus layer reducing shear stress.
                </p>
              </div>

              <div className="mt-2 text-[10px] font-mono bg-cyan-950/30 border border-cyan-800/40 rounded p-1.5 text-cyan-300/90">
                ✦ Liquefaction: Seminal PSA active
              </div>
            </div>

            {/* Metric 4: Core Mucosal Temperature & Distance */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Thermometer className="w-3.5 h-3.5 text-emerald-400" /> TISSUE VITALITY
                  </span>
                  <span className="text-[10px] text-emerald-300 font-mono">NORMOTHERMIC</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    {telemetry.temperature} °C
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">(98.6 °F)</span>
                </div>
              </div>

              <div className="mt-2 text-[10px] font-mono bg-slate-900 border border-slate-700/60 rounded p-1.5 text-slate-300 flex justify-between">
                <span>TO CERVIX:</span>
                <span className="text-amber-400 font-bold">{telemetry.distanceToCervix} μm</span>
              </div>
            </div>
          </div>

          {/* 3. Anatomical Histology: 4-Layer Vaginal Wall Cross-Section */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs font-mono text-rose-300 font-bold mb-3">
              <Layers className="w-4 h-4 text-rose-400" />
              <span>VAGINAL WALL HISTOLOGY • 4 ANATOMICAL LAYERS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-rose-950/30 border border-rose-900/50 rounded-lg p-3">
                <div className="font-bold text-rose-300 font-mono flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  1. Mucosa (Epithelium)
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Stratified squamous, non-keratinized epithelium. Rich in glycogen stores fermented by bacilli into lactic acid.
                </p>
              </div>

              <div className="bg-rose-950/30 border border-rose-900/50 rounded-lg p-3">
                <div className="font-bold text-rose-300 font-mono flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-pink-400" />
                  2. Lamina Propria
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Dense connective tissue packed with elastic fibers and an extensive venous plexus providing sexual transudate lubrication.
                </p>
              </div>

              <div className="bg-rose-950/30 border border-rose-900/50 rounded-lg p-3">
                <div className="font-bold text-rose-300 font-mono flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  3. Muscularis Layer
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Inner circular and outer longitudinal smooth muscle coats allowing massive elastic distension and peristaltic sperm transport.
                </p>
              </div>

              <div className="bg-rose-950/30 border border-rose-900/50 rounded-lg p-3">
                <div className="font-bold text-rose-300 font-mono flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  4. Adventitia Coat
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Outer fibrous sheath containing large blood vessels, autonomic nerve plexuses, and anchoring fascia to adjacent organs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>REAL-TIME BIOMETRIC TELEMETRY ACTIVE</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-md active:scale-95"
          >
            RESUME RACE
          </button>
        </div>
      </div>
    </div>
  );
};
