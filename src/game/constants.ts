import { RaceZone, SwimmerCustomization, SwimmerUpgrades } from '../types';

export const TRACK_WIDTH = 1200; // Vertical channel bounds: 0 to 1200
export const TRACK_LENGTH = 8000; // Total race distance in units

export const ZONES: RaceZone[] = [
  {
    name: 'Vaginal Canal',
    subtitle: 'Rugae Folds & Acidic Mantle',
    startDistance: 0,
    endDistance: 1600,
    primaryColor: '#e11d48', // Rose / Flesh Pink
    accentColor: '#fb7185',
    description: 'Insemination site lined with transverse rugae folds and hostile lactic acid (pH 3.8 - 4.5). Seminal plasma provides vital alkaline buffering!',
    hazardDensity: 1.0,
  },
  {
    name: 'Cervical Crypts',
    subtitle: 'Viscous Mucus Channels',
    startDistance: 1600,
    endDistance: 3400,
    primaryColor: '#059669', // Emerald / Mucus Green
    accentColor: '#34d399',
    description: 'Thick cervical mucus slows motility. Follow liquid micro-channels and ride forward cilia currents.',
    hazardDensity: 1.2,
  },
  {
    name: 'The Uterine Ocean',
    subtitle: 'Macrophage Immune Patrol',
    startDistance: 3400,
    endDistance: 5400,
    primaryColor: '#7c3aed', // Purple / Deep biological
    accentColor: '#a78bfa',
    description: 'Wide cellular expanse patrolled by devouring white blood cell macrophages. Evade pseudopods!',
    hazardDensity: 1.4,
  },
  {
    name: 'Fallopian Oviduct',
    subtitle: 'Ciliated Upstream Rapids',
    startDistance: 5400,
    endDistance: 7000,
    primaryColor: '#0284c7', // Cyan / Thermal stream
    accentColor: '#38bdf8',
    description: 'Narrow muscular tube with peristaltic waves. Draft behind rival swimmers to conserve ATP!',
    hazardDensity: 1.5,
  },
  {
    name: 'The Ampulla & Ovum',
    subtitle: 'The Corona Radiata & Zona Pellucida',
    startDistance: 7000,
    endDistance: 8000,
    primaryColor: '#d97706', // Golden radiant amber
    accentColor: '#fbbf24',
    description: 'The final destination! Reach the glowing egg and rapidly discharge acrosome enzymes to penetrate first!',
    hazardDensity: 1.0,
  },
];

export interface ZoneLightPalette {
  r: number;
  g: number;
  b: number;
  accentR: number;
  accentG: number;
  accentB: number;
  name: string;
}

export const ZONE_LIGHT_PALETTES: ZoneLightPalette[] = [
  { r: 225, g: 29, b: 72, accentR: 251, accentG: 113, accentB: 133, name: 'Vaginal Canal' },
  { r: 5, g: 150, b: 105, accentR: 52, accentG: 211, accentB: 153, name: 'Cervical Crypts' },
  { r: 124, g: 58, b: 237, accentR: 167, accentG: 139, accentB: 250, name: 'The Uterine Ocean' },
  { r: 2, g: 132, b: 199, accentR: 56, accentG: 189, accentB: 248, name: 'Fallopian Oviduct' },
  { r: 217, g: 119, b: 6, accentR: 251, accentG: 191, accentB: 36, name: 'The Ampulla & Ovum' },
];

export const COLOR_PRESETS = [
  {
    name: 'Bioluminescent Cyan',
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.6)',
    trailColor: 'rgba(56, 189, 248, 0.4)',
  },
  {
    name: 'Electric Pearl',
    color: '#f8fafc',
    glowColor: 'rgba(248, 250, 252, 0.7)',
    trailColor: 'rgba(226, 232, 240, 0.5)',
  },
  {
    name: 'Emerald Motile',
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.6)',
    trailColor: 'rgba(16, 185, 129, 0.4)',
  },
  {
    name: 'Golden Zygote',
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    trailColor: 'rgba(245, 158, 11, 0.4)',
  },
  {
    name: 'Neon Chromosome',
    color: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.6)',
    trailColor: 'rgba(236, 72, 153, 0.4)',
  },
  {
    name: 'Hyper Violet',
    color: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.6)',
    trailColor: 'rgba(139, 92, 246, 0.4)',
  },
];

