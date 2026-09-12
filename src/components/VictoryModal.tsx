import React, { useState, useEffect, useRef } from 'react';
import { GameStats, SwimmerCustomization } from '../types';
import {
  Trophy,
  Dna,
  Play,
  Sparkles,
  Clock,
  Zap,
  Heart,
  ChevronRight,
  ChevronLeft,
  Baby,
  RefreshCw,
} from 'lucide-react';
import { sound } from '../game/sound';

interface VictoryModalProps {
  stats: GameStats;
  customization: SwimmerCustomization;
  onRestart: () => void;
  onOpenUpgrades: () => void;
}

interface EmbryoStage {
  id: string;
  name: string;
  scientificName: string;
  timeline: string;
  description: string;
  funFact: string;
}

const EMBRYO_STAGES: EmbryoStage[] = [
  {
    id: 'fertilization',
    name: 'Syngamy & Zygote',
    scientificName: 'Day 1 • Single Cell Zygote',
    timeline: '12-24 Hours Post-Conception',
    description:
      'Sperm and egg pronuclei fuse together, combining 23 maternal and 23 paternal chromosomes to forge a unique 46-chromosome human genome.',
    funFact:
      'Eye color, height potential, biological sex, and thousands of distinct traits are permanently established at this exact millisecond.',
  },
  {
    id: 'cleavage',
    name: 'Cell Cleavage (2 to 8 Cells)',
    scientificName: 'Day 2-3 • Cleavage Stage',
    timeline: '30-72 Hours Post-Conception',
    description:
      'The single-celled zygote rapidly divides by mitosis: 2 cells, 4 cells, then 8 cells, tumbling down the fallopian tube toward the uterus.',
    funFact:
      'Every single cell (blastomere) at this early stage is totipotent—capable of forming any tissue or even identical twins.',
  },
  {
    id: 'morula',
    name: 'Morula (Solid Sphere)',
    scientificName: 'Day 4 • 16-32 Cell Compaction',
    timeline: '96 Hours Post-Conception',
    description:
      'Cells undergo intense compaction into a tight raspberry-like sphere, forming water-tight junctional complexes.',
    funFact:
      'The term "Morula" comes from the Latin word for mulberry due to its clustered berry appearance.',
  },
  {
    id: 'blastocyst',
    name: 'Blastocyst Implantation',
    scientificName: 'Day 5-7 • Cavitation & Trophoblast',
    timeline: 'End of Week 1',
    description:
      'A fluid-filled blastocoel cavity forms inside. The inner cell mass develops into the baby, while outer cells implant into the uterine wall.',
    funFact:
      'The trophoblast begins secreting hCG hormone—the exact chemical detected on home pregnancy tests.',
  },
  {
    id: 'embryo',
    name: 'Embryo & First Heartbeat',
    scientificName: 'Week 5-8 • Organogenesis & Limb Buds',
    timeline: 'Month 1-2',
    description:
      'Neural tube closes, arm and leg buds paddle outward, and the primitive cardiac tube starts beating rhythmically at 150 BPM.',
    funFact:
      'The embryonic heart begins pumping blood before the mother even has her first clinical ultrasound.',
  },
  {
    id: 'fetus',
    name: 'Fully Formed Fetus / Baby',
    scientificName: 'Week 12-40 • Growth & Gestation',
    timeline: 'First Trimester to Full Term',
    description:
      'All major organ systems, tiny fingers, delicate facial features, and reflex movements are formed. Ready to be welcomed into the world!',
    funFact:
      'Babies can hear outside sounds, taste maternal amniotic fluid, and practice breathing movements before birth.',
  },
];

