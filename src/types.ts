export type GameState = 'menu' | 'ejaculating' | 'racing' | 'fertilizing' | 'victory' | 'gameover' | 'upgrades';

export type EjaculationPhase = 'insertion' | 'ready_to_shoot' | 'ejaculation' | 'travel';

export type GameMode = 'campaign' | 'endless' | 'timetrial';

export type ChromosomeType = 'X' | 'Y';

export type SwimmerClassType = 'balanced' | 'sprinter' | 'tank' | 'driller' | 'stealth';

export interface SwimmerClassInfo {
  id: SwimmerClassType;
  name: string;
  tagline: string;
  description: string;
  speedMultiplier: number;
  staminaMultiplier: number;
  healthMultiplier: number;
  drillMultiplier: number;
  stealthBonus: boolean;
  specialAbility: string;
  icon: string;
}

export interface SwimmerCustomization {
  name: string;
  color: string;
  glowColor: string;
  trailColor: string;
  chromosome: ChromosomeType;
  swimmerClass: SwimmerClassType;
}

export interface SwimmerUpgrades {
  motility: number;     // Speed & acceleration (Level 1-5)
  mitochondria: number; // Max ATP & recharge (Level 1-5)
  aerodynamics: number; // Agility, turn speed & slipstream (Level 1-5)
  acrosome: number;     // Egg membrane drilling power (Level 1-5)
  resistance: number;   // Acid & collision resistance (Level 1-5)
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  type?: 'spark' | 'bubble' | 'debris' | 'enzyme' | 'dna' | 'shockwave' | 'punch_pow' | 'punch_wave' | 'bump_star' | 'overcharge_flame' | 'cilia_streak' | 'slime_glob' | 'mesh_strand';
  text?: string;
}

export interface Pickup {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: 'atp' | 'shield' | 'turbo' | 'multiplier' | 'magnet' | 'enzyme_burst' | 'capacitation';
  value: number;
  bobPhase: number;
  collected?: boolean;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
  glowColor: string;
  life: number; // Seconds remaining
  isPlayer: boolean;
}

export interface Hazard {
  id: string;
  x: number;
  y: number;
  radius: number;
  health?: number;
  maxHealth?: number;
  type: 'acid' | 'mucus' | 'macrophage' | 'cilia_vortex' | 'spermicide' | 'crosscurrent' | 'antibody_cloud' | 'cilia_conveyor' | 'collagen_mesh' | 'bio_tar' | 'neutrophil_net';
  vx?: number;
  vy?: number;
  patrolRange?: number;
  startX?: number;
  startY?: number;
  pulsePhase: number;
  angle?: number;
  direction?: number; // for crosscurrents (1 = down, -1 = up)
}

export interface SwimmerTailNode {
  x: number;
  y: number;
}

export type BabyGaitType = 'sprint' | 'jog' | 'fatigued' | 'exhausted';

export interface ProceduralGait {
  gaitType: BabyGaitType;
  cadence: number;            // Current step/tail frequency in rad/s
  strideAmplitude: number;    // Stride angle multiplier (radians)
  kneeLift: number;           // Knee flexion / height
  heelKick: number;           // Backward calf kick extension
  torsoLean: number;          // Forward aerodynamic tilt (radians)
  waddleRoll: number;         // Side-to-side exhausted toddler waddle angle (radians)
  armSwingTorque: number;     // Amplitude of arm pump
  shoulderDrop: number;       // Vertical shoulder droop from fatigue
  headBobOffset: { x: number; y: number }; // Inertial head lag
  headTilt: number;           // Upright vs tired drooping chin
  eyeDroop: number;           // 0 (wide eyes) to 1 (sleepy/tired half-mast)
  breathPuffTimer: number;    // Periodic panting timer
  atpDrainRate: number;       // Net ATP burn per second
}

export interface Swimmer {
  id: string;
  name: string;
  isPlayer: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  targetAngle: number;
  speed: number;
  baseSpeed: number;
  maxSpeed: number;
  stamina: number;
  maxStamina: number;
  health: number;
  maxHealth: number;
  boosting: boolean;
  atpConsumptionRate?: number; // ATP units consumed per sec
  exhaustionLevel?: number;    // 0 (fresh) to 1 (exhausted)
  gait?: ProceduralGait;       // Dynamic procedural animation state
  color: string;
  glowColor: string;
  trailColor: string;
  chromosome: ChromosomeType;
  swimmerClass?: SwimmerClassType;
  tailNodes: SwimmerTailNode[];
  tailWigglePhase: number;
  rank: number;
  drillProgress: number; // 0 to 100 for egg penetration
  isPunching?: boolean;
  punchPhase?: number;
  shieldTimer: number; // Seconds remaining of immunity shield
  scoreMultiplierTimer: number; // Seconds remaining of 2x/3x DNA score multiplier
  scoreMultiplierValue: number; // 2 or 3
  magnetTimer: number; // Seconds remaining of ATP magnet pull
  capacitationTimer: number; // Hyper-motility state
  shootCooldown: number; // Seconds until next enzyme dart can be fired
  enzymeDarts: number; // Current ammunition count
  maxEnzymeDarts: number; // Max ammo capacity
  finished: boolean;
  finishTime?: number;
  deathReason?: string;
  bumpCooldown?: number;      // Seconds until next bump physics / sound can trigger
  stumbleTimer?: number;      // Seconds remaining of momentary collision flinch / stumble
  drafting?: boolean;         // True if riding in leader's hydrodynamic slipstream
  draftLeaderName?: string;   // Name of leader being drafted
  overcharging?: boolean;     // Emergency mitochondrial overcharge burn active
  overchargeHeat?: number;    // Heat/intensity ratio of overcharge (0 to 1)
  slowTimer?: number;         // Remaining duration of speed reduction debuff (seconds)
  slowFactor?: number;        // Speed multiplier penalty (e.g. 0.4 for -60% speed)
  slowReason?: string;        // Name of speed obstacle e.g. "COLLAGEN MESH" | "BIO-TAR" | "NET TRAP"
  aiPersonality?: {
    aggression: number;
    wiggleFreq: number;
    driftTendency: number;
    atpGreed: number;
  };
}

export interface RaceZone {
  name: string;
  subtitle: string;
  startDistance: number;
  endDistance: number;
  primaryColor: string;
  accentColor: string;
  description: string;
  hazardDensity: number;
}

export interface GameStats {
  raceTime: number;
  distanceTraveled: number;
  topSpeed: number;
  atpCollected: number;
  macrophagesEvaded: number;
  obstaclesDestroyed: number;
  spermsEliminated: number;
  rank: number;
  totalCompetitors: number;
  finalTime?: number;
  dnaPointsEarned: number;
}

export interface HighScoreRecord {
  date: string;
  mode: GameMode;
  time?: number;
  distance?: number;
  rank: number;
  chromosome: ChromosomeType;
  swimmerName: string;
}

export interface VaginalTelemetry {
  currentSegment: string;
  anatomicalDescription: string;
  phLevel: number;
  phZone: 'acidic_mantle' | 'neutralized_pool' | 'alkaline_mucus';
  temperature: number;
  mucusViscosity: string;
  lactobacillusDensity: string;
  glycogenLactateRate: string;
  tissueLayer: string;
  distanceFromIntroitus: number; // μm
  distanceToCervix: number; // μm
  inVaginalTract: boolean;
}