export const SWIMMER_CLASSES: Record<string, import('../types').SwimmerClassInfo> = {
  balanced: {
    id: 'balanced',
    name: 'Wild-Type Motile',
    tagline: 'Standard Baseline Profile',
    description: 'Equally balanced motility, stamina, and defense. Reliable across all biological zones.',
    speedMultiplier: 1.0,
    staminaMultiplier: 1.0,
    healthMultiplier: 1.0,
    drillMultiplier: 1.0,
    stealthBonus: false,
    specialAbility: 'Balanced hydrodynamics & stable ATP conservation',
    icon: 'Activity',
  },
  sprinter: {
    id: 'sprinter',
    name: 'Hyper-Flagellate',
    tagline: 'High Velocity Speed Demon',
    description: 'Ultra-fast swimming stroke with +30% top speed, but burns ATP 20% faster.',
    speedMultiplier: 1.3,
    staminaMultiplier: 0.85,
    healthMultiplier: 0.8,
    drillMultiplier: 0.95,
    stealthBonus: false,
    specialAbility: 'Supersonic burst swimming & faster turbo kick',
    icon: 'Zap',
  },
  tank: {
    id: 'tank',
    name: 'Alkaline Goliath',
    tagline: 'Armored & High Vitality',
    description: 'Extra thick seminal coat (+50% health) and immune to minor pH burns, but slightly heavier.',
    speedMultiplier: 0.88,
    staminaMultiplier: 1.35,
    healthMultiplier: 1.5,
    drillMultiplier: 1.0,
    stealthBonus: false,
    specialAbility: 'High acid & collision resistance with massive energy pool',
    icon: 'Shield',
  },
  driller: {
    id: 'driller',
    name: 'Acrosome Titan',
    tagline: 'Egg Penetration Specialist',
    description: 'Dense acrosomal cap packed with hyaluronidase enzymes. Melts the Zona Pellucida 2x faster.',
    speedMultiplier: 0.95,
    staminaMultiplier: 1.0,
    healthMultiplier: 0.95,
    drillMultiplier: 2.0,
    stealthBonus: false,
    specialAbility: 'Instant egg drilling power & rapid enzyme discharge',
    icon: 'Flame',
  },
  stealth: {
    id: 'stealth',
    name: 'Ghost Zygote',
    tagline: 'Immune Evasion Cloaked',
    description: 'Coated in non-reactive proteins. Immune macrophages have 50% smaller detection range.',
    speedMultiplier: 1.08,
    staminaMultiplier: 1.1,
    healthMultiplier: 0.9,
    drillMultiplier: 1.05,
    stealthBonus: true,
    specialAbility: 'Macrophage detection radius halved & superior mucus gliding',
    icon: 'Compass',
  },
};

export const DEFAULT_CUSTOMIZATION: SwimmerCustomization = {
  name: 'Swimmer #1',
  color: '#38bdf8',
  glowColor: 'rgba(56, 189, 248, 0.6)',
  trailColor: 'rgba(56, 189, 248, 0.4)',
  chromosome: 'X',
  swimmerClass: 'balanced',
};

export const DEFAULT_UPGRADES: SwimmerUpgrades = {
  motility: 1,
  mitochondria: 1,
  aerodynamics: 1,
  acrosome: 1,
  resistance: 1,
};

export const UPGRADE_CONFIG = {
  motility: {
    name: 'Tail Motility',
    description: 'Increases top speed & swimming stroke power.',
    icon: 'Activity',
    costs: [0, 50, 120, 250, 500],
    multiplier: [1, 1.15, 1.3, 1.45, 1.65],
  },
  mitochondria: {
    name: 'Mitochondrial Core',
    description: 'Expands ATP stamina pool & turbo recharge rate.',
    icon: 'Zap',
    costs: [0, 50, 120, 250, 500],
    multiplier: [1, 1.25, 1.5, 1.75, 2.1],
  },
  aerodynamics: {
    name: 'Fluid Hydrodynamics',
    description: 'Sharper steering response & slipstream drafting bonus.',
    icon: 'Compass',
    costs: [0, 40, 100, 200, 420],
    multiplier: [1, 1.2, 1.4, 1.6, 1.85],
  },
  acrosome: {
    name: 'Acrosome Enzymes',
    description: 'Powers your Enzyme Dart shooter to destroy obstacles & melt egg membranes.',
    icon: 'Sparkles',
    costs: [0, 60, 140, 280, 550],
    multiplier: [1, 1.35, 1.7, 2.1, 2.6],
  },
  resistance: {
    name: 'Alkaline Shielding',
    description: 'Reduces damage from acidic pH & collisions.',
    icon: 'Shield',
    costs: [0, 50, 120, 240, 480],
    multiplier: [1, 1.2, 1.4, 1.6, 1.8],
  },
};