export const VictoryModal: React.FC<VictoryModalProps> = ({
  stats,
  customization,
  onRestart,
  onOpenUpgrades,
}) => {
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const [isPlayingTimeline, setIsPlayingTimeline] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'formation' | 'stats'>('formation');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isFemale = customization.chromosome === 'X';

  // Auto-advance through stages
  useEffect(() => {
    if (!isPlayingTimeline) return;
    const interval = setInterval(() => {
      setCurrentStageIdx((prev) => {
        const next = (prev + 1) % EMBRYO_STAGES.length;
        if (next === 4) {
          sound.playFetalHeartbeat();
        } else {
          sound.playCellDivision();
        }
        return next;
      });
    }, 3800);

    return () => clearInterval(interval);
  }, [isPlayingTimeline]);

  // Sound effect on manual stage switch
  const handleSelectStage = (idx: number) => {
    setCurrentStageIdx(idx);
    setIsPlayingTimeline(false);
    if (idx === 4 || idx === 5) {
      sound.playFetalHeartbeat();
    } else {
      sound.playCellDivision();
    }
  };

  // Canvas procedural rendering for each biological stage
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.03;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Bioluminescent warm amniotic background glow
      const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 140);
      bgGrad.addColorStop(0, 'rgba(251, 146, 60, 0.18)');
      bgGrad.addColorStop(0.5, 'rgba(244, 63, 94, 0.12)');
      bgGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Microscopic floating nutrition droplets
      for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2 + time * 0.15;
        const dist = 70 + Math.sin(time + i) * 35;
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist;
        ctx.fillStyle = 'rgba(254, 240, 138, 0.45)';
        ctx.beginPath();
        ctx.arc(px, py, 1.8 + Math.sin(time * 2 + i) * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(cx, cy);

      const stage = EMBRYO_STAGES[currentStageIdx];

      switch (stage.id) {
        case 'fertilization': {
          // Zona Pellucida membrane ring
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 6;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(0, 0, 68, 0, Math.PI * 2);
          ctx.stroke();

          // Cytoplasm
          const cytoGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 65);
          cytoGrad.addColorStop(0, '#fef08a');
          cytoGrad.addColorStop(0.7, '#fb923c');
          cytoGrad.addColorStop(1, '#ea580c');
          ctx.fillStyle = cytoGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 64, 0, Math.PI * 2);
          ctx.fill();

          // Female Pronucleus
          const pulse = Math.sin(time * 3) * 2;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(-14 + Math.sin(time) * 2, -6, 18 + pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#db2777';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('23,X (♀)', -14, -6);

          // Male Pronucleus (Fusing!)
          ctx.fillStyle = isFemale ? 'rgba(244, 114, 182, 0.9)' : 'rgba(56, 189, 248, 0.9)';
          ctx.beginPath();
          ctx.arc(14 - Math.sin(time) * 2, 6, 17 + pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0f172a';
          ctx.fillText(`23,${customization.chromosome} (♂)`, 14, 6);

          // Cortical granule sparkles locking out competitors
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
            const gx = Math.cos(a + time) * 66;
            const gy = Math.sin(a + time) * 66;
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.arc(gx, gy, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case 'cleavage': {
          // 4 Blastomere mitotic cleavage cells
          const cellRadius = 26;
          const offsets = [
            { x: -22, y: -22, color: '#fbcfe8' },
            { x: 22, y: -22, color: '#fed7aa' },
            { x: 22, y: 22, color: '#bae6fd' },
            { x: -22, y: 22, color: '#ddd6fe' },
          ];

          // Outer transparent Zona Pellucida
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, 68, 0, Math.PI * 2);
          ctx.stroke();

          offsets.forEach((c, idx) => {
            const wobble = Math.sin(time * 3 + idx) * 2;
            const grad = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, cellRadius);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.6, c.color);
            grad.addColorStop(1, '#f97316');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(c.x, c.y, cellRadius + wobble, 0, Math.PI * 2);
            ctx.fill();

            // Nucleus inside each cell
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
            ctx.fill();
          });
          break;
        }

        case 'morula': {
          // Compact cluster of 16 cells (mulberry appearance)
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 66, 0, Math.PI * 2);
          ctx.stroke();

          const cellCount = 14;
          for (let i = 0; i < cellCount; i++) {
            const rad = 15;
            const rDist = i === 0 ? 0 : 28 + (i % 2) * 8;
            const rAngle = (i / (cellCount - 1)) * Math.PI * 2 + time * 0.4;
            const cxCell = i === 0 ? 0 : Math.cos(rAngle) * rDist;
            const cyCell = i === 0 ? 0 : Math.sin(rAngle) * rDist;

            const cGrad = ctx.createRadialGradient(cxCell, cyCell, 2, cxCell, cyCell, rad);
            cGrad.addColorStop(0, '#fef9c3');
            cGrad.addColorStop(0.7, '#f472b6');
            cGrad.addColorStop(1, '#c026d3');

            ctx.fillStyle = cGrad;
            ctx.beginPath();
            ctx.arc(cxCell, cyCell, rad, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cxCell - 3, cyCell - 3, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case 'blastocyst': {
          // Trophoblast outer ring + blastocoel cavity + Inner Cell Mass (Embryoblast)
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(0, 0, 64, 0, Math.PI * 2);
          ctx.stroke();

          // Fluid cavity
          ctx.fillStyle = 'rgba(254, 215, 170, 0.25)';
          ctx.beginPath();
          ctx.arc(0, 0, 61, 0, Math.PI * 2);
          ctx.fill();

          // Outer trophoblast cells along perimeter
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
            const tx = Math.cos(a) * 60;
            const ty = Math.sin(a) * 60;
            ctx.fillStyle = '#f43f5e';
            ctx.beginPath();
            ctx.arc(tx, ty, 6, 0, Math.PI * 2);
            ctx.fill();
          }

          // Inner Cell Mass (The clump destined to become the human baby!)
          const icmGrad = ctx.createRadialGradient(-20, -15, 5, -20, -15, 28);
          icmGrad.addColorStop(0, '#ffffff');
          icmGrad.addColorStop(0.5, '#67e8f9');
          icmGrad.addColorStop(1, '#0284c7');
          ctx.fillStyle = icmGrad;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(-22, -18, 24, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('EMBRYOBLAST', -22, -18);
          break;
        }

        case 'embryo': {
          // Developing embryo C-shape, head bulge, eye spot, beating heart, limb buds
          const heartPulse = Math.sin(time * 10) > 0.4 ? 1.3 : 1.0;

          // Amniotic sac
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 68, 0, Math.PI * 2);
          ctx.stroke();

          // Embryo curled body (C-curve)
          ctx.lineWidth = 26;
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#fed7aa';
          ctx.shadowColor = '#fb923c';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(-6, 2, 34, -Math.PI * 0.7, Math.PI * 0.6);
          ctx.stroke();

          // Large head cranial contour
          ctx.fillStyle = '#ffedd5';
          ctx.beginPath();
          ctx.arc(-18, -26, 20, 0, Math.PI * 2);
          ctx.fill();

          // Eye pigmented retinal spot
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.arc(-26, -26, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Arm bud
          ctx.fillStyle = '#fdba74';
          ctx.beginPath();
          ctx.ellipse(10, -6, 7, 12, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();

          // Pulsing Heart prominence (First heartbeat!)
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(-4, -6, 8 * heartPulse, 0, Math.PI * 2);
          ctx.fill();

          // Umbilical stalk
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(14, 10);
          ctx.quadraticCurveTo(34, 30, 52, 44);
          ctx.stroke();
          break;
        }

        case 'fetus': {
          // Fully sculpted baby fetus in peaceful womb pose
          const fetalFloat = Math.sin(time * 2) * 3;

          // Amniotic fluid surrounding
          const wombGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 68);
          wombGrad.addColorStop(0, 'rgba(254, 242, 242, 0.15)');
          wombGrad.addColorStop(0.8, 'rgba(251, 113, 133, 0.25)');
          wombGrad.addColorStop(1, 'rgba(225, 29, 72, 0.4)');
          ctx.fillStyle = wombGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 68, 0, Math.PI * 2);
          ctx.fill();

          // Umbilical cord helix
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(8, 14 + fetalFloat);
          ctx.bezierCurveTo(24, 32 + fetalFloat, 48, 10, 58, 48);
          ctx.stroke();

          // Fetus Head (Curled down peaceful)
          ctx.fillStyle = '#fed7aa';
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(-14, -18 + fetalFloat, 24, 0, Math.PI * 2);
          ctx.fill();

          // Cute cheek blush
          ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
          ctx.beginPath();
          ctx.arc(-22, -14 + fetalFloat, 7, 0, Math.PI * 2);
          ctx.fill();

          // Peaceful sleeping closed eye curve
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(-24, -20 + fetalFloat, 4, 0.1, Math.PI - 0.1);
          ctx.stroke();

          // Cute nose bump
          ctx.fillStyle = '#fbcfe8';
          ctx.beginPath();
          ctx.arc(-34, -16 + fetalFloat, 3, 0, Math.PI * 2);
          ctx.fill();

          // Fetus Torso curled
          ctx.fillStyle = '#ffedd5';
          ctx.beginPath();
          ctx.ellipse(0, 10 + fetalFloat, 22, 28, Math.PI / 6, 0, Math.PI * 2);
          ctx.fill();

          // Little arm folded against chest
          ctx.strokeStyle = '#fdba74';
          ctx.lineWidth = 7;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-6, -4 + fetalFloat);
          ctx.lineTo(-18, 6 + fetalFloat);
          ctx.lineTo(-10, 12 + fetalFloat);
          ctx.stroke();

          // Little feet / curled legs
          ctx.fillStyle = '#fdba74';
          ctx.beginPath();
          ctx.ellipse(14, 28 + fetalFloat, 11, 8, -Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();

          // Tiny toes
          for (let t = 0; t < 5; t++) {
            ctx.fillStyle = '#fbcfe8';
            ctx.beginPath();
            ctx.arc(8 + t * 2.8, 33 + fetalFloat, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }

          // Heart glow
          const fHeart = Math.sin(time * 8) > 0.3 ? 1.4 : 1.0;
          ctx.fillStyle = 'rgba(239, 68, 68, 0.75)';
          ctx.beginPath();
          ctx.arc(-4, 4 + fetalFloat, 4 * fHeart, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [currentStageIdx, customization.chromosome, isFemale]);

  const activeStage = EMBRYO_STAGES[currentStageIdx];

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border-2 border-amber-500/80 rounded-3xl p-5 sm:p-7 shadow-2xl relative my-auto animate-in zoom-in-95">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-600/70 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Cortical Block Triggered • 1 in 250M Champion</span>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('formation')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'formation'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Baby className="w-3.5 h-3.5" />
              <span>Baby Formation</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stats')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'stats'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Race Stats</span>
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-4">
          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-200 to-rose-300 tracking-tight">
            FERTILIZATION SUCCESSFUL!
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            <strong>{customization.name}</strong> penetrated the Zona Pellucida and initiated the miracle of new life!
          </p>
        </div>

        {activeTab === 'formation' ? (
          <div>
            {/* Interactive Canvas Stage Showcase */}
            <div className="relative bg-slate-950 rounded-2xl border border-slate-800/90 overflow-hidden mb-3 p-3 flex flex-col items-center justify-center">
              {/* Stage Title Overlay */}
              <div className="w-full flex items-center justify-between mb-1 z-10 px-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wide">
                  Stage {currentStageIdx + 1} of {EMBRYO_STAGES.length}: {activeStage.name}
                </span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-900/90 px-2 py-0.5 rounded-full border border-slate-800">
                  {activeStage.timeline}
                </span>
              </div>

              {/* Animated Canvas */}
              <canvas
                ref={canvasRef}
                width={300}
                height={200}
                className="w-full max-w-[340px] h-[180px] sm:h-[200px] object-contain"
              />

              {/* Biological description */}
              <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-left mt-2">
                <p className="text-xs text-slate-200 leading-relaxed">
                  {activeStage.description}
                </p>
                <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-amber-300/90">
                  <span className="font-bold shrink-0">💡 Fact:</span>
                  <span>{activeStage.funFact}</span>
                </div>
              </div>
            </div>

            {/* Stage Timeline Stepper Controls */}
            <div className="grid grid-cols-6 gap-1.5 mb-3">
              {EMBRYO_STAGES.map((s, idx) => {
                const isCurrent = idx === currentStageIdx;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectStage(idx)}
                    className={`py-1.5 px-1 rounded-xl text-center flex flex-col items-center justify-center border transition-all ${
                      isCurrent
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300 font-bold shadow-md shadow-amber-500/20'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-[10px] font-mono leading-none">Step {idx + 1}</span>
                    <span className="text-[9px] truncate max-w-full mt-0.5 opacity-80">
                      {s.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Play/Pause Autoplay & Step Navigation */}
            <div className="flex items-center justify-between gap-2 px-1 mb-3 text-xs">
              <button
                type="button"
                onClick={() => setIsPlayingTimeline((prev) => !prev)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPlayingTimeline ? 'animate-spin' : ''}`} />
                <span>{isPlayingTimeline ? 'Pause Autoplay' : 'Play Timeline'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentStageIdx === 0}
                  onClick={() => handleSelectStage(Math.max(0, currentStageIdx - 1))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                  title="Previous Step"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentStageIdx === EMBRYO_STAGES.length - 1}
                  onClick={() =>
                    handleSelectStage(Math.min(EMBRYO_STAGES.length - 1, currentStageIdx + 1))
                  }
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                  title="Next Step"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Genetic Baby Outcome Bar */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Paternal Chromosome</span>
                <span className="font-bold text-sky-400 font-mono">
                  {customization.chromosome} Chromosome
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Future Child Karyotype</span>
                <span className={`font-black font-mono ${isFemale ? 'text-pink-400' : 'text-sky-400'}`}>
                  {isFemale ? '♀ 46, XX (Baby Girl)' : '♂ 46, XY (Baby Boy)'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Race Statistics Breakdown Tab */
          <div className="space-y-3 my-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <Clock className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                <span className="block text-[10px] text-slate-400 font-semibold">FINISH TIME</span>
                <span className="text-sm font-bold font-mono text-slate-100">
                  {stats.raceTime.toFixed(1)}s
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <span className="block text-[10px] text-slate-400 font-semibold">ATP HARVEST</span>
                <span className="text-sm font-bold font-mono text-slate-100">
                  {stats.atpCollected}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <Sparkles className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                <span className="block text-[10px] text-slate-400 font-semibold">DNA REWARD</span>
                <span className="text-sm font-bold font-mono text-indigo-300">
                  +{stats.dnaPointsEarned} PTS
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Top Swimmer Speed:</span>
                <span className="font-mono font-bold text-sky-400">{Math.round(stats.topSpeed)} µm/s</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Obstacles Destroyed:</span>
                <span className="font-mono font-bold text-rose-400">{stats.obstaclesDestroyed ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Rival Sperms Eliminated:</span>
                <span className="font-mono font-bold text-amber-400">{stats.spermsEliminated ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Macrophages Evaded:</span>
                <span className="font-mono font-bold text-purple-400">{stats.macrophagesEvaded}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Final Championship Rank:</span>
                <span className="font-mono font-bold text-amber-400">#1 / 250,000,000</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-4">
          <button
            type="button"
            onClick={onOpenUpgrades}
            className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Dna className="w-4 h-4 text-indigo-400" />
            <span>DNA Mutation Lab</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 tracking-wide"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>RACE AGAIN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
