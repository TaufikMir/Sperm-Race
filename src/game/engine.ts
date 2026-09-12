import {
  Swimmer,
  SwimmerCustomization,
  SwimmerUpgrades,
  Hazard,
  Pickup,
  Particle,
  Projectile,
  GameStats,
  GameState,
  GameMode,
  EjaculationPhase,
  BabyGaitType,
  ProceduralGait,
} from '../types';
import { TRACK_LENGTH, TRACK_WIDTH, ZONES, UPGRADE_CONFIG, SWIMMER_CLASSES, ZONE_LIGHT_PALETTES } from './constants';
import { sound } from './sound';

export interface GameEngineListener {
  onStateChange: (state: GameState) => void;
  onStatsUpdate: (stats: GameStats) => void;
  onPlayerStatus: (player: Swimmer) => void;
  onZoneChange: (zoneIndex: number) => void;
  onDrillProgress: (progress: number, rivalBest: number) => void;
  onEjaculationProgress?: (timer: number, phase: EjaculationPhase) => void;
}

const AI_NAMES = [
  'Speedy-X', 'Turbo-Y', 'Alpha-Zygote', 'Flash-Motile', 'Hyper-Flagellum',
  'Gene-Runner', 'Velo-Sperm', 'Apex-Swimmer', 'Chromos-9', 'Sonic-Tail',
  'Helix-1', 'Nano-Racer', 'Zephyr-X', 'Titan-Y', 'Bio-Drift',
  'Photon-Head', 'Acro-Pro', 'Swift-Cell', 'Mighty-Mit', 'Vanguard'
];

export class GameEngine {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private lastTime: number = 0;

  public state: GameState = 'menu';
  public mode: GameMode = 'campaign';
  public player: Swimmer;
  public rivals: Swimmer[] = [];
  public hazards: Hazard[] = [];
  public pickups: Pickup[] = [];
  public particles: Particle[] = [];
  public projectiles: Projectile[] = [];
  public backgroundCells: { x: number; y: number; size: number; color: string; speedMult: number; type: 'rbc' | 'bubble' | 'cilia' }[] = [];

  public cameraX: number = 0;
  public cameraY: number = 0;
  public cameraShake: number = 0;
  public currentZoneIndex: number = 0;
  public visibleWidth: number = 1200;
  public visibleHeight: number = 800;
  public zoom: number = 1.0;
  public isMobile: boolean = false;

  // Pre-race sequence: 1. Penile Insertion -> 2. Ready to Shoot -> 3. Ejaculation Surge -> 4. Sperm Vaginal Travel
  public ejaculation = {
    active: false,
    timer: 2.6,
    totalDuration: 2.6,
    phase: 'insertion' as EjaculationPhase,
    insertionX: -460,
    insertionProgress: 0,
    announcedInsertionSound1: false,
    announcedInsertionSound2: false,
    countdownValue: 3,
    announcedBeep3: false,
    announcedBeep2: false,
    announcedBeep1: false,
    announcedGo: false,
    shake: 0,
    streamJets: [] as { x: number; y: number; vx: number; vy: number; radius: number; alpha: number; color: string }[],
    swarmMicroSperms: [] as { x: number; y: number; vx: number; vy: number; angle: number; tailPhase: number; size: number; alpha: number }[],
  };

  // Subtle biological zone bioluminescent light that follows player
  public playerLight = {
    r: 225,
    g: 29,
    b: 72,
    accentR: 251,
    accentG: 113,
    accentB: 133,
    pulsePhase: 0,
    motes: [] as { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[],
  };

  // Controls
  public input = {
    up: false,
    down: false,
    left: false,
    right: false,
    boost: false,
    shoot: false,
    pointerActive: false,
    pointerX: 0,
    pointerY: 0,
  };

  private lastPantTime: number = 0;

  // Stats
  public stats: GameStats = {
    raceTime: 0,
    distanceTraveled: 0,
    topSpeed: 0,
    atpCollected: 0,
    macrophagesEvaded: 0,
    obstaclesDestroyed: 0,
    spermsEliminated: 0,
    rank: 1,
    totalCompetitors: 250000000,
    dnaPointsEarned: 0,
  };

  public customization: SwimmerCustomization;
  public upgrades: SwimmerUpgrades;
  private listeners: GameEngineListener;

  // Ovum (Egg) state
  public egg = {
    x: TRACK_LENGTH + 400,
    y: TRACK_WIDTH / 2,
    radius: 380,
    glowPhase: 0,
    coronaAngle: 0,
    drillingWinner: null as Swimmer | null,
    corticalFlash: 0, // 0 to 1
  };

  constructor(
    canvas: HTMLCanvasElement,
    customization: SwimmerCustomization,
    upgrades: SwimmerUpgrades,
    mode: GameMode,
    listeners: GameEngineListener
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.customization = customization;
    this.upgrades = upgrades;
    this.mode = mode;
    this.listeners = listeners;

    this.player = this.createPlayerSwimmer();
    this.updateViewportMetrics();
    this.initWorld();
  }

  private createPlayerSwimmer(): Swimmer {
    const motilityMult = UPGRADE_CONFIG.motility.multiplier[this.upgrades.motility - 1] || 1;
    const mitMult = UPGRADE_CONFIG.mitochondria.multiplier[this.upgrades.mitochondria - 1] || 1;
    const resMult = UPGRADE_CONFIG.resistance.multiplier[this.upgrades.resistance - 1] || 1;

    // Class perks
    const classId = this.customization.swimmerClass || 'balanced';
    const classData = SWIMMER_CLASSES[classId] || SWIMMER_CLASSES.balanced;

    const baseSpeed = 4.8 * motilityMult * classData.speedMultiplier;
    const maxSpeed = 9.2 * motilityMult * classData.speedMultiplier;
    const maxStamina = 100 * mitMult * classData.staminaMultiplier;
    const maxHealth = 100 * resMult * classData.healthMultiplier;

    // Tail initial nodes (16 segments for player - longer & more prominent)
    const tailNodes = Array.from({ length: 16 }, (_, i) => ({
      x: 100 - i * 6,
      y: TRACK_WIDTH / 2,
    }));

    return {
      id: 'player',
      name: this.customization.name || 'Swimmer #1',
      isPlayer: true,
      x: 120,
      y: TRACK_WIDTH / 2,
      vx: 0,
      vy: 0,
      angle: 0,
      targetAngle: 0,
      speed: baseSpeed,
      baseSpeed,
      maxSpeed,
      stamina: maxStamina,
      maxStamina,
      health: maxHealth,
      maxHealth,
      boosting: false,
      color: this.customization.color,
      glowColor: this.customization.glowColor,
      trailColor: this.customization.trailColor,
      chromosome: this.customization.chromosome,
      swimmerClass: classId,
      tailNodes,
      tailWigglePhase: 0,
      rank: 1,
      drillProgress: 0,
      shieldTimer: 0,
      scoreMultiplierTimer: 0,
      scoreMultiplierValue: 1,
      magnetTimer: 0,
      capacitationTimer: 0,
      shootCooldown: 0,
      enzymeDarts: 20,
      maxEnzymeDarts: 30,
      finished: false,
    };
  }

  public updateViewportMetrics() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssWidth = this.canvas.clientWidth || (this.canvas.width / dpr) || window.innerWidth || 800;
    const cssHeight = this.canvas.clientHeight || (this.canvas.height / dpr) || window.innerHeight || 600;
    this.isMobile = cssWidth < 768 || cssHeight < 560 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    // Responsive Camera Zoom for mobile devices to show all visuals centered & fully framed
    let targetZoom = 1.0;
    if (this.isMobile) {
      if (cssWidth < cssHeight) {
        // Mobile portrait: scale to show the track height comfortably with wide horizontal visibility
        targetZoom = Math.min(1.0, Math.max(0.68, cssWidth / 520));
      } else {
        // Mobile landscape: scale so the full vertical canal (TRACK_WIDTH = 1200) fits without wall cutoffs
        targetZoom = Math.min(1.0, Math.max(0.52, cssHeight / 720));
      }
    }

    this.zoom = targetZoom;
    this.visibleWidth = cssWidth / this.zoom;
    this.visibleHeight = cssHeight / this.zoom;
  }

  public initWorld() {
    this.updateViewportMetrics();
    this.rivals = [];
    this.hazards = [];
    this.pickups = [];
    this.particles = [];
    this.projectiles = [];
    this.backgroundCells = [];
    this.currentZoneIndex = 0;
    this.egg.drillingWinner = null;
    this.egg.corticalFlash = 0;

    // Generate Background ambient biological floaters
    for (let i = 0; i < 350; i++) {
      this.backgroundCells.push({
        x: Math.random() * (TRACK_LENGTH + 1200),
        y: Math.random() * TRACK_WIDTH,
        size: 8 + Math.random() * 22,
        color: Math.random() > 0.6 ? '#dc2626' : (Math.random() > 0.5 ? '#f43f5e' : 'rgba(255,255,255,0.08)'),
        speedMult: 0.1 + Math.random() * 0.4,
        type: Math.random() > 0.4 ? 'rbc' : 'bubble',
      });
    }

    // Generate Rivals (35 dynamic AI racers)
    for (let i = 0; i < 35; i++) {
      const startX = 60 + Math.random() * 160;
      const startY = 120 + Math.random() * (TRACK_WIDTH - 240);
      const baseSpd = this.player.baseSpeed;
      const maxSpd = this.player.maxSpeed;

      const tailNodes = Array.from({ length: 13 }, (_, idx) => ({
        x: startX - idx * 5,
        y: startY,
      }));

      const colors = ['#f8fafc', '#a5f3fc', '#cbd5e1', '#fed7aa', '#fbcfe8', '#e9d5ff'];
      const chosenColor = colors[i % colors.length];

      this.rivals.push({
        id: `rival_${i}`,
        name: AI_NAMES[i % AI_NAMES.length] + (i > 15 ? `-${i}` : ''),
        isPlayer: false,
        x: startX,
        y: startY,
        vx: 0,
        vy: 0,
        angle: (Math.random() - 0.5) * 0.2,
        targetAngle: 0,
        speed: baseSpd,
        baseSpeed: baseSpd,
        maxSpeed: maxSpd,
        stamina: 80 + Math.random() * 40,
        maxStamina: 100,
        health: 100,
        maxHealth: 100,
        boosting: false,
        color: chosenColor,
        glowColor: 'rgba(255, 255, 255, 0.4)',
        trailColor: 'rgba(255, 255, 255, 0.25)',
        chromosome: Math.random() > 0.5 ? 'X' : 'Y',
        tailNodes,
        tailWigglePhase: Math.random() * Math.PI * 2,
        rank: i + 2,
        drillProgress: 0,
        shieldTimer: 0,
        scoreMultiplierTimer: 0,
        scoreMultiplierValue: 1,
        magnetTimer: 0,
        capacitationTimer: 0,
        shootCooldown: 0,
        enzymeDarts: 10,
        maxEnzymeDarts: 15,
        finished: false,
        aiPersonality: {
          aggression: 0.5 + Math.random() * 0.5,
          wiggleFreq: 1.8 + Math.random() * 0.8,
          driftTendency: (Math.random() - 0.5) * 0.04,
          atpGreed: 0.4 + Math.random() * 0.6,
        },
      });
    }

    // Generate Pickups along the track (ATP Fructose, Alkaline Shields, Turbo, Score Multiplier, Magnet, Enzyme Burst, Capacitation)
    const pickupCount = 145;
    for (let i = 0; i < pickupCount; i++) {
      const x = 300 + (i / pickupCount) * (TRACK_LENGTH - 600) + (Math.random() - 0.5) * 80;
      const y = 80 + Math.random() * (TRACK_WIDTH - 160);
      const roll = Math.random();
      let type: Pickup['type'] = 'atp';
      let radius = 14;
      let value = 35;

      if (roll > 0.88) {
        type = 'multiplier'; // 2x/3x DNA score multiplier
        radius = 16;
        value = 2;
      } else if (roll > 0.80) {
        type = 'shield';
        radius = 18;
        value = 100;
      } else if (roll > 0.72) {
        type = 'turbo';
        radius = 15;
        value = 50;
      } else if (roll > 0.64) {
        type = 'magnet'; // ATP Magnet pull
        radius = 16;
        value = 8;
      } else if (roll > 0.56) {
        type = 'capacitation'; // Hyper-motility state
        radius = 17;
        value = 6;
      } else if (roll > 0.50) {
        type = 'enzyme_burst'; // Acrosome drill boost
        radius = 15;
        value = 15;
      }

      this.pickups.push({
        id: `p_${i}`,
        x,
        y,
        radius,
        type,
        value,
        bobPhase: Math.random() * Math.PI * 2,
        collected: false,
      });
    }

    // Generate Hazards per zone
    this.generateHazards();
  }

  private generateHazards() {
    this.hazards = [];

    // Zone 1: Vaginal Gauntlet (180m - 1600m)
    // Speed-reducing obstacles: Collagen Meshes, Viscous Bio-Tar Puddles, Dense Mucus Plugs, Acid pools, & Spermicide droplets
    for (let x = 180; x < 1600; x += 110 + Math.random() * 65) {
      const roll = Math.random();
      let type: Hazard['type'] = 'acid';
      let hp = 30;
      let radius = 44 + Math.random() * 20;

      if (roll > 0.72) {
        type = 'collagen_mesh'; // Dense mesh that snags and slows by 55%
        hp = 35;
        radius = 52 + Math.random() * 18;
      } else if (roll > 0.48) {
        type = 'bio_tar'; // High viscosity tar sludge that reduces speed by 65-75%
        hp = 45;
        radius = 48 + Math.random() * 22;
      } else if (roll > 0.28) {
        type = 'mucus'; // Viscous cervical/vaginal mucus strand that impedes motility
        hp = 40;
        radius = 46 + Math.random() * 20;
      } else if (roll > 0.14) {
        type = 'spermicide';
        hp = 45;
        radius = 36 + Math.random() * 18;
      }

      this.hazards.push({
        id: `${type}_${x}`,
        x,
        y: 120 + Math.random() * (TRACK_WIDTH - 240),
        radius,
        type,
        health: hp,
        maxHealth: hp,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    // Zone 2: Cervical Crypts (1600m - 3400m)
    // Collagen Meshes, Bio-Tar Pockets, Mucus Strands, Cilia Conveyors, Vortices, & Crosscurrents
    for (let x = 1700; x < 3400; x += 150 + Math.random() * 95) {
      const roll = Math.random();
      let type: Hazard['type'] = 'mucus';
      if (roll > 0.82) type = 'cilia_conveyor';
      else if (roll > 0.66) type = 'collagen_mesh';
      else if (roll > 0.50) type = 'bio_tar';
      else if (roll > 0.32) type = 'crosscurrent';
      else if (roll > 0.16) type = 'cilia_vortex';

      const hp = type === 'mucus' ? 40 : (type === 'collagen_mesh' ? 35 : (type === 'bio_tar' ? 50 : 55));
      this.hazards.push({
        id: `cervical_${x}`,
        x,
        y: 100 + Math.random() * (TRACK_WIDTH - 200),
        radius: type === 'cilia_conveyor' ? 55 : (type === 'collagen_mesh' ? 56 : (type === 'bio_tar' ? 52 : (type === 'crosscurrent' ? 60 : 48))),
        type,
        health: hp,
        maxHealth: hp,
        pulsePhase: Math.random() * Math.PI * 2,
        direction: Math.random() > 0.5 ? 1 : -1,
      });
    }

    // Zone 3: The Uterine Ocean (3400m - 5400m)
    // Patrolling Macrophages, Neutrophil NET Traps, Bio-Tar Debris & Sticky Antibodies
    for (let x = 3500; x < 5400; x += 200 + Math.random() * 110) {
      const roll = Math.random();
      const startY = 160 + Math.random() * (TRACK_WIDTH - 320);

      if (roll > 0.65) {
        this.hazards.push({
          id: `macro_${x}`,
          x,
          y: startY,
          startX: x,
          startY,
          radius: 65 + Math.random() * 25,
          type: 'macrophage',
          health: 100,
          maxHealth: 100,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 0.8),
          patrolRange: 220,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      } else if (roll > 0.40) {
        // Neutrophil Extracellular Trap (NET)
        this.hazards.push({
          id: `net_${x}`,
          x,
          y: startY,
          radius: 58 + Math.random() * 26,
          type: 'neutrophil_net',
          health: 55,
          maxHealth: 55,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      } else if (roll > 0.20) {
        // Floating Bio-Tar Sludge Drift
        this.hazards.push({
          id: `biotar_${x}`,
          x,
          y: startY,
          radius: 54 + Math.random() * 24,
          type: 'bio_tar',
          health: 50,
          maxHealth: 50,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      } else {
        this.hazards.push({
          id: `antibody_${x}`,
          x,
          y: startY,
          radius: 50 + Math.random() * 30,
          type: 'antibody_cloud',
          health: 50,
          maxHealth: 50,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }
    }

    // Zone 4: Fallopian Oviduct (5400m - 7000m)
    // Cilia Conveyors (+30% Speed stream), Collagen Meshes, Bio-Tar Pockets, NETs & Cilia Vortices
    for (let x = 5500; x < 7000; x += 160 + Math.random() * 85) {
      const roll = Math.random();
      let type: Hazard['type'] = 'cilia_vortex';
      if (roll > 0.76) type = 'cilia_conveyor';
      else if (roll > 0.58) type = 'collagen_mesh';
      else if (roll > 0.42) type = 'bio_tar';
      else if (roll > 0.28) type = 'neutrophil_net';
      else if (roll > 0.14) type = 'crosscurrent';
      else type = 'mucus';

      const hp = type === 'mucus' ? 45 : (type === 'collagen_mesh' ? 35 : (type === 'bio_tar' ? 50 : 60));
      this.hazards.push({
        id: `fallopian_${x}`,
        x,
        y: 110 + Math.random() * (TRACK_WIDTH - 220),
        radius: type === 'cilia_conveyor' ? 58 : (type === 'collagen_mesh' ? 55 : (type === 'bio_tar' ? 50 : 48 + Math.random() * 24)),
        type,
        health: hp,
        maxHealth: hp,
        pulsePhase: Math.random() * Math.PI * 2,
        direction: Math.random() > 0.5 ? 1 : -1,
      });
    }
  }

  public start(mode: GameMode = 'campaign', skipEjaculation: boolean = false) {
    this.mode = mode;
    this.player = this.createPlayerSwimmer();
    this.initWorld();
    this.stats.raceTime = 0;
    this.stats.distanceTraveled = 0;
    this.stats.atpCollected = 0;
    this.stats.macrophagesEvaded = 0;
    this.stats.obstaclesDestroyed = 0;
    this.stats.spermsEliminated = 0;
    this.stats.topSpeed = 0;
    this.stats.dnaPointsEarned = 0;
    this.currentZoneIndex = 0;
    const initialPalette = ZONE_LIGHT_PALETTES[0];
    this.playerLight.r = initialPalette.r;
    this.playerLight.g = initialPalette.g;
    this.playerLight.b = initialPalette.b;
    this.playerLight.accentR = initialPalette.accentR;
    this.playerLight.accentG = initialPalette.accentG;
    this.playerLight.accentB = initialPalette.accentB;
    this.playerLight.pulsePhase = 0;
    this.playerLight.motes = [];
    this.lastTime = performance.now();

    sound.startAmbient();

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (skipEjaculation) {
      this.state = 'racing';
      this.listeners.onStateChange('racing');
      this.listeners.onPlayerStatus({ ...this.player });
    } else {
      this.initEjaculation();
    }

    this.runLoop();
  }

  public restart(skipEjaculation: boolean = false) {
    this.start(this.mode, skipEjaculation);
  }

  public initEjaculation() {
    this.state = 'ejaculating';
    this.ejaculation.active = true;
    this.ejaculation.totalDuration = 2.6;
    this.ejaculation.timer = 2.6;
    this.ejaculation.phase = 'insertion';
    this.ejaculation.insertionX = -460;
    this.ejaculation.insertionProgress = 0;
    this.ejaculation.announcedInsertionSound1 = false;
    this.ejaculation.announcedInsertionSound2 = false;
    this.ejaculation.countdownValue = 3;
    this.ejaculation.announcedBeep3 = false;
    this.ejaculation.announcedBeep2 = false;
    this.ejaculation.announcedBeep1 = false;
    this.ejaculation.announcedGo = false;
    this.ejaculation.shake = 0;

    // Reset player position inside glans penis fossa navicularis
    this.player.x = -510;
    this.player.y = TRACK_WIDTH / 2;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.angle = 0;
    this.player.speed = 0;
    this.player.shieldTimer = 5.0; // Seminal plasma coating grants starting shield!
    this.player.tailNodes = Array.from({ length: 16 }, (_, i) => ({
      x: this.player.x - i * 6,
      y: TRACK_WIDTH / 2,
    }));

    // Place rivals inside the penile urethra preparing for expulsion
    this.rivals.forEach((rival, idx) => {
      rival.x = -590 - (idx % 6) * 26;
      rival.y = (TRACK_WIDTH / 2) + (Math.random() - 0.5) * 80;
      rival.vx = 0;
      rival.vy = 0;
      rival.angle = (Math.random() - 0.5) * 0.15;
      rival.speed = 0;
      rival.drillProgress = 0;
      rival.shieldTimer = 5.0;
      rival.tailNodes = Array.from({ length: 13 }, (_, i) => ({
        x: rival.x - i * 5,
        y: rival.y,
      }));
    });

    // Populate 220 micro-sperm cells for the 250M swarm visual effect
    this.ejaculation.swarmMicroSperms = [];
    for (let i = 0; i < 220; i++) {
      this.ejaculation.swarmMicroSperms.push({
        x: -900 + Math.random() * 400,
        y: (TRACK_WIDTH / 2) + (Math.random() - 0.5) * 90,
        vx: 12 + Math.random() * 14,
        vy: (Math.random() - 0.5) * 3,
        angle: (Math.random() - 0.5) * 0.25,
        tailPhase: Math.random() * Math.PI * 2,
        size: 2.2 + Math.random() * 2.6,
        alpha: 0.5 + Math.random() * 0.5,
      });
    }

    // Populate initial stream jets
    this.ejaculation.streamJets = [];
    for (let i = 0; i < 60; i++) {
      this.ejaculation.streamJets.push({
        x: -800 + Math.random() * 320,
        y: (TRACK_WIDTH / 2) + (Math.random() - 0.5) * 80,
        vx: 18 + Math.random() * 16,
        vy: (Math.random() - 0.5) * 4,
        radius: 6 + Math.random() * 12,
        alpha: 0.6 + Math.random() * 0.3,
        color: Math.random() > 0.4 ? 'rgba(255, 255, 255, 0.88)' : 'rgba(224, 242, 254, 0.8)',
      });
    }

    // Play penile insertion sound right at the start
    sound.playPenileInsertion();

    // Camera initial position centered right on the insertion contact area
    this.updateViewportMetrics();
    const focalX = this.ejaculation.insertionX * 0.6 + 50 * 0.4;
    this.cameraX = focalX - (this.visibleWidth * 0.5);
    this.cameraY = (TRACK_WIDTH / 2) - (this.visibleHeight * 0.5);

    this.listeners.onStateChange('ejaculating');
    this.listeners.onPlayerStatus({ ...this.player });
    if (this.listeners.onEjaculationProgress) {
      this.listeners.onEjaculationProgress(this.ejaculation.timer, 'insertion');
    }
  }

  // Shoot sperm button trigger after penile insertion
  public shootSperm() {
    if (this.state !== 'ejaculating') return;
    if (this.ejaculation.phase !== 'ready_to_shoot' && this.ejaculation.phase !== 'insertion') return;

    this.ejaculation.phase = 'ejaculation';
    this.ejaculation.timer = 4.2;
    this.ejaculation.totalDuration = 4.2;
    this.ejaculation.insertionProgress = 1;
    this.ejaculation.insertionX = 360;
    this.ejaculation.shake = 32;

    // Trigger powerful sound effect
    sound.playEjaculationSurge();

    // Burst shockwave particles
    for (let i = 0; i < 45; i++) {
      const angle = (Math.random() - 0.5) * 1.5;
      const spd = 12 + Math.random() * 22;
      this.particles.push({
        x: 360,
        y: (TRACK_WIDTH / 2) + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 4 + Math.random() * 6,
        color: Math.random() > 0.3 ? '#38bdf8' : '#ffffff',
        alpha: 1,
        decay: 0.035,
        type: 'bubble',
      });
    }

    // Populate high velocity stream jets erupting from meatus into vagina
    for (let i = 0; i < 50; i++) {
      this.ejaculation.streamJets.push({
        x: 360 + (Math.random() - 0.2) * 50,
        y: (TRACK_WIDTH / 2) + (Math.random() - 0.5) * 80,
        vx: 32 + Math.random() * 28,
        vy: (Math.random() - 0.5) * 8,
        radius: 7 + Math.random() * 16,
        alpha: 0.95,
        color: Math.random() > 0.35 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(224, 242, 254, 0.85)',
      });
    }

    if (this.listeners.onEjaculationProgress) {
      this.listeners.onEjaculationProgress(this.ejaculation.timer, 'ejaculation');
    }
  }

  public finishEjaculationAndStartRace() {
    if (this.state !== 'ejaculating') return;
    this.ejaculation.active = false;
    this.state = 'racing';
    this.stats.raceTime = 0;
    this.player.x = Math.max(900, this.player.x);
    this.stats.distanceTraveled = Math.round(this.player.x);

    // Initial forward surge propulsion from the ejaculation fluid jet
    this.player.vx = 9.5;
    this.player.speed = this.player.maxSpeed * 1.25;
    this.player.shieldTimer = 5.0; // Seminal plasma buffer grants starting alkaline shield!

    this.rivals.forEach((rival, idx) => {
      rival.x = this.player.x - 50 + idx * 14 + Math.random() * 35;
      rival.vx = this.player.vx;
      rival.speed = this.player.speed;
      rival.baseSpeed = this.player.baseSpeed;
      rival.maxSpeed = this.player.maxSpeed;
      rival.shieldTimer = 4.5;
    });

    // Sound GO!
    sound.playCountdownBeep(true);

    // Launch burst shockwave particles
    for (let i = 0; i < 45; i++) {
      const angle = (Math.random() - 0.5) * 1.2;
      const spd = 6 + Math.random() * 12;
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 3 + Math.random() * 5,
        color: '#38bdf8',
        alpha: 1,
        decay: 0.04,
        type: 'bubble',
      });
    }

    this.listeners.onStateChange('racing');
    this.listeners.onPlayerStatus({ ...this.player });

    // Guarantee render loop is running if it was stopped
    if (!this.animFrameId) {
      this.lastTime = performance.now();
      this.runLoop();
    }
  }

  private updateEjaculation(dt: number) {
    // Shake dampening
    this.ejaculation.shake *= 0.94;

    // ========================================================
    // STAGE 1: PENILE INSERTION (timer decreases from 2.6s down to 0)
    // ========================================================
    if (this.ejaculation.phase === 'insertion') {
      this.ejaculation.timer -= dt;
      const elapsed = 2.6 - this.ejaculation.timer;
      const p = Math.min(1, Math.max(0, elapsed / 2.6));
      // Smooth cubic ease-in-out
      const easeP = p * p * (3 - 2 * p);
      this.ejaculation.insertionProgress = easeP;
      // Penis glides forward from outside (-460) into vaginal canal (+360)
      this.ejaculation.insertionX = -460 + easeP * 820;

      // Insertion sound triggers
      if (elapsed >= 0.8 && !this.ejaculation.announcedInsertionSound1) {
        this.ejaculation.announcedInsertionSound1 = true;
        sound.playPenileInsertion();
      }
      if (elapsed >= 1.8 && !this.ejaculation.announcedInsertionSound2) {
        this.ejaculation.announcedInsertionSound2 = true;
        sound.playPenileInsertion();
      }

      // Player rides along in the fossa navicularis
      this.player.x = this.ejaculation.insertionX - 50;
      this.player.y = (TRACK_WIDTH / 2) + Math.sin(elapsed * 4) * 4;

      // Rivals ride along in the penile urethra
      this.rivals.forEach((rival, idx) => {
        rival.x = this.ejaculation.insertionX - 120 - (idx % 6) * 22;
        rival.y = (TRACK_WIDTH / 2) + Math.sin(idx + elapsed * 3) * 14;
      });

      // Camera: DEAD CENTER on the insertion junction / introitus penetration
      const focalX = this.ejaculation.insertionX * 0.65 + 50 * 0.35;
      const targetCamX = focalX - (this.visibleWidth * 0.5);
      const targetCamY = (TRACK_WIDTH / 2) - (this.visibleHeight * 0.5);
      this.cameraX += (targetCamX - this.cameraX) * 0.14;
      this.cameraY += (targetCamY - this.cameraY) * 0.14;

      if (this.listeners.onEjaculationProgress) {
        this.listeners.onEjaculationProgress(Math.max(0, this.ejaculation.timer), 'insertion');
      }

      // Transition to READY_TO_SHOOT when insertion reaches depth 360
      if (this.ejaculation.timer <= 0) {
        this.ejaculation.phase = 'ready_to_shoot';
        this.ejaculation.insertionProgress = 1;
        this.ejaculation.insertionX = 360;
        sound.playCountdownBeep(false);
        if (this.listeners.onEjaculationProgress) {
          this.listeners.onEjaculationProgress(0, 'ready_to_shoot');
        }
      }
    }
    // ========================================================
    // STAGE 1.5: READY TO SHOOT (Penis fully inserted inside vagina, awaiting button press)
    // ========================================================
    else if (this.ejaculation.phase === 'ready_to_shoot') {
      // Gentle anticipatory breathing pulse while penis is inserted in the vagina
      const breath = Math.sin(performance.now() * 0.0045) * 4;
      this.ejaculation.insertionX = 360 + breath;

      this.player.x = this.ejaculation.insertionX - 25;
      this.player.y = (TRACK_WIDTH / 2) + Math.sin(performance.now() * 0.005) * 3;

      this.rivals.forEach((rival, idx) => {
        rival.x = this.ejaculation.insertionX - 70 - (idx % 6) * 20;
        rival.y = (TRACK_WIDTH / 2) + Math.sin(idx + performance.now() * 0.004) * 16;
      });

      // Camera: DEAD CENTER on the inserted glans, meatus, and vaginal canal entrance
      const focalX = 360;
      const targetCamX = focalX - (this.visibleWidth * 0.5);
      const targetCamY = (TRACK_WIDTH / 2) - (this.visibleHeight * 0.5);
      this.cameraX += (targetCamX - this.cameraX) * 0.14;
      this.cameraY += (targetCamY - this.cameraY) * 0.14;

      if (this.listeners.onEjaculationProgress) {
        this.listeners.onEjaculationProgress(0, 'ready_to_shoot');
      }
    }
    // ========================================================
    // STAGE 2: EJACULATION & SEMINAL SURGE (timer: 4.2s -> 1.4s)
    // ========================================================
    else if (this.ejaculation.phase === 'ejaculation') {
      this.ejaculation.timer -= dt;
      const t = this.ejaculation.timer;
      const elapsed = 4.2 - t;

      // Rhythmic thrust spasms of the inserted penis
      const thrustSpasm = Math.sin(elapsed * 8.5) * 10;
      this.ejaculation.insertionX = 360 + thrustSpasm;

      // Countdown audio and secondary surges:
      if (t <= 3.2 && !this.ejaculation.announcedBeep3) {
        this.ejaculation.announcedBeep3 = true;
        this.ejaculation.countdownValue = 3;
        sound.playCountdownBeep(false);
        this.ejaculation.shake = 16;
      }
      if (t <= 2.2 && !this.ejaculation.announcedBeep2) {
        this.ejaculation.announcedBeep2 = true;
        this.ejaculation.countdownValue = 2;
        sound.playCountdownBeep(false);
        sound.playEjaculationSurge();
        this.ejaculation.shake = 22;
      }

      // Player surges forward to the meatal exit into vaginal canal
      this.player.x = this.ejaculation.insertionX + 20 + elapsed * 42;
      this.player.y = (TRACK_WIDTH / 2) + Math.sin(elapsed * 6) * 6;

      // Rivals erupt from urethra into vaginal lumen
      this.rivals.forEach((rival, idx) => {
        rival.x = this.ejaculation.insertionX - 40 + (idx % 6) * 20 + elapsed * 50;
        rival.y = (TRACK_WIDTH / 2) + Math.sin(idx * 1.5 + elapsed * 3) * 80;
      });

      // Seminal fluid jets erupting from meatus into the vaginal vault
      if (this.ejaculation.streamJets.length < 150) {
        for (let i = 0; i < 6; i++) {
          this.ejaculation.streamJets.push({
            x: this.ejaculation.insertionX + (Math.random() - 0.2) * 40,
            y: (TRACK_WIDTH / 2) + (Math.random() - 0.5) * 90,
            vx: 30 + Math.random() * 26,
            vy: (Math.random() - 0.5) * 7,
            radius: 6 + Math.random() * 16,
            alpha: 0.9,
            color: Math.random() > 0.35 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(224, 242, 254, 0.85)',
          });
        }
      }

      // Camera: DEAD CENTER on the ejaculatory meatus and erupting seminal cloud
      const focalX = this.ejaculation.insertionX + 110;
      const targetCamX = focalX - (this.visibleWidth * 0.5);
      const targetCamY = (TRACK_WIDTH / 2) - (this.visibleHeight * 0.5);
      this.cameraX += (targetCamX - this.cameraX) * 0.14;
      this.cameraY += (targetCamY - this.cameraY) * 0.14;

      if (this.listeners.onEjaculationProgress) {
        this.listeners.onEjaculationProgress(Math.max(0, this.ejaculation.timer), 'ejaculation');
      }

      if (t <= 1.4) {
        this.ejaculation.phase = 'travel';
      }
    }
    // ========================================================
    // STAGE 3: SPERM TRAVELING THROUGH VAGINA (timer: 1.4s -> 0.0s)
    // ========================================================
    else if (this.ejaculation.phase === 'travel') {
      this.ejaculation.timer -= dt;
      const t = this.ejaculation.timer;
      const elapsed = 1.4 - t;
      this.ejaculation.insertionX = 360;

      // Countdown audio:
      if (t <= 1.0 && !this.ejaculation.announcedBeep1) {
        this.ejaculation.announcedBeep1 = true;
        this.ejaculation.countdownValue = 1;
        sound.playCountdownBeep(false);
        this.ejaculation.shake = 12;
      }
      if (t <= 0.05 && !this.ejaculation.announcedGo) {
        this.ejaculation.announcedGo = true;
        this.finishEjaculationAndStartRace();
        return;
      }

      // Sperm traveling smoothly and rapidly through the vaginal canal
      const travP = Math.min(1, Math.max(0, elapsed / 1.4));
      const easedTravP = Math.pow(travP, 1.15);
      this.player.x = 450 + easedTravP * 450; // Travels from 450 to 900 μm
      this.player.y = (TRACK_WIDTH / 2) + Math.sin(elapsed * 5.5) * 18;

      // Rivals swim along through the vaginal canal
      this.rivals.forEach((rival, idx) => {
        rival.x = this.player.x - 35 + (idx % 4) * 16 + Math.sin(idx + elapsed * 4) * 35;
        rival.y = (TRACK_WIDTH / 2) + Math.sin(idx * 2 + elapsed * 2.8) * 110;
      });

      // Camera: DEAD CENTER on the traveling sperm in the vaginal canal!
      const targetCamX = this.player.x - (this.visibleWidth * 0.5);
      const targetCamY = (TRACK_WIDTH / 2) - (this.visibleHeight * 0.5);
      this.cameraX += (targetCamX - this.cameraX) * 0.14;
      this.cameraY += (targetCamY - this.cameraY) * 0.14;

      if (this.listeners.onEjaculationProgress) {
        this.listeners.onEjaculationProgress(Math.max(0, this.ejaculation.timer), 'travel');
      }
    }

    // Update existing stream jets
    for (let i = this.ejaculation.streamJets.length - 1; i >= 0; i--) {
      const jet = this.ejaculation.streamJets[i];
      jet.x += jet.vx * dt * 60;
      jet.y += jet.vy * dt * 60;
      jet.alpha -= dt * 0.45;
      if (jet.alpha <= 0 || jet.x > 1400) {
        this.ejaculation.streamJets.splice(i, 1);
      }
    }

    // Update 250M swarm micro-sperms
    this.ejaculation.swarmMicroSperms.forEach((ms) => {
      ms.x += ms.vx * dt * 60;
      ms.y += ms.vy * dt * 60;
      ms.tailPhase += dt * 28;
      if (ms.x > 1200) {
        ms.x = this.ejaculation.insertionX - 100 + Math.random() * 150;
        ms.y = (TRACK_WIDTH / 2) + (Math.random() - 0.5) * 110;
      }
    });

    // Animate player and rivals tail wiggling in the seminal stream
    this.player.tailWigglePhase += dt * 20;
    this.player.tailNodes.forEach((node, i) => {
      node.x = this.player.x - i * 6;
      node.y = this.player.y + Math.sin(this.player.tailWigglePhase - i * 0.4) * (i * 1.3);
    });

    this.rivals.forEach((r) => {
      r.tailWigglePhase += dt * 18;
      r.tailNodes.forEach((node, i) => {
        node.x = r.x - i * 5;
        node.y = r.y + Math.sin(r.tailWigglePhase - i * 0.4) * (i * 1.1);
      });
    });

    this.updateParticles(dt);
    this.updatePlayerLight(dt);
  }

  public pause() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    sound.stopAmbient();
  }

  public resume() {
    if (this.state === 'racing' || this.state === 'fertilizing' || this.state === 'ejaculating') {
      this.lastTime = performance.now();
      sound.startAmbient();
      this.runLoop();
    }
  }

  public destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    sound.stopAmbient();
  }

  private runLoop() {
    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
      this.lastTime = currentTime;

      this.update(dt);
      this.render();

      if (this.state === 'racing' || this.state === 'fertilizing' || this.state === 'ejaculating') {
        this.animFrameId = requestAnimationFrame(loop);
      }
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  // Fire an Acrosomal Enzyme Dart to neutralize hazards or rival sperms
  public fireProjectile(isPlayer: boolean = true) {
    if (this.state !== 'racing') return false;

    const swimmer = isPlayer ? this.player : null;
    if (!swimmer || swimmer.finished) return false;

    if (swimmer.shootCooldown > 0) return false;
    if (swimmer.enzymeDarts <= 0) {
      sound.playHazardHit();
      return false;
    }

    swimmer.enzymeDarts = Math.max(0, swimmer.enzymeDarts - 1);
    const acrosomeMult = UPGRADE_CONFIG.acrosome.multiplier[this.upgrades.acrosome - 1] || 1;
    const classId = swimmer.swimmerClass || 'balanced';
    const classDrillMult = SWIMMER_CLASSES[classId]?.drillMultiplier || 1.0;

    // Faster cooldown for upgraded acrosome / titan class
    swimmer.shootCooldown = Math.max(0.12, 0.28 / (acrosomeMult * classDrillMult));

    // Calculate projectile speed & direction
    const projSpeed = 16 + swimmer.speed * 0.5;
    const vx = Math.cos(swimmer.angle) * projSpeed;
    const vy = Math.sin(swimmer.angle) * projSpeed;
    const spawnDist = isPlayer ? 24 : 16;
    const startX = swimmer.x + Math.cos(swimmer.angle) * spawnDist;
    const startY = swimmer.y + Math.sin(swimmer.angle) * spawnDist;

    const damage = 35 * acrosomeMult * classDrillMult;

    this.projectiles.push({
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      x: startX,
      y: startY,
      vx,
      vy,
      radius: 6,
      damage,
      color: '#f43f5e',
      glowColor: '#fb7185',
      life: 2.2,
      isPlayer: true,
    });

    sound.playEnzymeShot();

    // Muzzle flash particles
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: startX,
        y: startY,
        vx: vx * 0.2 + (Math.random() - 0.5) * 3,
        vy: vy * 0.2 + (Math.random() - 0.5) * 3,
        size: 3 + Math.random() * 3,
        color: '#f43f5e',
        alpha: 1,
        decay: 0.08,
        type: 'enzyme',
      });
    }

    return true;
  }

  // Rapid Baby Punch combo when punching the egg to enter!
  public manualDrillPulse() {
    if (this.state !== 'fertilizing' || this.player.finished) return;

    const acrosomeMult = UPGRADE_CONFIG.acrosome.multiplier[this.upgrades.acrosome - 1] || 1;
    this.player.drillProgress = Math.min(100, this.player.drillProgress + 5.5 * acrosomeMult);
    this.player.isPunching = true;
    this.player.punchPhase = (this.player.punchPhase || 0) + Math.PI * 0.95;

    sound.playEggPunch(true);

    // Comic action punch phrases
    const punchWords = ['POW!', 'BAM!', 'WHAM!', 'SMACK!', 'ORA!', 'PUNCH!', 'CRACK!'];
    const word = punchWords[Math.floor(Math.random() * punchWords.length)];

    // Spawn comic action punch burst particle
    this.particles.push({
      x: this.egg.x - this.egg.radius + (Math.random() - 0.5) * 8,
      y: this.player.y + (Math.random() - 0.5) * 16,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -1.8 - Math.random() * 2,
      size: 14 + Math.random() * 4,
      color: '#fef08a',
      alpha: 1,
      decay: 0.035,
      type: 'punch_pow',
      text: word,
    });

    // Spawn punch impact shockwave ring on the egg surface
    this.particles.push({
      x: this.egg.x - this.egg.radius + 3,
      y: this.player.y + (Math.random() - 0.5) * 10,
      vx: 0,
      vy: 0,
      size: 12,
      color: '#fbbf24',
      alpha: 1,
      decay: 0.05,
      type: 'punch_wave',
    });

    // Spawn flying impact sparks & stars
    for (let i = 0; i < 7; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 1.4;
      const spd = 3 + Math.random() * 5;
      this.particles.push({
        x: this.egg.x - this.egg.radius + 3,
        y: this.player.y,
        vx: -Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 3 + Math.random() * 4,
        color: i % 2 === 0 ? '#fef08a' : '#f59e0b',
        alpha: 1,
        decay: 0.05,
        type: 'spark',
      });
    }

    // Climax Sabotage: Punching the egg also unleashes a radial knockback wave hitting adjacent rival sperm!
    for (const rival of this.rivals) {
      if (rival.finished) continue;
      const atEgg = rival.x >= this.egg.x - this.egg.radius - 45;
      const distY = Math.abs(rival.y - this.player.y);
      if (atEgg && distY < 85) {
        // Sabotage rival drilling progress!
        const lostDrill = 3.5 + Math.random() * 4.5;
        rival.drillProgress = Math.max(0, rival.drillProgress - lostDrill);
        rival.x -= 30;
        rival.vx = -8;
        rival.stumbleTimer = 0.55;
        sound.playSabotageSmack();

        const sabotageWords = ['SABOTAGE!', 'BACK OFF!', 'MINE!', 'SMACK!'];
        const sword = sabotageWords[Math.floor(Math.random() * sabotageWords.length)];
        this.particles.push({
          x: rival.x,
          y: rival.y - 12,
          vx: -1 - Math.random() * 1.5,
          vy: -1.5,
          size: 13,
          color: '#ef4444',
          alpha: 1,
          decay: 0.04,
          type: 'punch_pow',
          text: sword,
        });

        for (let s = 0; s < 5; s++) {
          this.particles.push({
            x: rival.x,
            y: rival.y,
            vx: -3 - Math.random() * 3,
            vy: (Math.random() - 0.5) * 4,
            size: 3.5,
            color: '#facc15',
            alpha: 1,
            decay: 0.06,
            type: 'bump_star',
          });
        }
      }
    }

    this.checkEggCompletion();
  }

  private update(dt: number) {
    this.updateViewportMetrics();
    if (this.state === 'ejaculating') {
      this.updateEjaculation(dt);
      return;
    }

    if (this.state !== 'racing' && this.state !== 'fertilizing') return;

    this.stats.raceTime += dt;
    this.egg.glowPhase += dt * 2.5;
    this.egg.coronaAngle += dt * 0.15;

    // 1. Update Player Input and Physics
    this.updatePlayer(dt);

    // 2. Update AI Rivals
    this.updateRivals(dt);

    // 2.5 Update Interactive Swarm & Crowd Collisions (Bumps, Repulsion, Slowdowns)
    this.updateSwimmerCrowdCollisions(dt);

    // 3. Update Projectiles (Enzyme darts hitting obstacles and sperms)
    this.updateProjectiles(dt);

    // 4. Update Hazards (Macrophage movement, acid pulse)
    this.updateHazards(dt);

    // 5. Update Pickups & Particle Systems
    this.updatePickups();
    this.updateParticles(dt);

    // 5. Check Zone Progression
    this.updateZones();

    // 5.5 Update Player Bioluminescent Zone Light
    this.updatePlayerLight(dt);

    // 6. Calculate Rank & Leaderboard Standing
    this.updateRankings();

    // 7. Update Camera: On mobile devices, center player directly in the horizontal and vertical center
    const hRatio = this.isMobile ? 0.5 : 0.35;
    let targetCamX = this.player.x - this.visibleWidth * hRatio;
    let targetCamY = this.player.y - this.visibleHeight * 0.5;

    if (this.state === 'fertilizing') {
      // In egg drilling mode, center right between player punch contact and ovum
      const focalX = (this.player.x + this.egg.x) * 0.5;
      const focalY = TRACK_WIDTH / 2;
      targetCamX = focalX - this.visibleWidth * 0.5;
      targetCamY = focalY - this.visibleHeight * 0.5;
    } else if (this.visibleHeight >= TRACK_WIDTH) {
      // If the visible height spans the canal, center the canal vertically
      targetCamY = (TRACK_WIDTH / 2) - this.visibleHeight * 0.5;
    } else {
      // Smoothly clamp within canal boundaries
      targetCamY = Math.max(-80, Math.min(TRACK_WIDTH - this.visibleHeight + 80, targetCamY));
    }

    this.cameraX += (targetCamX - this.cameraX) * 0.1;
    this.cameraY += (targetCamY - this.cameraY) * 0.1;

    // Decay camera impact shake
    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - 9 * dt);
    }

    // Notify UI listeners
    this.stats.distanceTraveled = Math.round(this.player.x);
    if (this.player.speed > this.stats.topSpeed) {
      this.stats.topSpeed = Math.round(this.player.speed * 10);
    }
    this.listeners.onStatsUpdate({ ...this.stats });
    this.listeners.onPlayerStatus({ ...this.player });

    // Check if player died
    if (this.player.health <= 0) {
      this.handleGameOver(this.player.deathReason || 'Depleted cell vitality in the reproductive tract.');
    }
  }

  private updatePlayer(dt: number) {
    if (this.player.finished) return;

    // Power-up timers countdown
    if (this.player.shieldTimer > 0) {
      this.player.shieldTimer = Math.max(0, this.player.shieldTimer - dt);
    }
    if (this.player.scoreMultiplierTimer > 0) {
      this.player.scoreMultiplierTimer = Math.max(0, this.player.scoreMultiplierTimer - dt);
      if (this.player.scoreMultiplierTimer === 0) {
        this.player.scoreMultiplierValue = 1;
      }
    }
    if (this.player.magnetTimer > 0) {
      this.player.magnetTimer = Math.max(0, this.player.magnetTimer - dt);
      // Magnet pull: suck all nearby pickups within 300px toward player
      this.pickups.forEach((p) => {
        if (p.collected) return;
        const dx = this.player.x - p.x;
        const dy = this.player.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 320 && dist > 10) {
          const pull = (320 - dist) * 2.5 * dt;
          p.x += (dx / dist) * pull;
          p.y += (dy / dist) * pull;
        }
      });
    }
    if (this.player.capacitationTimer > 0) {
      this.player.capacitationTimer = Math.max(0, this.player.capacitationTimer - dt);
      // Capacitation: hyper-motile tail stroke + stamina regenerates automatically
      this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + 18 * dt);
      if (Math.random() < 0.3) {
        this.particles.push({
          x: this.player.x,
          y: this.player.y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          size: 3,
          color: '#a855f7',
          alpha: 0.9,
          decay: 0.05,
          type: 'spark',
        });
      }
    }

    // Shooter cooldown countdown
    if (this.player.shootCooldown > 0) {
      this.player.shootCooldown = Math.max(0, this.player.shootCooldown - dt);
    }

    // Handle Shoot Input
    if (this.input.shoot && this.player.shootCooldown === 0) {
      this.fireProjectile(true);
    }

    // Handle Fertilizing mode: anchored to the Egg surface and punching the egg to enter!
    if (this.state === 'fertilizing') {
      this.player.x = this.egg.x - this.egg.radius + 12;
      this.player.speed = 0;
      this.player.angle = 0;
      this.player.isPunching = true;
      this.player.punchPhase = (this.player.punchPhase || 0) + dt * 22; // Rapid toddler boxing cadence
      this.updateTail(this.player, dt, 0.4);

      // Auto gradual punching + player can mash button
      const acrosomeMult = UPGRADE_CONFIG.acrosome.multiplier[this.upgrades.acrosome - 1] || 1;
      const classId = this.customization.swimmerClass || 'balanced';
      const classDrillMult = SWIMMER_CLASSES[classId]?.drillMultiplier || 1.0;
      this.player.drillProgress = Math.min(100, this.player.drillProgress + 1.8 * acrosomeMult * classDrillMult * dt);

      // Occasional rhythmic baby punch thud sound and sparks while auto-punching
      if (Math.random() < 0.16) {
        sound.playEggPunch(false);
        this.particles.push({
          x: this.egg.x - this.egg.radius + 2,
          y: this.player.y + (Math.random() - 0.5) * 16,
          vx: -1 - Math.random() * 2,
          vy: (Math.random() - 0.5) * 3,
          size: 2.5 + Math.random() * 2.5,
          color: '#fef08a',
          alpha: 0.9,
          decay: 0.06,
          type: 'spark',
        });
      }

      this.checkEggCompletion();
      return;
    }

    // Steering logic
    let targetAngle = this.player.angle;
    const aeroMult = UPGRADE_CONFIG.aerodynamics.multiplier[this.upgrades.aerodynamics - 1] || 1;
    const turnRate = 4.2 * aeroMult * dt;

    if (this.input.pointerActive) {
      // Direct mouse/touch aim relative to screen center with camera zoom scaling
      const screenX = (this.player.x - this.cameraX) * this.zoom;
      const screenY = (this.player.y - this.cameraY) * this.zoom;
      const dx = this.input.pointerX - screenX;
      const dy = this.input.pointerY - screenY;
      if (Math.hypot(dx, dy) > 16) {
        targetAngle = Math.atan2(dy, dx);
      }
    } else {
      // Keyboard input (WASD / Arrows)
      let dirX = 0;
      let dirY = 0;
      if (this.input.right) dirX += 1;
      if (this.input.left) dirX -= 1;
      if (this.input.down) dirY += 1;
      if (this.input.up) dirY -= 1;

      if (dirX !== 0 || dirY !== 0) {
        targetAngle = Math.atan2(dirY, dirX);
      }
    }

    // Smooth angle interpolation
    let angleDiff = targetAngle - this.player.angle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    this.player.angle += angleDiff * turnRate;

    // Boosting and ATP management
    const wantBoost = this.input.boost;
    const hasAtp = this.player.stamina > 4;
    const isCapacitated = this.player.capacitationTimer > 0;
    const mitMult = UPGRADE_CONFIG.mitochondria.multiplier[this.upgrades.mitochondria - 1] || 1;

    // Mitochondrial Overcharge: When ATP is depleted, holding boost burns cellular vitality for emergency blazing propulsion
    const canOvercharge = wantBoost && !hasAtp && !isCapacitated && this.player.health > 16;
    if (canOvercharge) {
      this.player.overcharging = true;
      this.player.overchargeHeat = Math.min(1, (this.player.overchargeHeat || 0) + dt * 2.8);

      // Burns cell vitality at 8.5 HP/sec
      this.player.health = Math.max(15, this.player.health - 8.5 * dt);

      // Super boost acceleration beyond max speed (+35%)
      const overchargeSpeed = this.player.maxSpeed * 1.35;
      this.player.speed = Math.min(overchargeSpeed, this.player.speed + 20 * dt);

      sound.playOvercharge();

      // Flame exhaust particles
      this.particles.push({
        x: this.player.x - Math.cos(this.player.angle) * 14,
        y: this.player.y - Math.sin(this.player.angle) * 14,
        vx: -Math.cos(this.player.angle) * (4 + Math.random() * 5) + (Math.random() - 0.5) * 2,
        vy: -Math.sin(this.player.angle) * (4 + Math.random() * 5) + (Math.random() - 0.5) * 2,
        size: 4 + Math.random() * 5,
        color: Math.random() > 0.4 ? '#f97316' : '#ef4444',
        alpha: 0.95,
        decay: 0.07,
        type: 'overcharge_flame',
      });
    } else {
      this.player.overcharging = false;
      this.player.overchargeHeat = Math.max(0, (this.player.overchargeHeat || 0) - dt * 2.0);

      // Audible panting when player mashes boost with 0 ATP and can't overcharge
      if (wantBoost && !hasAtp && !isCapacitated) {
        if (!this.lastPantTime || Date.now() - this.lastPantTime > 700) {
          this.lastPantTime = Date.now();
          sound.playExhaustedPant();
        }
      }
    }

    if ((wantBoost && hasAtp) || isCapacitated) {
      this.player.boosting = true;
      if (!isCapacitated) {
        const drain = (24 / mitMult);
        this.player.atpConsumptionRate = drain;
        this.player.stamina = Math.max(0, this.player.stamina - drain * dt);
      } else {
        this.player.atpConsumptionRate = 0; // Infinite power while capacitated
      }

      // Boost acceleration
      const boostTarget = isCapacitated ? this.player.maxSpeed * 1.25 : this.player.maxSpeed;
      this.player.speed = Math.min(boostTarget, this.player.speed + 16 * dt);

      // Play sound and spawn wake bubbles
      if (Math.random() > 0.4) {
        sound.playBoost();
      }
      this.particles.push({
        x: this.player.x - Math.cos(this.player.angle) * 14,
        y: this.player.y - Math.sin(this.player.angle) * 14,
        vx: -Math.cos(this.player.angle) * (2 + Math.random() * 3) + (Math.random() - 0.5),
        vy: -Math.sin(this.player.angle) * (2 + Math.random() * 3) + (Math.random() - 0.5),
        size: 4 + Math.random() * 5,
        color: isCapacitated ? '#c084fc' : this.player.color,
        alpha: 0.85,
        decay: 0.04,
        type: 'bubble',
      });
    } else {
      this.player.boosting = false;
      this.player.atpConsumptionRate = 0;
      // Natural ATP regeneration
      this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + 8 * mitMult * dt);
    }

    // Dynamic running & swimming speed scaling based on current stamina level:
    // Full energy (100%): 100% base speed.
    // Moderate energy (50%): ~88% base speed.
    // Critical fatigue (<10%): 62% base speed (a weary, heavy toddler trudge).
    const staminaRatio = Math.max(0, Math.min(1, this.player.stamina / this.player.maxStamina));
    this.player.exhaustionLevel = 1 - staminaRatio;
    const fatigueSpeedMult = 0.62 + 0.38 * Math.pow(staminaRatio, 0.7);
    const dynamicBaseSpeed = this.player.baseSpeed * fatigueSpeedMult;

    if (!this.player.boosting) {
      if (this.player.speed > dynamicBaseSpeed) {
        this.player.speed = Math.max(dynamicBaseSpeed, this.player.speed - 6 * dt);
      } else if (this.player.speed < dynamicBaseSpeed) {
        this.player.speed = Math.min(dynamicBaseSpeed, this.player.speed + 8 * dt);
      }
    }

    // Apply Obstacle Speed Reduction Debuff
    if (this.player.slowTimer && this.player.slowTimer > 0) {
      this.player.slowTimer = Math.max(0, this.player.slowTimer - dt);
      const factor = this.player.slowFactor ?? 0.5;
      this.player.speed = Math.min(this.player.speed, this.player.maxSpeed * factor);
      if (this.player.slowTimer <= 0) {
        this.player.slowFactor = undefined;
        this.player.slowReason = undefined;
      } else if (Math.random() < 0.3) {
        this.particles.push({
          x: this.player.x - 10,
          y: this.player.y + (Math.random() - 0.5) * 10,
          vx: -(1 + Math.random() * 2),
          vy: (Math.random() - 0.5) * 1.5,
          size: 3 + Math.random() * 2,
          color: '#d97706',
          alpha: 0.85,
          decay: 0.05,
          type: 'slime_glob',
        });
      }
    }

    // Check Slipstream drafting behind nearby rivals
    this.checkSlipstream(this.player, dt);

    // Apply Velocity
    this.player.vx = Math.cos(this.player.angle) * this.player.speed;
    this.player.vy = Math.sin(this.player.angle) * this.player.speed;

    this.player.x += this.player.vx;
    this.player.y += this.player.vy;

    // Track bounds constraint
    if (this.player.y < 50) {
      this.player.y = 50;
      this.player.vy = Math.abs(this.player.vy) * 0.5;
    } else if (this.player.y > TRACK_WIDTH - 50) {
      this.player.y = TRACK_WIDTH - 50;
      this.player.vy = -Math.abs(this.player.vy) * 0.5;
    }

    // Minimum forward movement
    if (this.player.x < 30) this.player.x = 30;

    // Tail waving physics
    this.updateTail(this.player, dt, this.player.speed / this.player.baseSpeed);

    // Trigger Egg Arrival
    if (this.player.x >= this.egg.x - this.egg.radius && this.state === 'racing') {
      this.enterFertilizationMode();
    }
  }

  private updateRivals(dt: number) {
    this.rivals.forEach((rival) => {
      if (rival.finished) return;

      // When rival reaches the egg
      if (rival.x >= this.egg.x - this.egg.radius - 20) {
        rival.x = this.egg.x - this.egg.radius + Math.random() * 4;
        rival.speed = 0;
        rival.isPunching = true;
        rival.punchPhase = (rival.punchPhase || 0) + dt * (16 + Math.random() * 8);
        this.updateTail(rival, dt, 0.4);

        // If player hasn't reached the egg yet, this rival reached FIRST!
        if (this.state === 'racing' && this.player.x < this.egg.x - this.egg.radius - 20) {
          if (!this.egg.drillingWinner) {
            this.egg.drillingWinner = rival;
            rival.finished = true;
            this.player.health = 0;
            this.player.deathReason =
              'Another baby reached the ovum first and punched through! The cortical reaction hardened the Zona Pellucida and eliminated your runner.';

            // Spawn death / lysis particles around the player
            for (let i = 0; i < 35; i++) {
              const angle = Math.random() * Math.PI * 2;
              const spd = 2 + Math.random() * 6;
              this.particles.push({
                x: this.player.x,
                y: this.player.y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                size: 3 + Math.random() * 5,
                color: '#f43f5e',
                alpha: 1,
                decay: 0.025,
                type: 'debris',
              });
            }

            this.triggerCorticalReaction(false);
          }
          return;
        }

        // In Fertilizing mode, rival punches the membrane to enter
        rival.drillProgress = Math.min(100, rival.drillProgress + (1.2 + Math.random() * 0.9) * dt);

        if (Math.random() < 0.08) {
          this.particles.push({
            x: this.egg.x - this.egg.radius + 3,
            y: rival.y + (Math.random() - 0.5) * 14,
            vx: -1 - Math.random() * 2,
            vy: (Math.random() - 0.5) * 2,
            size: 2 + Math.random() * 2,
            color: '#fde047',
            alpha: 0.75,
            decay: 0.08,
            type: 'spark',
          });
        }

        this.checkEggCompletion();
        return;
      }

      // Rival AI navigation
      const personality = rival.aiPersonality || {
        aggression: 0.6,
        wiggleFreq: 2.0,
        driftTendency: 0,
        atpGreed: 0.5,
      };

      // 1. Seek nearest ATP crystal if stamina is low
      let desiredAngle = 0; // Forward
      let seekingPickup = false;

      if (rival.stamina < 50) {
        let closestDist = 200;
        let targetPickup: Pickup | null = null;
        for (const p of this.pickups) {
          if (!p.collected && p.x > rival.x && p.x < rival.x + 250) {
            const dist = Math.hypot(p.x - rival.x, p.y - rival.y);
            if (dist < closestDist) {
              closestDist = dist;
              targetPickup = p;
            }
          }
        }
        if (targetPickup) {
          desiredAngle = Math.atan2(targetPickup.y - rival.y, targetPickup.x - rival.x);
          seekingPickup = true;
        }
      }

      // 2. Avoid hazards (Macrophage, acid)
      for (const hazard of this.hazards) {
        const hDist = Math.hypot(hazard.x - rival.x, hazard.y - rival.y);
        if (hDist < hazard.radius + 60 && hazard.x > rival.x - 40) {
          // Steer away
          const awayAngle = Math.atan2(rival.y - hazard.y, rival.x - hazard.x);
          desiredAngle = awayAngle;
          break;
        }
      }

      if (!seekingPickup) {
        // Natural wandering around track center
        const centerBias = (TRACK_WIDTH / 2 - rival.y) * 0.001;
        desiredAngle += centerBias + personality.driftTendency;
      }

      // Smooth turn
      let diff = desiredAngle - rival.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      rival.angle += diff * 2.8 * dt;

      // Rivals have the exact same speed as player
      rival.baseSpeed = this.player.baseSpeed;
      rival.maxSpeed = this.player.maxSpeed;

      // Other sperms match player's current speed
      let rivalCurrentSpeed = this.player.speed;

      // Synchronize boosting and stamina state with player
      rival.boosting = this.player.boosting;
      if (this.player.boosting) {
        rival.atpConsumptionRate = 25;
        rival.stamina = Math.max(0, rival.stamina - 20 * dt);
      } else {
        rival.atpConsumptionRate = 0;
        rival.stamina = Math.min(rival.maxStamina, rival.stamina + 8 * dt);
      }

      // Apply Obstacle Speed Reduction Debuff to Rivals
      if (rival.slowTimer && rival.slowTimer > 0) {
        rival.slowTimer = Math.max(0, rival.slowTimer - dt);
        const factor = rival.slowFactor ?? 0.5;
        rivalCurrentSpeed = rivalCurrentSpeed * factor;
        if (rival.slowTimer <= 0) {
          rival.slowFactor = undefined;
          rival.slowReason = undefined;
        }
      }

      rival.speed = rivalCurrentSpeed;

      rival.x += Math.cos(rival.angle) * rival.speed;
      rival.y += Math.sin(rival.angle) * rival.speed;

      // Vertical bounds
      rival.y = Math.max(70, Math.min(TRACK_WIDTH - 70, rival.y));

      // Tail physics
      this.updateTail(rival, dt, rival.speed / rival.baseSpeed);
    });
  }

  private checkSlipstream(swimmer: Swimmer, dt: number) {
    let foundLeader: Swimmer | null = null;
    const candidates = swimmer.isPlayer
      ? this.rivals
      : [this.player, ...this.rivals.filter((r) => r.id !== swimmer.id)];

    for (const other of candidates) {
      if (other.finished || other.health <= 0) continue;
      const dx = other.x - swimmer.x;
      const dy = other.y - swimmer.y;
      // Hydrodynamic drafting pocket: directly behind (dx between 22 and 130, |dy| < 22)
      if (dx > 22 && dx < 130 && Math.abs(dy) < 22) {
        foundLeader = other;
        break;
      }
    }

    if (foundLeader) {
      swimmer.drafting = true;
      swimmer.draftLeaderName = foundLeader.name;
      const aeroMult = UPGRADE_CONFIG.aerodynamics.multiplier[this.upgrades.aerodynamics - 1] || 1;
      
      // Aerodynamic suction boost (+15% to +25% depending on aerodynamics upgrade)
      swimmer.speed = Math.min(swimmer.maxSpeed + 2.0, swimmer.speed + 5.5 * aeroMult * dt);
      
      // ATP conservation bonus while drafting
      swimmer.stamina = Math.min(swimmer.maxStamina, swimmer.stamina + 3.0 * dt);

      if (swimmer.isPlayer) {
        sound.playDrafting();
        if (Math.random() < 0.4) {
          this.particles.push({
            x: foundLeader.x - 14,
            y: foundLeader.y + (Math.random() - 0.5) * 8,
            vx: -(swimmer.speed * 0.35),
            vy: (Math.random() - 0.5) * 1.5,
            size: 2.5,
            color: '#38bdf8',
            alpha: 0.85,
            decay: 0.05,
            type: 'cilia_streak',
          });
        }
      }
    } else {
      swimmer.drafting = false;
      swimmer.draftLeaderName = undefined;
    }
  }

  /**
   * Interactive Swarm & Crowd Collision Physics:
   * Handles elastic repulsion, body nudging, and momentary slowdowns
   * when racers jostle for position in the high-density crowd.
   */
  private updateSwimmerCrowdCollisions(dt: number) {
    if (this.state !== 'racing' && this.state !== 'fertilizing') return;

    // Cooldown countdowns
    if ((this.player.bumpCooldown ?? 0) > 0) {
      this.player.bumpCooldown = Math.max(0, (this.player.bumpCooldown ?? 0) - dt);
    }
    if ((this.player.stumbleTimer ?? 0) > 0) {
      this.player.stumbleTimer = Math.max(0, (this.player.stumbleTimer ?? 0) - dt);
    }

    this.rivals.forEach((r) => {
      if ((r.bumpCooldown ?? 0) > 0) {
        r.bumpCooldown = Math.max(0, (r.bumpCooldown ?? 0) - dt);
      }
      if ((r.stumbleTimer ?? 0) > 0) {
        r.stumbleTimer = Math.max(0, (r.stumbleTimer ?? 0) - dt);
      }
    });

    const activeSwimmers: Swimmer[] = [
      this.player,
      ...this.rivals.filter((r) => !r.finished && r.health > 0),
    ];

    const resMult = UPGRADE_CONFIG.resistance.multiplier[this.upgrades.resistance - 1] || 1;

    for (let i = 0; i < activeSwimmers.length; i++) {
      const a = activeSwimmers[i];
      for (let j = i + 1; j < activeSwimmers.length; j++) {
        const b = activeSwimmers[j];

        const dx = b.x - a.x;
        if (Math.abs(dx) > 32) continue;
        const dy = b.y - a.y;
        if (Math.abs(dy) > 26) continue;

        const dist = Math.hypot(dx, dy);
        const minDist = 24; // Swimmer head/shoulder collision radius

        if (dist < minDist && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;

          // Resistance upgrade reduces displacement on the player
          const weightA = a.isPlayer ? 0.32 / resMult : 0.5;
          const weightB = b.isPlayer ? 0.32 / resMult : 0.5;

          a.x -= nx * overlap * weightA;
          a.y -= ny * overlap * weightA;
          b.x += nx * overlap * weightB;
          b.y += ny * overlap * weightB;

          // Bump reaction & momentary jostle slowdown
          const canBumpA = (a.bumpCooldown ?? 0) <= 0;
          const canBumpB = (b.bumpCooldown ?? 0) <= 0;

          if (canBumpA || canBumpB) {
            a.bumpCooldown = 0.35;
            b.bumpCooldown = 0.35;
            a.stumbleTimer = 0.22;
            b.stumbleTimer = 0.22;

            // Resistance reduces momentary crowd slowdown
            const playerSlowFactor = Math.min(0.92, 0.82 + 0.04 * resMult);
            a.speed = Math.max(1.8, a.speed * (a.isPlayer ? playerSlowFactor : 0.82));
            b.speed = Math.max(1.8, b.speed * (b.isPlayer ? playerSlowFactor : 0.82));

            // Nudge lateral velocities slightly apart
            a.y -= ny * 2.0;
            b.y += ny * 2.0;

            if (a.isPlayer || b.isPlayer) {
              sound.playBump(true);
              this.cameraY += (Math.random() - 0.5) * 4;

              const midX = (a.x + b.x) / 2;
              const midY = (a.y + b.y) / 2;
              const bumpWords = ['BUMP!', 'BONK!', 'OUCH!', 'PARDON!'];
              const bword = bumpWords[Math.floor(Math.random() * bumpWords.length)];

              this.particles.push({
                x: midX,
                y: midY - 6,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -1.6 - Math.random() * 1.5,
                size: 11,
                color: '#facc15',
                alpha: 1,
                decay: 0.055,
                type: 'punch_pow',
                text: bword,
              });

              for (let k = 0; k < 4; k++) {
                this.particles.push({
                  x: midX,
                  y: midY,
                  vx: (Math.random() - 0.5) * 3.5,
                  vy: (Math.random() - 0.5) * 3.5,
                  size: 2.8 + Math.random() * 2,
                  color: '#fef08a',
                  alpha: 1,
                  decay: 0.07,
                  type: 'bump_star',
                });
              }
            } else if (Math.abs(a.x - this.player.x) < 400 && Math.random() < 0.2) {
              sound.playBump(false);
            }
          }
        }
      }
    }
  }

  private calculateProceduralGait(swimmer: Swimmer, dt: number): ProceduralGait {
    const staminaRatio = Math.max(0, Math.min(1, swimmer.stamina / swimmer.maxStamina));
    const isBoosting = swimmer.boosting && (swimmer.stamina > 2 || (swimmer.capacitationTimer || 0) > 0);
    const isCapacitated = (swimmer.capacitationTimer || 0) > 0;
    const speedRatio = Math.max(0.2, swimmer.speed / Math.max(1, swimmer.baseSpeed));

    // Determine gait archetype based on stamina & ATP consumption
    let gaitType: BabyGaitType = 'jog';
    if (isBoosting || isCapacitated) {
      gaitType = 'sprint';
    } else if (staminaRatio > 0.55) {
      gaitType = 'jog';
    } else if (staminaRatio > 0.20) {
      gaitType = 'fatigued';
    } else {
      gaitType = 'exhausted';
    }

    // 1. Dynamic Cadence (step & tail frequency in rad/s)
    let baseCadence = 15;
    if (gaitType === 'sprint') {
      baseCadence = isCapacitated ? 28 : 24;
    } else if (gaitType === 'jog') {
      baseCadence = 14 + (staminaRatio - 0.55) * 6; // 14 to 16.7
    } else if (gaitType === 'fatigued') {
      baseCadence = 9.5 + (staminaRatio - 0.20) * 12; // 9.5 to 13.7
    } else {
      // Exhausted shuffle: slow, heavy steps (6.8 to 9.0 rad/s)
      baseCadence = 6.8 + staminaRatio * 11;
    }
    const cadence = baseCadence * Math.max(0.6, Math.min(1.4, speedRatio * 0.9));

    // 2. Stride Angular Amplitude, Knee Lift, Heel Kick, Torso Lean, Waddle Roll, Arm Swing, Shoulder Drop, Head Tilt, Eye Droop
    let strideAmplitude = 0.85;
    let kneeLift = 0.45;
    let heelKick = 0.65;
    let torsoLean = -0.06; // forward lean in radians
    let waddleRoll = 0;
    let armSwingTorque = 0.75;
    let shoulderDrop = 0;
    let headTilt = 0;
    let eyeDroop = 0;

    if (gaitType === 'sprint') {
      strideAmplitude = 1.25; // wide, explosive forward reach
      kneeLift = 0.75;        // high driving knee
      heelKick = 1.15;        // high back flick of the sneaker
      torsoLean = -0.22;      // aggressive forward sprinter lean (-13 deg)
      armSwingTorque = 1.15;  // intense chest-height arm pumping
      shoulderDrop = 0;
      headTilt = -0.05;       // chin up, locked forward
      eyeDroop = 0;
    } else if (gaitType === 'jog') {
      strideAmplitude = 0.85;
      kneeLift = 0.45;
      heelKick = 0.65;
      torsoLean = -0.07;
      armSwingTorque = 0.75;
      shoulderDrop = 0;
      headTilt = 0;
      eyeDroop = 0;
    } else if (gaitType === 'fatigued') {
      const f = (0.55 - staminaRatio) / 0.35; // 0 to 1 in fatigued band
      strideAmplitude = 0.85 - f * 0.28;
      kneeLift = 0.45 - f * 0.22;
      heelKick = 0.65 - f * 0.32;
      torsoLean = -0.07 + f * 0.12;
      armSwingTorque = 0.75 - f * 0.35;
      shoulderDrop = f * 1.5;
      headTilt = f * 0.12;
      eyeDroop = f * 0.45;
      waddleRoll = Math.sin(swimmer.tailWigglePhase * 0.5) * (f * 0.08);
    } else {
      // Exhausted state (< 20% stamina): Heavy toddler waddle & shuffle
      const e = (0.20 - staminaRatio) / 0.20; // 0 to 1 in exhausted band
      strideAmplitude = 0.55 - e * 0.22;
      kneeLift = 0.22 - e * 0.12;
      heelKick = 0.32 - e * 0.18;
      torsoLean = 0.05 + e * 0.10;
      armSwingTorque = 0.38 - e * 0.20;
      shoulderDrop = 1.5 + e * 1.8;
      headTilt = 0.12 + e * 0.14;
      eyeDroop = 0.5 + e * 0.4;
      waddleRoll = Math.sin(swimmer.tailWigglePhase * 0.5) * (0.12 + e * 0.10);
    }

    const headBobY = Math.sin(swimmer.tailWigglePhase * 2) * (gaitType === 'exhausted' ? 2.5 : 1.4);
    const headBobX = Math.cos(swimmer.tailWigglePhase) * (gaitType === 'sprint' ? 1.5 : 0.6);

    const prevPuffTimer = swimmer.gait?.breathPuffTimer || 0;
    const breathPuffTimer = (prevPuffTimer + dt) % 1.2;

    return {
      gaitType,
      cadence,
      strideAmplitude,
      kneeLift,
      heelKick,
      torsoLean,
      waddleRoll,
      armSwingTorque,
      shoulderDrop,
      headBobOffset: { x: headBobX, y: headBobY },
      headTilt,
      eyeDroop,
      breathPuffTimer,
      atpDrainRate: swimmer.atpConsumptionRate || 0,
    };
  }

  private updateTail(swimmer: Swimmer, dt: number, speedRatio: number) {
    // Procedural Gait Calculation based on dynamic stamina & ATP consumption
    const gait = this.calculateProceduralGait(swimmer, dt);
    swimmer.gait = gait;
    swimmer.tailWigglePhase += dt * gait.cadence;

    // Periodically spawn tired panting breath puff if fatigued or exhausted
    if (gait.gaitType === 'exhausted' || gait.gaitType === 'fatigued') {
      if (Math.random() < (gait.gaitType === 'exhausted' ? 0.09 : 0.03)) {
        this.particles.push({
          x: swimmer.x + Math.cos(swimmer.angle) * 14,
          y: swimmer.y + Math.sin(swimmer.angle) * 14 + (Math.random() - 0.5) * 6,
          vx: -Math.cos(swimmer.angle) * 1.6 + (Math.random() - 0.5) * 0.8,
          vy: -Math.sin(swimmer.angle) * 1.6 - 1.2,
          size: gait.gaitType === 'exhausted' ? 3.5 : 2.4,
          color: '#e0f2fe',
          alpha: 0.75,
          decay: 0.04,
          type: 'bubble',
        });
      }
    }

    const headX = swimmer.x;
    const headY = swimmer.y;

    // Flagellum wave dynamic wavelength and amplitude
    const waveAmpScale = gait.gaitType === 'sprint' ? 1.3 : (gait.gaitType === 'exhausted' ? 0.6 : 1.0);
    const waveFreqScale = gait.gaitType === 'sprint' ? 0.6 : (gait.gaitType === 'exhausted' ? 0.35 : 0.48);

    // Follow nodes behind baby's kicking running feet with inverse lag + wave undulation
    let prevX = headX - Math.cos(swimmer.angle) * 22;
    let prevY = headY - Math.sin(swimmer.angle) * 22;

    for (let i = 0; i < swimmer.tailNodes.length; i++) {
      const node = swimmer.tailNodes[i];
      const segmentDist = 5.2;

      // Sine wave amplitude increases toward tail tip, modulated by procedural gait waveAmpScale
      const waveOffset = Math.sin(swimmer.tailWigglePhase - i * waveFreqScale) * ((2 + i * 0.65) * waveAmpScale);
      const normalAngle = swimmer.angle + Math.PI / 2;

      const targetX = prevX - Math.cos(swimmer.angle) * segmentDist + Math.cos(normalAngle) * waveOffset * 0.15;
      const targetY = prevY - Math.sin(swimmer.angle) * segmentDist + Math.sin(normalAngle) * waveOffset * 0.15;

      node.x += (targetX - node.x) * 0.55;
      node.y += (targetY - node.y) * 0.55;

      prevX = node.x;
      prevY = node.y;
    }
  }

  private updateHazards(dt: number) {
    const isStealth = this.player.swimmerClass === 'stealth';

    this.hazards.forEach((h) => {
      h.pulsePhase += dt * 3;

      // Macrophages patrol up and down
      if (h.type === 'macrophage') {
        if (h.vy && h.startY && h.patrolRange) {
          h.y += h.vy;
          if (Math.abs(h.y - h.startY) > h.patrolRange) {
            h.vy = -h.vy;
          }
        }

        // Stealth class reduces detection radius by 50%
        const detectionRadius = isStealth ? h.radius * 0.75 : h.radius + 15;
        const pDist = Math.hypot(h.x - this.player.x, h.y - this.player.y);
        if (pDist < detectionRadius) {
          this.handleHazardCollision(this.player, h);
        }

        // Macrophage alerts audio if close
        const alertRange = isStealth ? h.radius + 60 : h.radius + 130;
        if (pDist < alertRange && Math.random() < 0.05) {
          sound.playMacrophageAlert();
          this.stats.macrophagesEvaded++;
        }
      } else {
        // Static Acid, Spermicide, Mucus, Crosscurrent, Antibody cloud
        const pDist = Math.hypot(h.x - this.player.x, h.y - this.player.y);
        if (pDist < h.radius + 12) {
          this.handleHazardCollision(this.player, h);
        }
      }
    });
  }

  private handleHazardCollision(swimmer: Swimmer, hazard: Hazard) {
    if (swimmer.shieldTimer > 0) return; // Protected by alkaline shield

    const resMult = UPGRADE_CONFIG.resistance.multiplier[this.upgrades.resistance - 1] || 1;
    const isTank = swimmer.swimmerClass === 'tank';
    const tankDamageMult = isTank ? 0.65 : 1.0;

    if (hazard.type === 'acid') {
      // Acid damages health and drains ATP
      const damage = (18 / resMult) * tankDamageMult;
      swimmer.health = Math.max(0, swimmer.health - damage * 0.05);
      swimmer.stamina = Math.max(0, swimmer.stamina - 20 * 0.05);
      swimmer.speed = Math.max(1.8, swimmer.speed * 0.96);

      if (Math.random() < 0.1) {
        sound.playHazardHit();
      }

      // Acid sizzle particles
      this.particles.push({
        x: swimmer.x,
        y: swimmer.y,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        size: 3 + Math.random() * 3,
        color: '#f43f5e',
        alpha: 0.9,
        decay: 0.06,
        type: 'debris',
      });

      if (swimmer.health <= 0) {
        swimmer.deathReason = 'Acidified in the vaginal gauntlet pH.';
      }
    } else if (hazard.type === 'spermicide') {
      // Nonoxynol-9 spermicidal lipid disruptor: highly toxic chemical membrane rupture
      const damage = (38 / resMult) * tankDamageMult;
      swimmer.health = Math.max(0, swimmer.health - damage * 0.08);
      swimmer.speed = Math.max(1.0, swimmer.speed * 0.88);
      if (Math.random() < 0.12) {
        sound.playHazardHit();
      }
      this.particles.push({
        x: swimmer.x,
        y: swimmer.y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        size: 4 + Math.random() * 4,
        color: '#fb7185',
        alpha: 0.95,
        decay: 0.07,
        type: 'debris',
      });
      if (swimmer.health <= 0) {
        swimmer.deathReason = 'Membrane ruptured by contraceptive spermicide (Nonoxynol-9).';
      }
    } else if (hazard.type === 'mucus') {
      // Viscous mucus obstacle: strongly reduces speed (-50% to -65%) and creates drag
      const mucusDrag = swimmer.swimmerClass === 'stealth' ? 0.65 : 0.45;
      swimmer.speed = Math.max(1.0, swimmer.speed * mucusDrag);
      swimmer.stamina = Math.max(0, swimmer.stamina - 16 * 0.05);
      swimmer.slowTimer = 1.8;
      swimmer.slowFactor = 0.50;
      swimmer.slowReason = 'MUCUS DRAG';
      if (swimmer.isPlayer && (!swimmer.bumpCooldown || swimmer.bumpCooldown <= 0)) {
        sound.playStickySlow();
        swimmer.bumpCooldown = 0.55;
        this.cameraShake = Math.max(this.cameraShake, 3.0);
        this.particles.push({
          x: swimmer.x,
          y: swimmer.y - 20,
          vx: 0,
          vy: -1.5,
          size: 13,
          color: '#10b981',
          alpha: 1,
          decay: 0.035,
          type: 'punch_pow',
          text: 'MUCUS DRAG!',
        });
      }
      if (Math.random() < 0.4) {
        this.particles.push({
          x: swimmer.x + (Math.random() - 0.5) * 12,
          y: swimmer.y + (Math.random() - 0.5) * 12,
          vx: -(1 + Math.random() * 2),
          vy: (Math.random() - 0.5) * 2,
          size: 3 + Math.random() * 3,
          color: '#34d399',
          alpha: 0.85,
          decay: 0.05,
          type: 'slime_glob',
        });
      }
    } else if (hazard.type === 'cilia_vortex') {
      // Swirling cilia pushes in wave direction
      swimmer.y += Math.sin(hazard.pulsePhase) * 3;
      swimmer.speed = Math.min(swimmer.maxSpeed + 2, swimmer.speed + 0.1);
    } else if (hazard.type === 'crosscurrent') {
      // Powerful transverse biological fluid jet that pushes swimmer off course
      const dir = hazard.direction || 1;
      swimmer.y += dir * 4.8;
      swimmer.speed = Math.max(2.0, swimmer.speed * 0.97);
      if (Math.random() < 0.08) {
        sound.playHazardHit();
      }
      this.particles.push({
        x: swimmer.x,
        y: swimmer.y,
        vx: -1,
        vy: dir * 3,
        size: 3,
        color: '#38bdf8',
        alpha: 0.7,
        decay: 0.06,
        type: 'bubble',
      });
    } else if (hazard.type === 'antibody_cloud') {
      // Anti-sperm antibody agglutination web: binds flagellum and immobilizes
      swimmer.speed = Math.max(1.0, swimmer.speed * 0.85);
      swimmer.stamina = Math.max(0, swimmer.stamina - 25 * 0.05);
      if (Math.random() < 0.1) {
        sound.playHazardHit();
      }
      this.particles.push({
        x: swimmer.x,
        y: swimmer.y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: 3 + Math.random() * 3,
        color: '#e879f9',
        alpha: 0.8,
        decay: 0.05,
        type: 'debris',
      });
      if (swimmer.stamina <= 0 && swimmer.speed <= 1.1) {
        swimmer.health = Math.max(0, swimmer.health - 0.5);
        if (swimmer.health <= 0) {
          swimmer.deathReason = 'Agglutinated & immobilized by anti-sperm antibodies.';
        }
      }
    } else if (hazard.type === 'macrophage') {
      // Devoured by white blood cell!
      const damage = (40 / resMult) * tankDamageMult;
      swimmer.health = Math.max(0, swimmer.health - damage * 0.08);
      swimmer.speed = Math.max(1.2, swimmer.speed * 0.88);

      if (Math.random() < 0.15) {
        sound.playHazardHit();
      }

      if (swimmer.health <= 0) {
        swimmer.deathReason = 'Engulfed & digested by a patrolling uterine macrophage.';
      }
    } else if (hazard.type === 'cilia_conveyor') {
      // Fallopian Cilia Conveyor Stream: Accelerates swimmer forward (+30% speed) and regenerates ATP!
      swimmer.speed = Math.min(swimmer.maxSpeed * 1.35, swimmer.speed + 14 * 0.05);
      swimmer.stamina = Math.min(swimmer.maxStamina, swimmer.stamina + 12 * 0.05);
      if (swimmer.isPlayer && Math.random() < 0.12) {
        sound.playCiliaBoost();
      }
      if (Math.random() < 0.35) {
        this.particles.push({
          x: swimmer.x - 10,
          y: swimmer.y + (Math.random() - 0.5) * 12,
          vx: -(swimmer.speed * 0.4),
          vy: (Math.random() - 0.5) * 1.5,
          size: 2.5,
          color: '#22d3ee',
          alpha: 0.85,
          decay: 0.05,
          type: 'cilia_streak',
        });
      }
    } else if (hazard.type === 'collagen_mesh') {
      // Dense Collagen / Fibrin Mesh Obstacle: Snags and slows swimmer by -55%
      swimmer.speed = Math.max(1.0, swimmer.speed * 0.40);
      swimmer.slowTimer = 1.8;
      swimmer.slowFactor = 0.45;
      swimmer.slowReason = 'COLLAGEN MESH';
      if (swimmer.isPlayer && (!swimmer.bumpCooldown || swimmer.bumpCooldown <= 0)) {
        sound.playWebEntangle();
        swimmer.bumpCooldown = 0.6;
        this.cameraShake = Math.max(this.cameraShake, 3.5);
        this.particles.push({
          x: swimmer.x,
          y: swimmer.y - 20,
          vx: 0,
          vy: -1.5,
          size: 14,
          color: '#fbbf24',
          alpha: 1,
          decay: 0.035,
          type: 'punch_pow',
          text: 'SNAGGED!',
        });
      }
      // Snapping mesh strands
      if (Math.random() < 0.4) {
        this.particles.push({
          x: swimmer.x + (Math.random() - 0.5) * 14,
          y: swimmer.y + (Math.random() - 0.5) * 14,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: 4 + Math.random() * 3,
          color: '#fbbf24',
          alpha: 0.9,
          decay: 0.05,
          type: 'mesh_strand',
        });
      }
    } else if (hazard.type === 'bio_tar') {
      // Hyper-viscous Bio-Tar Sludge: Drastically reduces speed (-75%) and drains stamina
      swimmer.speed = Math.max(0.8, swimmer.speed * 0.25);
      swimmer.stamina = Math.max(0, swimmer.stamina - 15 * 0.05);
      swimmer.slowTimer = 2.2;
      swimmer.slowFactor = 0.35;
      swimmer.slowReason = 'BIO-TAR';
      if (swimmer.isPlayer && (!swimmer.bumpCooldown || swimmer.bumpCooldown <= 0)) {
        sound.playStickySlow();
        swimmer.bumpCooldown = 0.7;
        this.cameraShake = Math.max(this.cameraShake, 4.0);
        this.particles.push({
          x: swimmer.x,
          y: swimmer.y - 22,
          vx: 0,
          vy: -1.5,
          size: 14,
          color: '#d97706',
          alpha: 1,
          decay: 0.035,
          type: 'punch_pow',
          text: 'SLUDGED!',
        });
      }
      // Sticky tar droplets
      if (Math.random() < 0.45) {
        this.particles.push({
          x: swimmer.x + (Math.random() - 0.5) * 12,
          y: swimmer.y + (Math.random() - 0.5) * 12,
          vx: -(1 + Math.random()),
          vy: (Math.random() - 0.5) * 2,
          size: 3.5 + Math.random() * 3,
          color: '#78350f',
          alpha: 0.85,
          decay: 0.04,
          type: 'slime_glob',
        });
      }
    } else if (hazard.type === 'neutrophil_net') {
      // Neutrophil Extracellular Trap (NET): Sticky electrostatic DNA/protein webbing (-65% speed)
      swimmer.speed = Math.max(0.6, swimmer.speed * 0.20);
      swimmer.stamina = Math.max(0, swimmer.stamina - 18 * 0.05);
      swimmer.slowTimer = 2.5;
      swimmer.slowFactor = 0.30;
      swimmer.slowReason = 'NET TRAP';
      if (swimmer.isPlayer && (!swimmer.bumpCooldown || swimmer.bumpCooldown <= 0)) {
        sound.playWebEntangle();
        swimmer.bumpCooldown = 0.8;
        this.cameraShake = Math.max(this.cameraShake, 5.0);
        this.particles.push({
          x: swimmer.x,
          y: swimmer.y - 24,
          vx: 0,
          vy: -1.5,
          size: 14,
          color: '#c084fc',
          alpha: 1,
          decay: 0.035,
          type: 'punch_pow',
          text: 'NET TRAP!',
        });
      }
      // Glowing chromatin particles
      if (Math.random() < 0.4) {
        this.particles.push({
          x: swimmer.x + (Math.random() - 0.5) * 16,
          y: swimmer.y + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 2.5,
          vy: (Math.random() - 0.5) * 2.5,
          size: 3 + Math.random() * 3,
          color: '#e879f9',
          alpha: 0.9,
          decay: 0.04,
          type: 'dna',
        });
      }
    }
  }

  private updatePickups() {
    this.pickups.forEach((p) => {
      if (p.collected) return;
      p.bobPhase += 0.06;

      // Check player collection
      const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
      if (dist < p.radius + 18) {
        p.collected = true;
        this.collectPickup(this.player, p);
      }
    });
  }

  private collectPickup(swimmer: Swimmer, p: Pickup) {
    const mult = swimmer.scoreMultiplierValue || 1;

    if (p.type === 'atp') {
      swimmer.stamina = Math.min(swimmer.maxStamina, swimmer.stamina + p.value);
      this.stats.atpCollected += 1 * mult;
      sound.playPickupAtp();

      // Golden sparkle burst
      for (let i = 0; i < 10; i++) {
        this.particles.push({
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          size: 3 + Math.random() * 4,
          color: '#fbbf24',
          alpha: 1,
          decay: 0.04,
          type: 'spark',
        });
      }
    } else if (p.type === 'shield') {
      swimmer.shieldTimer = 8.0; // 8 seconds immunity
      swimmer.health = Math.min(swimmer.maxHealth, swimmer.health + 30);
      sound.playShieldPickup();

      // Pearlescent ring burst
      for (let i = 0; i < 14; i++) {
        this.particles.push({
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * 7,
          vy: (Math.random() - 0.5) * 7,
          size: 4 + Math.random() * 3,
          color: '#38bdf8',
          alpha: 1,
          decay: 0.03,
          type: 'bubble',
        });
      }
    } else if (p.type === 'turbo') {
      swimmer.speed = swimmer.maxSpeed * 1.35;
      swimmer.stamina = swimmer.maxStamina;
      sound.playBoost();
    } else if (p.type === 'multiplier') {
      // 2x/3x DNA score multiplier
      swimmer.scoreMultiplierTimer = 10.0;
      swimmer.scoreMultiplierValue = 2;
      sound.playMultiplierPickup();

      for (let i = 0; i < 15; i++) {
        this.particles.push({
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          size: 4 + Math.random() * 3,
          color: '#facc15',
          alpha: 1,
          decay: 0.035,
          type: 'dna',
        });
      }
    } else if (p.type === 'magnet') {
      // ATP Magnet pull
      swimmer.magnetTimer = 9.0;
      sound.playMagnetPickup();

      for (let i = 0; i < 12; i++) {
        this.particles.push({
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5,
          size: 3 + Math.random() * 3,
          color: '#22d3ee',
          alpha: 1,
          decay: 0.04,
          type: 'spark',
        });
      }
    } else if (p.type === 'capacitation') {
      // Capacitation: hyper-motile rush
      swimmer.capacitationTimer = 7.0;
      swimmer.stamina = swimmer.maxStamina;
      sound.playCapacitation();

      for (let i = 0; i < 16; i++) {
        this.particles.push({
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          size: 4 + Math.random() * 4,
          color: '#c084fc',
          alpha: 1,
          decay: 0.03,
          type: 'bubble',
        });
      }
    } else if (p.type === 'enzyme_burst') {
      // Extra acrosome enzymes + health restore + replenish enzyme darts!
      swimmer.drillProgress = Math.min(100, swimmer.drillProgress + 15);
      swimmer.health = Math.min(swimmer.maxHealth, swimmer.health + 20);
      swimmer.enzymeDarts = Math.min(swimmer.maxEnzymeDarts, swimmer.enzymeDarts + 10);
      sound.playEggDrill();

      for (let i = 0; i < 12; i++) {
        this.particles.push({
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5,
          size: 3 + Math.random() * 3,
          color: '#f43f5e',
          alpha: 1,
          decay: 0.04,
          type: 'enzyme',
        });
      }
    }
  }

  // --- PROJECTILES & SHOOTER COMBAT SYSTEM ---
  private updateProjectiles(dt: number) {
    for (let pIdx = this.projectiles.length - 1; pIdx >= 0; pIdx--) {
      const proj = this.projectiles[pIdx];
      proj.x += proj.vx;
      proj.y += proj.vy;
      proj.life -= dt;

      // Spawn subtle projectile trail
      if (Math.random() < 0.6) {
        this.particles.push({
          x: proj.x,
          y: proj.y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: 2.5 + Math.random() * 2,
          color: proj.glowColor,
          alpha: 0.8,
          decay: 0.08,
          type: 'enzyme',
        });
      }

      // Check boundary bounds or lifetime expiry
      if (
        proj.life <= 0 ||
        proj.y < 20 ||
        proj.y > TRACK_WIDTH - 20 ||
        proj.x > this.cameraX + this.visibleWidth + 400 ||
        proj.x < this.cameraX - 300
      ) {
        this.projectiles.splice(pIdx, 1);
        continue;
      }

      let destroyed = false;

      // 1. Collision with Hazards (Acid, Spermicide, Mucus, Macrophage, Cilia Vortex, Antibodies)
      for (let hIdx = this.hazards.length - 1; hIdx >= 0; hIdx--) {
        const h = this.hazards[hIdx];
        const dist = Math.hypot(proj.x - h.x, proj.y - h.y);

        if (dist < h.radius + proj.radius + 4) {
          destroyed = true;
          const hp = h.health !== undefined ? h.health : 50;
          const remainingHp = hp - proj.damage;
          h.health = remainingHp;

          // Impact sparks
          for (let i = 0; i < 8; i++) {
            this.particles.push({
              x: proj.x,
              y: proj.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              size: 3 + Math.random() * 4,
              color: '#fb7185',
              alpha: 1,
              decay: 0.05,
              type: 'enzyme',
            });
          }

          if (remainingHp <= 0) {
            // Hazard completely destroyed!
            sound.playObstacleDestroyed();
            this.stats.obstaclesDestroyed += 1;
            this.stats.dnaPointsEarned += h.type === 'macrophage' ? 75 : 30;

            // Big explosion particles for macrophage or chemical hazard
            const burstColor = h.type === 'macrophage'
              ? '#a855f7'
              : (h.type === 'acid'
                ? '#f43f5e'
                : (h.type === 'collagen_mesh'
                  ? '#fbbf24'
                  : (h.type === 'bio_tar'
                    ? '#d97706'
                    : (h.type === 'neutrophil_net'
                      ? '#c084fc'
                      : '#38bdf8'))));
            for (let i = 0; i < 24; i++) {
              this.particles.push({
                x: h.x,
                y: h.y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                size: 4 + Math.random() * 6,
                color: burstColor,
                alpha: 1,
                decay: 0.03,
                type: 'spark',
              });
            }

            // Chance to drop bonus ATP crystal when macrophage or large obstacle destroyed
            if (h.type === 'macrophage' || Math.random() < 0.45) {
              this.pickups.push({
                id: `drop_${Date.now()}_${Math.random()}`,
                x: h.x,
                y: h.y,
                type: 'atp',
                radius: 14,
                value: 40,
                bobPhase: Math.random() * Math.PI * 2,
              });
            }

            this.hazards.splice(hIdx, 1);
          } else {
            // Partial hit sound
            sound.playHazardHit();
          }

          break;
        }
      }

      if (destroyed) {
        this.projectiles.splice(pIdx, 1);
        continue;
      }

      // 2. Collision with Rival Sperms
      if (proj.isPlayer) {
        for (let rIdx = this.rivals.length - 1; rIdx >= 0; rIdx--) {
          const rival = this.rivals[rIdx];
          if (rival.finished) continue;

          const dist = Math.hypot(proj.x - rival.x, proj.y - rival.y);
          if (dist < 18 + proj.radius) {
            destroyed = true;
            rival.health = Math.max(0, rival.health - proj.damage);
            rival.speed = Math.max(1.0, rival.speed * 0.7); // Stun / slow rival

            // Impact particles
            for (let i = 0; i < 10; i++) {
              this.particles.push({
                x: rival.x,
                y: rival.y,
                vx: (Math.random() - 0.5) * 7,
                vy: (Math.random() - 0.5) * 7,
                size: 3 + Math.random() * 4,
                color: '#f43f5e',
                alpha: 1,
                decay: 0.05,
                type: 'spark',
              });
            }

            if (rival.health <= 0) {
              // Rival eliminated!
              sound.playObstacleDestroyed();
              this.stats.spermsEliminated += 1;
              this.stats.dnaPointsEarned += 50;

              // Dramatic disintegration of rival
              for (let i = 0; i < 28; i++) {
                this.particles.push({
                  x: rival.x,
                  y: rival.y,
                  vx: (Math.random() - 0.5) * 9,
                  vy: (Math.random() - 0.5) * 9,
                  size: 3 + Math.random() * 5,
                  color: rival.color,
                  alpha: 1,
                  decay: 0.03,
                  type: 'bubble',
                });
              }

              // Drop bonus ATP upon elimination
              this.pickups.push({
                id: `drop_rival_${Date.now()}`,
                x: rival.x,
                y: rival.y,
                type: 'atp',
                radius: 14,
                value: 50,
                bobPhase: 0,
              });

              this.rivals.splice(rIdx, 1);
            } else {
              sound.playHazardHit();
            }

            break;
          }
        }
      }

      if (destroyed) {
        this.projectiles.splice(pIdx, 1);
      }
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.alpha -= pt.decay;
      if (pt.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateZones() {
    const dist = this.player.x;
    for (let i = 0; i < ZONES.length; i++) {
      if (dist >= ZONES[i].startDistance && dist < ZONES[i].endDistance) {
        if (this.currentZoneIndex !== i) {
          this.currentZoneIndex = i;
          this.listeners.onZoneChange(i);
        }
        break;
      }
    }
  }

  private updateRankings() {
    // Sort all active swimmers by X position descending
    const allSwimmers = [this.player, ...this.rivals];
    allSwimmers.sort((a, b) => b.x - a.x);

    allSwimmers.forEach((s, idx) => {
      s.rank = idx + 1;
    });

    this.stats.rank = this.player.rank;

    // Report drill progress to listeners if fertilizing
    if (this.state === 'fertilizing') {
      const bestRivalDrill = Math.max(0, ...this.rivals.map((r) => r.drillProgress));
      this.listeners.onDrillProgress(this.player.drillProgress, bestRivalDrill);
    }
  }

  private enterFertilizationMode() {
    this.state = 'fertilizing';
    this.player.drillProgress = 0;
    this.listeners.onStateChange('fertilizing');
  }

  private checkEggCompletion() {
    if (this.egg.drillingWinner) return;

    if (this.player.drillProgress >= 100) {
      this.egg.drillingWinner = this.player;
      this.player.finished = true;
      this.triggerCorticalReaction(true);
    } else {
      for (const r of this.rivals) {
        if (r.drillProgress >= 100) {
          this.egg.drillingWinner = r;
          r.finished = true;
          this.player.health = 0;
          this.player.deathReason =
            'Another baby punched through the Zona Pellucida membrane first! Polyspermy block was triggered and eliminated your cell.';

          // Spawn death / lysis particles around the player
          for (let i = 0; i < 35; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 2 + Math.random() * 6;
            this.particles.push({
              x: this.player.x,
              y: this.player.y,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              size: 3 + Math.random() * 5,
              color: '#f43f5e',
              alpha: 1,
              decay: 0.025,
              type: 'debris',
            });
          }

          this.triggerCorticalReaction(false);
          break;
        }
      }
    }
  }

  private triggerCorticalReaction(playerWon: boolean) {
    if (playerWon) {
      sound.playVictory();
    } else {
      sound.playGameOver();
    }

    // Giant radiant explosion particles & cortical wave
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 3 + Math.random() * 12;
      this.particles.push({
        x: this.egg.x,
        y: this.egg.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 4 + Math.random() * 8,
        color: i % 2 === 0 ? '#fbbf24' : (playerWon ? '#ec4899' : '#ef4444'),
        alpha: 1,
        decay: 0.015,
        type: 'dna',
      });
    }

    // Award DNA points
    const earnedDna = playerWon ? 200 + Math.round(this.stats.atpCollected * 1.5) : 50;
    this.stats.dnaPointsEarned = earnedDna;
    this.stats.finalTime = this.stats.raceTime;

    if (playerWon) {
      setTimeout(() => {
        this.state = 'victory';
        this.listeners.onStateChange('victory');
      }, 1600);
    } else {
      this.player.health = 0;
      this.handleGameOver(
        this.player.deathReason ||
          'Another sperm reached the ovum first! The cortical reaction hardened the Zona Pellucida and eliminated your swimmer.'
      );
    }
  }

  private handleGameOver(reason: string) {
    this.state = 'gameover';
    this.player.health = 0;
    this.player.deathReason = reason;
    sound.playGameOver();
    this.listeners.onPlayerStatus({ ...this.player });
    this.listeners.onStateChange('gameover');
  }

  // --- RENDERING PIPELINE ---
  public render() {
    this.updateViewportMetrics();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ctx = this.ctx;

    ctx.save();
    // Reset transform to identity
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Clear entire screen buffer
    ctx.fillStyle = '#020617'; // Deep slate void
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply DPR scale so subsequent world drawing coordinates match logical CSS pixels
    ctx.scale(dpr, dpr);

    // Apply Camera Transform with Ejaculation Surge Shake and Impact Shake
    const totalShake = (this.ejaculation.shake > 0 ? this.ejaculation.shake : 0) + (this.cameraShake > 0 ? this.cameraShake : 0);
    const shakeX = totalShake > 0 ? (Math.random() - 0.5) * totalShake : 0;
    const shakeY = totalShake > 0 ? (Math.random() - 0.5) * totalShake : 0;

    // Apply mobile-adapted camera zoom (scales all visuals to fit and center comfortably)
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-Math.round(this.cameraX + shakeX), -Math.round(this.cameraY + shakeY));

    // 1. Draw Organic Channel Walls & Parallax Background
    this.drawChannelBackground(ctx);

    // 1.5. Draw Subtle Biological Zone Light Following Player Swimmer
    this.drawPlayerZoneLight(ctx);

    // 2. Draw Pickups
    this.drawPickups(ctx);

    // 3. Draw Hazards (Acid pools, Mucus, Macrophages)
    this.drawHazards(ctx);

    // 4. Draw Ovum (The Giant Egg at the Finish)
    this.drawEgg(ctx);

    // 5. Draw Competitor Rivals
    this.rivals.forEach((rival) => this.drawSwimmer(ctx, rival));

    // 6. Draw Player Swimmer
    this.drawSwimmer(ctx, this.player);

    // 6.5. Draw Ejaculation Seminal Jet Stream & Swarm of Micro-Sperms
    this.drawEjaculationSurge(ctx);

    // 7. Draw Active Projectiles (Enzyme darts)
    this.drawProjectiles(ctx);

    // 8. Draw Particles
    this.drawParticles(ctx);

    ctx.restore();
  }

  private drawChannelBackground(ctx: CanvasRenderingContext2D) {
    const activeZone = ZONES[this.currentZoneIndex] || ZONES[0];

    // If within or near Zone 1 (Vaginal Canal), draw full anatomical vagina visuals
    if (this.cameraX < 1900) {
      this.drawVaginalAnatomy(ctx);
    }

    // Subtle fluid tint matching current zone
    const grad = ctx.createLinearGradient(0, 0, 0, TRACK_WIDTH);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.9)');
    grad.addColorStop(0.5, `${activeZone.primaryColor}15`);
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.9)');
    ctx.fillStyle = grad;
    ctx.fillRect(this.cameraX - 200, 0, this.visibleWidth + 400, TRACK_WIDTH);

    // Upper and Lower Epithelial Tissue Boundaries (Anatomical cellular margins)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(this.cameraX - 200, -600, this.visibleWidth + 400, 600);
    ctx.fillRect(this.cameraX - 200, TRACK_WIDTH, this.visibleWidth + 400, 600);

    // Undulating Epithelium Border Lines with cilia & high-contrast glow boundaries
    ctx.save();
    ctx.strokeStyle = activeZone.accentColor;
    ctx.lineWidth = 5;
    ctx.shadowColor = activeZone.accentColor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    const startX = Math.floor(this.cameraX / 60) * 60 - 120;
    const endX = this.cameraX + this.visibleWidth + 120;

    // Top border
    ctx.moveTo(startX, 40);
    for (let x = startX; x <= endX; x += 40) {
      const wave = Math.sin(x * 0.015 + this.stats.raceTime * 2) * 12;
      ctx.lineTo(x, 40 + wave);
    }
    ctx.stroke();

    // Bottom border
    ctx.beginPath();
    ctx.moveTo(startX, TRACK_WIDTH - 40);
    for (let x = startX; x <= endX; x += 40) {
      const wave = Math.sin(x * 0.015 - this.stats.raceTime * 2) * 12;
      ctx.lineTo(x, TRACK_WIDTH - 40 + wave);
    }
    ctx.stroke();

    // Animated Beating Cilia Hairs on Epithelial Margins (Rhythmically wave with fluid current)
    ctx.strokeStyle = activeZone.accentColor;
    ctx.lineWidth = 2;
    const ciliaSpacing = 20;
    const ciliaStart = Math.floor(startX / ciliaSpacing) * ciliaSpacing;
    for (let cx = ciliaStart; cx <= endX; cx += ciliaSpacing) {
      const ciliaWave = Math.sin(cx * 0.04 + this.stats.raceTime * 7);

      // Upper wall cilia
      const topY = 40 + Math.sin(cx * 0.015 + this.stats.raceTime * 2) * 12;
      ctx.beginPath();
      ctx.moveTo(cx, topY);
      ctx.quadraticCurveTo(cx + ciliaWave * 8, topY + 12, cx + ciliaWave * 14 + 5, topY + 20);
      ctx.stroke();

      // Lower wall cilia
      const botY = TRACK_WIDTH - 40 + Math.sin(cx * 0.015 - this.stats.raceTime * 2) * 12;
      ctx.beginPath();
      ctx.moveTo(cx, botY);
      ctx.quadraticCurveTo(cx + ciliaWave * 8, botY - 12, cx + ciliaWave * 14 + 5, botY - 20);
      ctx.stroke();
    }
    ctx.restore();

    // Animated Floating red blood cells & fluid platelets (Brownian drift & organic flexing)
    this.backgroundCells.forEach((cell, idx) => {
      if (cell.x > this.cameraX - 100 && cell.x < this.cameraX + this.visibleWidth + 100) {
        ctx.save();
        const cellAngle = this.stats.raceTime * 1.2 + idx;
        const cellBob = Math.sin(this.stats.raceTime * 2.5 + idx * 0.7) * 5;
        const squash = 1 + Math.sin(this.stats.raceTime * 3 + idx) * 0.12;
        ctx.translate(cell.x, cell.y + cellBob);
        ctx.rotate(cellAngle);
        ctx.scale(squash, 1 / squash);

        ctx.beginPath();
        ctx.arc(0, 0, cell.size, 0, Math.PI * 2);
        ctx.fillStyle = cell.color;
        ctx.fill();
        ctx.restore();
      }
    });

    // Dynamic Flowing Track Direction Guide Chevrons (Conveyor motion indicates stream flow!)
    ctx.save();
    const chevronStep = 280;
    const flowOffset = (this.stats.raceTime * 140) % chevronStep;
    const baseStart = Math.floor((this.cameraX - flowOffset) / chevronStep) * chevronStep + flowOffset;
    for (let cx = baseStart; cx < this.cameraX + this.visibleWidth + chevronStep; cx += chevronStep) {
      const chevronAlpha = 0.22 + Math.sin(cx * 0.01 + this.stats.raceTime * 4) * 0.08;
      ctx.fillStyle = `rgba(56, 189, 248, ${Math.max(0.1, chevronAlpha)})`;
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▶ ▶ ▶', cx, TRACK_WIDTH / 2);
    }
    ctx.restore();

    // High-Contrast Distance & Zone Progress Markers every 500 μm
    ctx.save();
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    for (let m = 500; m < TRACK_LENGTH; m += 500) {
      if (m > this.cameraX - 100 && m < this.cameraX + this.visibleWidth + 100) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(m - 1, 48, 3, 22);
        ctx.fillRect(m - 1, TRACK_WIDTH - 70, 3, 22);
        ctx.fillStyle = '#f1f5f9';
        ctx.fillText(`📍 ${m} μm`, m, 85);
        ctx.fillText(`📍 ${m} μm`, m, TRACK_WIDTH - 80);
      }
    }
    ctx.restore();
  }

  // ==========================================
  // DETAILED ANATOMICAL VAGINA & INTROITUS RENDERING
  // ==========================================
  private drawVaginalAnatomy(ctx: CanvasRenderingContext2D) {
    const time = this.stats.raceTime || (7.2 - this.ejaculation.timer);

    // 1. THE STARTING POINT: PENILE SHAFT, GLANS MEATUS, VULVAR VESTIBULE & VAGINAL INTROITUS
    if (this.cameraX < 1200) {
      const isEjaculating = this.state === 'ejaculating';
      const spasmAmp = isEjaculating && this.ejaculation.phase === 'ejaculation' ? 12 : (isEjaculating ? 4 : 2);
      const pulseFreq = isEjaculating ? 8.0 : 2.5;
      const contractionPulse = Math.sin(time * pulseFreq);

      // ==========================================
      // A. MALE COPULATORY ORGAN (PENIS)
      // ==========================================
      // In ejaculation state, glansTipX follows insertionX. When race begins, penis rests inside introitus vault
      const glansTipX = isEjaculating ? this.ejaculation.insertionX : 340;
      const coronaX = glansTipX - 260;
      const shaftStartX = Math.min(-1600, glansTipX - 950);
      const midlineY = TRACK_WIDTH / 2; // 600

      // 1. Penile Shaft Outer Tissue (Integument, Dartos & Buck's Fascia)
      const penileSkinGrad = ctx.createLinearGradient(0, 320, 0, TRACK_WIDTH - 320);
      penileSkinGrad.addColorStop(0, '#1c050a'); // Deep dorsal vascular base
      penileSkinGrad.addColorStop(0.18, '#4c0519'); // Buck's fascia
      penileSkinGrad.addColorStop(0.35, '#881337'); // Cavernous margin
      penileSkinGrad.addColorStop(0.5, '#9f1239'); // Spongiosum / urethral bed
      penileSkinGrad.addColorStop(0.65, '#881337'); // Ventral cavernous margin
      penileSkinGrad.addColorStop(0.82, '#4c0519');
      penileSkinGrad.addColorStop(1, '#1c050a');

      // Upper Penile Shaft & Corona Contour
      ctx.fillStyle = penileSkinGrad;
      ctx.beginPath();
      ctx.moveTo(shaftStartX, -300);
      ctx.lineTo(coronaX - 40, -300);
      ctx.lineTo(coronaX - 40, 340 + Math.sin(time * 6) * spasmAmp);
      // Corona Glandis flared ridge (Upper)
      ctx.quadraticCurveTo(coronaX, 310, coronaX + 20, 320);
      // Glans Penis upper acorn curve sloping to urethral tip
      ctx.bezierCurveTo(coronaX + 110, 340, glansTipX - 40, 440, glansTipX, midlineY - 45);
      ctx.lineTo(shaftStartX, midlineY - 45);
      ctx.closePath();
      ctx.fill();

      // Lower Penile Shaft & Corona Contour
      ctx.beginPath();
      ctx.moveTo(shaftStartX, TRACK_WIDTH + 300);
      ctx.lineTo(coronaX - 40, TRACK_WIDTH + 300);
      ctx.lineTo(coronaX - 40, TRACK_WIDTH - 340 - Math.sin(time * 6) * spasmAmp);
      // Corona Glandis flared ridge (Lower)
      ctx.quadraticCurveTo(coronaX, TRACK_WIDTH - 310, coronaX + 20, TRACK_WIDTH - 320);
      // Glans Penis lower acorn curve sloping to urethral tip
      ctx.bezierCurveTo(coronaX + 110, TRACK_WIDTH - 340, glansTipX - 40, TRACK_WIDTH - 440, glansTipX, midlineY + 45);
      ctx.lineTo(shaftStartX, midlineY + 45);
      ctx.closePath();
      ctx.fill();

      // 2. Glans Penis Mucosal Body & Corona Sulcus Highlight (Vascular Crimson)
      const glansGrad = ctx.createRadialGradient(glansTipX - 100, midlineY, 40, glansTipX - 100, midlineY, 280);
      glansGrad.addColorStop(0, '#f43f5e'); // Rich mucosal pink near navicular fossa
      glansGrad.addColorStop(0.45, '#be185d'); // Capillary vascular bed
      glansGrad.addColorStop(0.8, '#881337'); // Corona base
      glansGrad.addColorStop(1, '#4c0519'); // Coronal sulcus

      ctx.fillStyle = glansGrad;
      ctx.beginPath();
      ctx.moveTo(coronaX, 315);
      ctx.bezierCurveTo(coronaX + 120, 335, glansTipX - 35, 430, glansTipX, midlineY - 45);
      ctx.lineTo(glansTipX, midlineY + 45);
      ctx.bezierCurveTo(glansTipX - 35, TRACK_WIDTH - 430, coronaX + 120, TRACK_WIDTH - 335, coronaX, TRACK_WIDTH - 315);
      ctx.quadraticCurveTo(coronaX - 25, midlineY, coronaX, 315);
      ctx.closePath();
      ctx.fill();

      // Coronal Sulcus groove border line
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(coronaX + 10, midlineY, 290, -Math.PI * 0.38, Math.PI * 0.38);
      ctx.stroke();

      // Coronal papillae / delicate mucosal ridge dots along the corona
      ctx.fillStyle = 'rgba(253, 164, 175, 0.6)';
      for (let angle = -Math.PI * 0.35; angle <= Math.PI * 0.35; angle += 0.08) {
        const px = coronaX + 10 + Math.cos(angle) * 285;
        const py = midlineY + Math.sin(angle) * 285;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Superficial Dorsal Vein & Arterial Plexus (Pulsating Blue/Cyan Vessel along Upper Shaft)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      for (let vx = shaftStartX; vx <= coronaX; vx += 40) {
        const vy = 355 + Math.sin(vx * 0.03 + time * 3) * 6;
        if (vx === shaftStartX) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.stroke();

      // 4. Penile Urethral Canal (Lumen) & Peristaltic Bulbospongiosus Spasm Waves
      const urethraTopY = midlineY - 65;
      const urethraBottomY = midlineY + 65;

      // Urethral mucosal wall lining (Pink velvety urothelium)
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 3;
      // Upper Urethral Wall with Peristaltic Wave
      ctx.beginPath();
      for (let ux = shaftStartX; ux <= glansTipX; ux += 30) {
        const wave = Math.sin(ux * 0.018 - time * pulseFreq) * (isEjaculating ? 14 : 4);
        const uy = urethraTopY + wave;
        if (ux === shaftStartX) ctx.moveTo(ux, uy);
        else ctx.lineTo(ux, uy);
      }
      ctx.stroke();

      // Lower Urethral Wall with Peristaltic Wave
      ctx.beginPath();
      for (let ux = shaftStartX; ux <= glansTipX; ux += 30) {
        const wave = Math.sin(ux * 0.018 - time * pulseFreq + Math.PI) * (isEjaculating ? 14 : 4);
        const uy = urethraBottomY + wave;
        if (ux === shaftStartX) ctx.moveTo(ux, uy);
        else ctx.lineTo(ux, uy);
      }
      ctx.stroke();

      // Urethral Internal Lumen Fluid Stream (Milky Alkaline Seminal Stream)
      const urethraLumenGrad = ctx.createLinearGradient(0, urethraTopY, 0, urethraBottomY);
      urethraLumenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      urethraLumenGrad.addColorStop(0.3, 'rgba(240, 249, 255, 0.45)');
      urethraLumenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.65)'); // Dense milky center
      urethraLumenGrad.addColorStop(0.7, 'rgba(240, 249, 255, 0.45)');
      urethraLumenGrad.addColorStop(1, 'rgba(255, 255, 255, 0.15)');

      ctx.fillStyle = urethraLumenGrad;
      ctx.beginPath();
      ctx.moveTo(shaftStartX, urethraTopY);
      ctx.lineTo(glansTipX - 80, urethraTopY);
      // Fossa Navicularis (Expanded chamber inside glans penis just before meatus)
      ctx.bezierCurveTo(glansTipX - 60, urethraTopY - 25, glansTipX - 25, urethraTopY - 15, glansTipX, midlineY - 25);
      ctx.lineTo(glansTipX, midlineY + 25);
      ctx.bezierCurveTo(glansTipX - 25, urethraBottomY + 15, glansTipX - 60, urethraBottomY + 25, glansTipX - 80, urethraBottomY);
      ctx.lineTo(shaftStartX, urethraBottomY);
      ctx.closePath();
      ctx.fill();

      // Fossa Navicularis highlight label line
      ctx.strokeStyle = 'rgba(254, 205, 211, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(glansTipX - 50, midlineY, 35, 52, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 5. External Urethral Meatus (The Ejaculatory Orifice)
      const meatusX = glansTipX;
      const meatusOpen = (isEjaculating && this.ejaculation.phase === 'ejaculation' ? Math.max(0.45, (contractionPulse + 1) * 0.55) : 0.22) * 40;
      const meatusHeight = 70;

      // Meatus mucosal lips (Labia urethralis)
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.ellipse(meatusX, midlineY, meatusOpen + 8, meatusHeight + 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Meatus orifice aperture (Luminous seminal exit portal)
      const meatusApertureGrad = ctx.createRadialGradient(meatusX, midlineY, 5, meatusX, midlineY, meatusOpen + 12);
      meatusApertureGrad.addColorStop(0, '#ffffff'); // Intense white seminal core
      meatusApertureGrad.addColorStop(0.4, 'rgba(56, 189, 248, 0.85)'); // Seminal plasma cyan glow
      meatusApertureGrad.addColorStop(0.8, '#e11d48'); // Mucosal margin
      meatusApertureGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = meatusApertureGrad;
      ctx.beginPath();
      ctx.ellipse(meatusX, midlineY, meatusOpen + 12, meatusHeight, 0, 0, Math.PI * 2);
      ctx.fill();

      // Active Ejaculatory Seminal Flare erupting from meatus during surge
      if (isEjaculating && this.ejaculation.phase !== 'insertion' && this.ejaculation.phase !== 'ready_to_shoot') {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 24;
        for (let j = 0; j < 12; j++) {
          const jetAngle = (j / 12 - 0.5) * 0.9;
          const jetLen = 50 + Math.sin(time * 14 + j) * 35;
          ctx.beginPath();
          ctx.moveTo(meatusX, midlineY + (j - 6) * 6);
          ctx.lineTo(meatusX + Math.cos(jetAngle) * jetLen, midlineY + Math.sin(jetAngle) * jetLen);
          ctx.lineWidth = 3.5;
          ctx.strokeStyle = j % 2 === 0 ? '#ffffff' : '#38bdf8';
          ctx.stroke();
        }
        ctx.restore();
      }

      // ==========================================
      // B. FEMALE COPULATORY INTERFACE (VULVA, VESTIBULE & INTROITUS: x = -220 to +150)
      // ==========================================

      // Outer Labial Mounds (Labia Majora & Minora Architecture)
      const labiaGrad = ctx.createLinearGradient(-300, 0, 150, 0);
      labiaGrad.addColorStop(0, '#2e020d'); // Deep subcutaneous perineal margin
      labiaGrad.addColorStop(0.3, '#4c0519'); // Labia majora deep vascular base
      labiaGrad.addColorStop(0.65, '#881337'); // Labia minora rich pink mucosal fold
      labiaGrad.addColorStop(0.88, '#be185d'); // Mucosal margin
      labiaGrad.addColorStop(1, '#f43f5e'); // Introitus inner mucosal edge

      // Upper Labial Tissue Arch (Cupping over the vestibule)
      ctx.fillStyle = labiaGrad;
      ctx.beginPath();
      ctx.moveTo(-320, -300);
      ctx.lineTo(120, -300);
      ctx.bezierCurveTo(120, 120, 60, 240, 40, 360);
      ctx.bezierCurveTo(20, 440, -40, 520, -120, 560);
      ctx.lineTo(-320, 560);
      ctx.closePath();
      ctx.fill();

      // Lower Labial Tissue Arch (Cupping under the vestibule)
      ctx.beginPath();
      ctx.moveTo(-320, TRACK_WIDTH + 300);
      ctx.lineTo(120, TRACK_WIDTH + 300);
      ctx.bezierCurveTo(120, TRACK_WIDTH - 120, 60, TRACK_WIDTH - 240, 40, TRACK_WIDTH - 360);
      ctx.bezierCurveTo(20, TRACK_WIDTH - 440, -40, TRACK_WIDTH - 520, -120, TRACK_WIDTH - 560);
      ctx.lineTo(-320, TRACK_WIDTH - 560);
      ctx.closePath();
      ctx.fill();

      // Undulating inner labial folds (Labia Minora ripples)
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let y = -80; y <= TRACK_WIDTH + 80; y += 32) {
        if (y > 440 && y < 760) continue; // Open at the center introitus orifice
        const waveX = Math.sin(y * 0.02 + time * 1.5) * 16;
        ctx.moveTo(-60 + waveX, y);
        ctx.quadraticCurveTo(-10 + waveX, y + 16, 20 + waveX, y);
      }
      ctx.stroke();

      // The Vaginal Introitus (The Elastic Sphincter Ring at x = 50)
      const introitusX = 50;
      const introitusY = midlineY;
      // Introitus elastically dilates as the glans and corona penetrate inside
      const dilateRatio = Math.min(1, Math.max(0, (glansTipX + 80) / 280));
      const introitusRadX = 50 + dilateRatio * 40;
      const introitusRadY = 180 + dilateRatio * 110;

      // Muscular Sphincter Outer Glow & Ring
      const sphincterGrad = ctx.createRadialGradient(introitusX, introitusY, 40, introitusX, introitusY, introitusRadY);
      sphincterGrad.addColorStop(0, 'rgba(225, 29, 72, 0.25)');
      sphincterGrad.addColorStop(0.6, 'rgba(190, 24, 93, 0.45)');
      sphincterGrad.addColorStop(0.85, 'rgba(136, 19, 55, 0.7)');
      sphincterGrad.addColorStop(1, 'rgba(76, 5, 25, 0.9)');

      ctx.fillStyle = sphincterGrad;
      ctx.beginPath();
      ctx.ellipse(introitusX, introitusY, introitusRadX + 25, introitusRadY + 30, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sphincter Border & Radiating Hymenal Caruncles
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(introitusX, introitusY, introitusRadX, introitusRadY, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Radiating muscular folds around the introitus rim
      ctx.strokeStyle = 'rgba(253, 164, 175, 0.4)';
      ctx.lineWidth = 2;
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(introitusX + cosA * (introitusRadX - 10), introitusY + sinA * (introitusRadY - 10));
        ctx.lineTo(introitusX + cosA * (introitusRadX + 35), introitusY + sinA * (introitusRadY + 45));
        ctx.stroke();
      }

      // Bartholin's Gland Ducts (Lateral posterolateral lubrication outlets)
      [-1, 1].forEach((dir) => {
        const bgY = introitusY + dir * 180;
        ctx.fillStyle = '#fda4af';
        ctx.beginPath();
        ctx.arc(introitusX - 10, bgY, 9, 0, Math.PI * 2);
        ctx.fill();
        // Glistening lubrication droplet
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(introitusX - 8, bgY - 2, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Glistening lubrication sheen at introitus perimeter when penis is penetrating
      if (glansTipX >= 30) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(introitusX, introitusY, introitusRadX - 5, introitusRadY - 10, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        for (let b = 0; b < 12; b++) {
          const bAngle = (b / 12) * Math.PI * 2;
          const bx = introitusX + Math.cos(bAngle) * (introitusRadX - 5);
          const by = introitusY + Math.sin(bAngle) * (introitusRadY - 10);
          ctx.beginPath();
          ctx.arc(bx, by, 3 + Math.sin(b + time * 4), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // ==========================================
      // C. ANATOMICAL MEDICAL CALLOUT LABELS & SCALES
      // ==========================================
      ctx.save();
      if (isEjaculating) {
        if (this.ejaculation.phase === 'insertion') {
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 15px "Plus Jakarta Sans", monospace';
          ctx.fillText('✦ STAGE 1: PENILE INSERTION & VAGINAL INGRESS', glansTipX - 160, 210);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
          ctx.font = '12px "Plus Jakarta Sans", monospace';
          const depth = Math.round(Math.max(0, glansTipX - 50));
          ctx.fillText(`PENETRATING INTROITUS SPHINCTER • DEPTH: ${depth} μm`, glansTipX - 160, 230);
        } else if (this.ejaculation.phase === 'ready_to_shoot') {
          ctx.fillStyle = '#f43f5e';
          ctx.font = 'bold 16px "Plus Jakarta Sans", monospace';
          ctx.fillText('✦ PENIS FULLY INSERTED • READY TO SHOOT SPERM', glansTipX - 170, 205);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 13px "Plus Jakarta Sans", monospace';
          ctx.fillText('CLICK "SHOOT SPERM" BUTTON OR PRESS [SPACEBAR]', glansTipX - 170, 228);

          // Pulsing targeting reticle at the urethral meatus
          const pulse = (Math.sin(performance.now() * 0.008) + 1) * 0.5;
          ctx.strokeStyle = `rgba(244, 63, 94, ${0.45 + pulse * 0.45})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(glansTipX, midlineY, 24 + pulse * 12, 0, Math.PI * 2);
          ctx.stroke();
        } else if (this.ejaculation.phase === 'ejaculation') {
          ctx.fillStyle = '#fb7185';
          ctx.font = 'bold 15px "Plus Jakarta Sans", monospace';
          ctx.fillText('✦ STAGE 2: EJACULATION & SEMINAL SURGE', glansTipX - 120, 210);
          ctx.fillStyle = 'rgba(251, 113, 133, 0.85)';
          ctx.font = '12px "Plus Jakarta Sans", monospace';
          ctx.fillText('BULBOSPONGIOSUS SPASMS • 250,000,000 SPERM EXPULSION', glansTipX - 120, 230);
        } else {
          ctx.fillStyle = '#34d399';
          ctx.font = 'bold 15px "Plus Jakarta Sans", monospace';
          ctx.fillText('✦ STAGE 3: SPERM TRAVELING THROUGH VAGINA', this.player.x - 120, 210);
          ctx.fillStyle = 'rgba(52, 211, 153, 0.85)';
          ctx.font = '12px "Plus Jakarta Sans", monospace';
          ctx.fillText('SWIMMING THROUGH TRANSVERSE RUGAE TOWARDS CERVIX', this.player.x - 120, 230);
        }
      } else {
        // Penile Shaft Label
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px "Plus Jakarta Sans", monospace';
        ctx.fillText('✦ PENILE URETHRA & CORPUS SPONGIOSUM (-750 μm)', -760, 260);

        // Vaginal Introitus Label
        ctx.fillStyle = '#fda4af';
        ctx.font = 'bold 14px "Plus Jakarta Sans", monospace';
        ctx.fillText('✦ VAGINAL INTROITUS (0 μm)', 40, 80);
        ctx.fillStyle = 'rgba(251, 113, 133, 0.8)';
        ctx.font = '11px "Plus Jakarta Sans", monospace';
        ctx.fillText('VULVAR VESTIBULE • SPHINCTER CANAL', 40, 100);
      }

      ctx.restore();
    }

    // 2. THE INSIDE OF THE VAGINA: CANAL & TRANSVERSE RUGAE (x: 0 to 1600)
    // Background mucosal lining gradient for the canal lumen
    const lumenGrad = ctx.createLinearGradient(0, 0, 0, TRACK_WIDTH);
    lumenGrad.addColorStop(0, 'rgba(159, 18, 57, 0.4)'); // Upper mucosal wall
    lumenGrad.addColorStop(0.2, 'rgba(225, 29, 72, 0.18)');
    lumenGrad.addColorStop(0.5, 'rgba(244, 63, 94, 0.08)'); // Central lumen
    lumenGrad.addColorStop(0.8, 'rgba(225, 29, 72, 0.18)');
    lumenGrad.addColorStop(1, 'rgba(159, 18, 57, 0.4)'); // Lower mucosal wall
    ctx.fillStyle = lumenGrad;
    ctx.fillRect(Math.max(-100, this.cameraX - 100), 0, this.visibleWidth + 200, TRACK_WIDTH);

    // Transverse Rugae Folds (Ribbed horizontal mucosal ridges) along upper and lower walls
    const startRugaX = Math.floor(Math.max(-50, this.cameraX - 150) / 36) * 36;
    const endRugaX = Math.min(1600, this.cameraX + this.visibleWidth + 150);

    for (let rx = startRugaX; rx <= endRugaX; rx += 36) {
      const rugaIndex = Math.floor(rx / 36);
      const waveOffset = Math.sin(rx * 0.035 + time * 1.8) * 12;
      const heightVar = Math.sin(rx * 0.08) * 25;

      // --- Upper Vaginal Wall (Anterior Wall Rugae) ---
      const topDepth = 150 + heightVar + waveOffset;
      const topRugaGrad = ctx.createLinearGradient(rx, 0, rx + 24, topDepth);
      topRugaGrad.addColorStop(0, '#4c0519'); // Deep tissue base
      topRugaGrad.addColorStop(0.5, '#9f1239'); // Fleshy body
      topRugaGrad.addColorStop(0.85, '#be185d'); // Rugal crest
      topRugaGrad.addColorStop(1, '#fb7185'); // Transverse mucosal tip

      ctx.fillStyle = topRugaGrad;
      ctx.beginPath();
      ctx.moveTo(rx - 16, 0);
      ctx.quadraticCurveTo(rx - 8, topDepth * 0.6, rx + waveOffset * 0.4, topDepth);
      ctx.quadraticCurveTo(rx + 18, topDepth * 0.7, rx + 26, 0);
      ctx.closePath();
      ctx.fill();

      // Moist mucosal specular highlight on top ruga crest
      ctx.strokeStyle = 'rgba(254, 205, 211, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(rx - 6, topDepth * 0.7);
      ctx.quadraticCurveTo(rx + waveOffset * 0.3, topDepth + 2, rx + 12, topDepth * 0.75);
      ctx.stroke();

      // --- Lower Vaginal Wall (Posterior Wall Rugae) ---
      const bottomDepth = TRACK_WIDTH - (150 + heightVar - waveOffset);
      const botRugaGrad = ctx.createLinearGradient(rx, TRACK_WIDTH, rx + 24, bottomDepth);
      botRugaGrad.addColorStop(0, '#4c0519');
      botRugaGrad.addColorStop(0.5, '#9f1239');
      botRugaGrad.addColorStop(0.85, '#be185d');
      botRugaGrad.addColorStop(1, '#fb7185');

      ctx.fillStyle = botRugaGrad;
      ctx.beginPath();
      ctx.moveTo(rx - 16, TRACK_WIDTH);
      ctx.quadraticCurveTo(rx - 8, TRACK_WIDTH - (TRACK_WIDTH - bottomDepth) * 0.6, rx - waveOffset * 0.4, bottomDepth);
      ctx.quadraticCurveTo(rx + 18, TRACK_WIDTH - (TRACK_WIDTH - bottomDepth) * 0.7, rx + 26, TRACK_WIDTH);
      ctx.closePath();
      ctx.fill();

      // Moist mucosal specular highlight on bottom ruga crest
      ctx.strokeStyle = 'rgba(254, 205, 211, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(rx - 6, bottomDepth + (TRACK_WIDTH - bottomDepth) * 0.3);
      ctx.quadraticCurveTo(rx - waveOffset * 0.3, bottomDepth - 2, rx + 12, bottomDepth + (TRACK_WIDTH - bottomDepth) * 0.25);
      ctx.stroke();

      // Symbiotic Lactobacillus acidophilus colonies (tiny glowing rod bacteria)
      if (rugaIndex % 3 === 0) {
        ctx.fillStyle = 'rgba(251, 113, 133, 0.75)';
        ctx.beginPath();
        ctx.ellipse(rx + 8, topDepth - 25, 6, 2.5, Math.PI / 4, 0, Math.PI * 2);
        ctx.ellipse(rx + 14, topDepth - 18, 5, 2, -Math.PI / 6, 0, Math.PI * 2);
        ctx.ellipse(rx + 6, bottomDepth + 22, 6, 2.5, -Math.PI / 3, 0, Math.PI * 2);
        ctx.fill();

        // Tiny lactic acid metabolic bubbles
        ctx.fillStyle = 'rgba(254, 205, 211, 0.5)';
        ctx.beginPath();
        ctx.arc(rx + 10, topDepth - 10, 1.8, 0, Math.PI * 2);
        ctx.arc(rx + 8, bottomDepth + 10, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Micro-Capillary Arterioles in Lamina Propria (Submucosal vascular network)
      if (rugaIndex % 2 === 0) {
        ctx.strokeStyle = 'rgba(225, 29, 72, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        // Top capillary branch
        ctx.moveTo(rx - 10, 20);
        ctx.quadraticCurveTo(rx + 2, topDepth * 0.5, rx + 14, topDepth * 0.7);
        // Bottom capillary branch
        ctx.moveTo(rx - 10, TRACK_WIDTH - 20);
        ctx.quadraticCurveTo(rx + 2, bottomDepth + (TRACK_WIDTH - bottomDepth) * 0.5, rx + 14, bottomDepth + (TRACK_WIDTH - bottomDepth) * 0.3);
        ctx.stroke();
      }
    }

    // Columna Rugarum: Longitudinal mucosal band along top and bottom
    ctx.strokeStyle = 'rgba(251, 113, 133, 0.4)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(Math.max(-50, this.cameraX - 100), 160);
    ctx.lineTo(Math.min(1600, this.cameraX + this.visibleWidth + 100), 160);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(Math.max(-50, this.cameraX - 100), TRACK_WIDTH - 160);
    ctx.lineTo(Math.min(1600, this.cameraX + this.visibleWidth + 100), TRACK_WIDTH - 160);
    ctx.stroke();

    // Live In-Canal pH Boundary Interface Markers
    if (this.cameraX < 1700) {
      ctx.save();
      // Boundary 1: Acidic Mantle Core Barrier at 500 μm
      if (500 > this.cameraX - 100 && 500 < this.cameraX + this.visibleWidth + 100) {
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(500, 150);
        ctx.lineTo(500, TRACK_WIDTH - 150);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#fda4af';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('⚡ ACIDIC MANTLE BARRIER • pH 3.8', 510, 175);
      }

      // Boundary 2: Posterior Fornix Alkaline Neutralization Transition at 1200 μm
      if (1200 > this.cameraX - 100 && 1200 < this.cameraX + this.visibleWidth + 100) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(1200, 150);
        ctx.lineTo(1200, TRACK_WIDTH - 150);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('✦ SEMINAL ALKALINE BUFFER ZONE • pH 7.2', 1210, 175);
      }
      ctx.restore();
    }

    // Anatomical Signage along the inside of the Vaginal Canal
    if (this.cameraX < 1400 && this.cameraX + this.visibleWidth > 600) {
      ctx.save();
      ctx.fillStyle = 'rgba(253, 164, 175, 0.85)';
      ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('VAGINAL CANAL • TRANSVERSE RUGAE RIDGES', 680, 195);
      ctx.fillStyle = 'rgba(244, 63, 94, 0.75)';
      ctx.font = '12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('HOSTILE ACIDIC MANTLE (pH 3.8 - 4.5 • LACTIC ACID BACILLI)', 680, 215);

      ctx.fillStyle = 'rgba(253, 164, 175, 0.85)';
      ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('COLUMNA RUGARUM POSTERIOR • SQUAMOUS EPITHELIUM', 680, TRACK_WIDTH - 195);
      ctx.restore();
    }

    // 3. POSTERIOR FORNIX & CERVICAL OS (x: 1200 to 1600)
    if (this.cameraX + this.visibleWidth > 1150 && this.cameraX < 1850) {
      // Posterior Fornix Seminal Pool Basin
      const poolGrad = ctx.createLinearGradient(1200, TRACK_WIDTH - 260, 1600, TRACK_WIDTH);
      poolGrad.addColorStop(0, 'rgba(56, 189, 248, 0.1)');
      poolGrad.addColorStop(0.5, 'rgba(248, 250, 252, 0.2)'); // Seminal reservoir
      poolGrad.addColorStop(1, 'rgba(224, 242, 254, 0.28)');
      ctx.fillStyle = poolGrad;
      ctx.beginPath();
      ctx.roundRect(1220, TRACK_WIDTH - 240, 360, 140, 30);
      ctx.fill();

      // Signage: Posterior Fornix
      ctx.save();
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('✦ POSTERIOR FORNIX • SEMINAL RESERVOIR (1200 μm)', 1230, TRACK_WIDTH - 215);
      ctx.fillStyle = 'rgba(224, 242, 254, 0.75)';
      ctx.font = '11px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Semen collects here to bathe the cervical os in alkaline buffer', 1230, TRACK_WIDTH - 198);

      // Cervical Os at x = 1600 (Donut-shaped ectocervix protrusion)
      const ectoX = 1600;
      const ectoY = TRACK_WIDTH / 2;
      const ectoGrad = ctx.createRadialGradient(ectoX, ectoY, 30, ectoX, ectoY, 200);
      ectoGrad.addColorStop(0, '#0f172a'); // Cervical Os opening lumen
      ectoGrad.addColorStop(0.2, '#be185d');
      ectoGrad.addColorStop(0.65, '#059669'); // Transition to cervical mucus zone
      ectoGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = ectoGrad;
      ctx.beginPath();
      ctx.arc(ectoX, ectoY, 180, 0, Math.PI * 2);
      ctx.fill();

      // Cervical Os external ring
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(ectoX, ectoY, 55, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('✦ EXTERNAL CERVICAL OS (1600 μm)', 1460, ectoY - 70);
      ctx.fillStyle = 'rgba(52, 211, 153, 0.8)';
      ctx.font = '12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('ENTRY TO CERVICAL CRYPTS & MUCUS', 1460, ectoY - 50);
      ctx.restore();
    }
  }

  // ==========================================
  // EJACULATION SURGE & 250M SPERM SWARM RENDERING
  // ==========================================
  private drawEjaculationSurge(ctx: CanvasRenderingContext2D) {
    const isEjaculating = this.state === 'ejaculating';
    const earlyRace = this.state === 'racing' && this.stats.raceTime < 3.5;
    if (!isEjaculating && !earlyRace) return;

    const meatusX = isEjaculating ? this.ejaculation.insertionX : 340;
    const fade = isEjaculating ? 1 : Math.max(0, 1 - this.stats.raceTime / 3.5);

    ctx.save();

    // 1. High Velocity Seminal Fluid Jet Streams (Pearly white / glowing cyan)
    this.ejaculation.streamJets.forEach((jet) => {
      ctx.fillStyle = jet.color;
      ctx.globalAlpha = jet.alpha * fade;
      ctx.beginPath();
      ctx.ellipse(jet.x, jet.y, jet.radius * 2.2, jet.radius, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Seminal Hydrodynamic Flow Lines (Originating in penile urethra -> meatus -> vaginal lumen)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 10; i++) {
      const flowOffset = (i - 4.5) * 25;
      const urethralY = (TRACK_WIDTH / 2) + flowOffset * 0.6; // Compressed in urethra
      const meatusY = (TRACK_WIDTH / 2) + flowOffset * 0.5; // Constricted at meatus exit
      const vaginalY = (TRACK_WIDTH / 2) + flowOffset * 2.2; // Expands in vaginal lumen
      ctx.beginPath();
      ctx.moveTo(meatusX - 530, urethralY);
      ctx.lineTo(meatusX - 130, urethralY);
      // Funnel through fossa navicularis & meatus
      ctx.bezierCurveTo(meatusX - 50, meatusY, meatusX, meatusY, meatusX + 80, meatusY + Math.sin(i + performance.now() * 0.01) * 15);
      // Flare into vaginal lumen
      ctx.bezierCurveTo(meatusX + 160, vaginalY * 0.8, meatusX + 240, vaginalY, meatusX + 600, vaginalY);
      ctx.globalAlpha = (0.35 + Math.sin(i * 1.4 + performance.now() * 0.006) * 0.25) * fade;
      ctx.stroke();
    }

    // 2b. Ejaculatory Meatus Expulsion Shockwaves radiating from meatus
    if (isEjaculating && this.ejaculation.phase !== 'insertion' && this.ejaculation.phase !== 'ready_to_shoot') {
      const wavePhase = (performance.now() * 0.004) % 1;
      for (let w = 0; w < 3; w++) {
        const ringProg = (wavePhase + w / 3) % 1;
        const ringRad = 20 + ringProg * 140;
        const ringAlpha = (1 - ringProg) * 0.7 * fade;
        ctx.strokeStyle = `rgba(56, 189, 248, ${ringAlpha})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(meatusX + ringRad * 0.8, TRACK_WIDTH / 2, ringRad, ringRad * 0.7, 0, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();
      }

      // Introitus Ingress Luminous Rings at x = 50
      for (let w = 0; w < 2; w++) {
        const ringProg = ((wavePhase + w * 0.5) + 0.3) % 1;
        const ringRad = 40 + ringProg * 120;
        const ringAlpha = (1 - ringProg) * 0.5 * fade;
        ctx.strokeStyle = `rgba(244, 63, 94, ${ringAlpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(50, TRACK_WIDTH / 2, ringRad * 0.5, ringRad * 1.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 3. Swarm of 250,000,000 Micro Baby Sperms in the Insemination Surge
    this.ejaculation.swarmMicroSperms.forEach((ms) => {
      ctx.globalAlpha = ms.alpha * fade;

      // Micro baby diaper at rear
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ms.x - ms.size * 0.7, ms.y, ms.size * 0.75, 0, Math.PI * 2);
      ctx.fill();

      // Micro baby running feet
      const microLeg = Math.sin(ms.tailPhase);
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(ms.x - ms.size * 0.95, ms.y - ms.size * 0.55 + microLeg * 1.6, ms.size * 0.38, 0, Math.PI * 2);
      ctx.arc(ms.x - ms.size * 0.95, ms.y + ms.size * 0.55 - microLeg * 1.6, ms.size * 0.38, 0, Math.PI * 2);
      ctx.fill();

      // Micro baby chubby head
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(ms.x, ms.y, ms.size, 0, Math.PI * 2);
      ctx.fill();

      // Micro baby pacifier tip (acrosome)
      ctx.fillStyle = ms.size > 2 ? '#38bdf8' : '#fb7185';
      ctx.beginPath();
      ctx.arc(ms.x + ms.size * 0.9, ms.y, ms.size * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Micro-sperm wiggling tail from diaper
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.75)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(ms.x - ms.size * 0.7, ms.y);
      const tailLength = ms.size * 5.8;
      const tailX1 = ms.x - tailLength * 0.5;
      const tailY1 = ms.y + Math.sin(ms.tailPhase) * 4;
      const tailX2 = ms.x - tailLength;
      const tailY2 = ms.y + Math.cos(ms.tailPhase) * 6;
      ctx.quadraticCurveTo(tailX1, tailY1, tailX2, tailY2);
      ctx.stroke();
    });

    // 4. Alkaline Seminal Buffer Cloud (Iridescent protective bubble around swarm)
    const bufferGrad = ctx.createRadialGradient(120, TRACK_WIDTH / 2, 80, 120, TRACK_WIDTH / 2, 450);
    bufferGrad.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
    bufferGrad.addColorStop(0.5, 'rgba(248, 250, 252, 0.18)');
    bufferGrad.addColorStop(0.9, 'rgba(52, 211, 153, 0.12)');
    bufferGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = bufferGrad;
    ctx.globalAlpha = fade;
    ctx.beginPath();
    ctx.arc(120, TRACK_WIDTH / 2, 450, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawPickups(ctx: CanvasRenderingContext2D) {
    this.pickups.forEach((p) => {
      if (p.collected) return;
      if (p.x < this.cameraX - 50 || p.x > this.cameraX + this.visibleWidth + 50) return;

      const bobY = p.y + Math.sin(p.bobPhase + this.stats.raceTime * 3) * 7;

      ctx.save();
      ctx.translate(p.x, bobY);

      if (p.type === 'atp') {
        // High-Contrast Animated Golden ATP Energy Crystal
        const pulse = 1 + Math.sin(this.stats.raceTime * 5 + p.bobPhase) * 0.14;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 20;

        // Radiant Pulsing Outer Glow Ring
        ctx.strokeStyle = `rgba(251, 191, 36, ${0.4 + Math.sin(this.stats.raceTime * 6) * 0.2})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, (p.radius + 6) * pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Orbiting Radiant Spark Motes
        for (let s = 0; s < 3; s++) {
          const sAngle = this.stats.raceTime * 2.5 + (s * Math.PI * 2) / 3;
          const sDist = p.radius + 8 + Math.sin(this.stats.raceTime * 4 + s) * 2;
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(Math.cos(sAngle) * sDist, Math.sin(sAngle) * sDist, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Faceted Amber Crystal Body (Smoothly rotating)
        ctx.save();
        ctx.rotate(Math.sin(this.stats.raceTime * 2) * 0.15);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(0, -p.radius * pulse);
        ctx.lineTo(p.radius * pulse, 0);
        ctx.lineTo(0, p.radius * pulse);
        ctx.lineTo(-p.radius * pulse, 0);
        ctx.closePath();
        ctx.fill();

        // Inner Facet Highlight
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(0, -p.radius * pulse * 0.6);
        ctx.lineTo(p.radius * pulse * 0.6, 0);
        ctx.lineTo(0, p.radius * pulse * 0.6);
        ctx.lineTo(-p.radius * pulse * 0.6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Clear High-Contrast "+ATP" Badge
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#78350f';
        ctx.font = '900 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+ATP', 0, 0);
      } else if (p.type === 'shield') {
        // High-Contrast Animated Alkaline Seminal Shield Bubble
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 22;

        ctx.fillStyle = 'rgba(14, 165, 233, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Rotating caustic light ring sweeping around perimeter
        const lightSweep = this.stats.raceTime * 3.5;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, lightSweep, lightSweep + Math.PI * 0.6);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛡️ SHIELD', 0, 0);
      } else if (p.type === 'turbo') {
        // Turbo Enzyme Booster with spinning energy ring
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 20;

        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -this.stats.raceTime * 25;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡ TURBO', 0, 0);
      } else if (p.type === 'multiplier') {
        // Golden Score Multiplier Star (2x DNA) with spinning starburst
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 20;

        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.rotate(this.stats.raceTime * 1.8);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const r = i % 2 === 0 ? p.radius + 4 : p.radius - 2;
          const sx = Math.cos(a) * r;
          const sy = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#713f12';
        ctx.font = '900 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐ 2X DNA', 0, 0);
      } else if (p.type === 'magnet') {
        // Cyan Magnetic Pull Field with pulsating flux rings
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 18;

        const fluxPulse = (this.stats.raceTime * 3) % 1;
        ctx.strokeStyle = `rgba(34, 211, 238, ${1 - fluxPulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius + fluxPulse * 12, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#0891b2';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🧲 MAGNET', 0, 0);
      } else if (p.type === 'capacitation') {
        // Hyper-motility Capacitation Orb with crackling plasma arcs
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 22;

        ctx.fillStyle = '#7e22ce';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.strokeStyle = '#e9d5ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = this.stats.raceTime * 30;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8.5px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡ HYPER', 0, 0);
      } else if (p.type === 'enzyme_burst') {
        // Acrosome Drill Burst
        ctx.shadowColor = '#fb7185';
        ctx.shadowBlur = 18;

        ctx.fillStyle = '#be123c';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.rotate(this.stats.raceTime * 4);
        ctx.strokeStyle = '#fecdd3';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-p.radius * 0.7, -p.radius * 0.7, p.radius * 1.4, p.radius * 1.4);
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8.5px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💥 ACRO', 0, 0);
      }

      ctx.restore();
    });
  }

  private drawHazards(ctx: CanvasRenderingContext2D) {
    this.hazards.forEach((h) => {
      if (h.x < this.cameraX - 150 || h.x > this.cameraX + this.visibleWidth + 150) return;

      ctx.save();
      if (h.type === 'acid') {
        // Acid Pool: Corrosive glowing crimson pool with animated effervescent bubbling
        const pulse = 1 + Math.sin(h.pulsePhase + this.stats.raceTime * 3) * 0.1;
        const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.radius * pulse);
        grad.addColorStop(0, 'rgba(244, 63, 94, 0.88)');
        grad.addColorStop(0.65, 'rgba(225, 29, 72, 0.55)');
        grad.addColorStop(1, 'rgba(225, 29, 72, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Animated rising effervescent bubbles inside acid pool
        for (let b = 0; b < 6; b++) {
          const bPhase = (this.stats.raceTime * 2.5 + b * 1.1) % 1;
          const bAngle = b * 1.05 + 0.3;
          const bDist = (h.radius * 0.65) * (1 - bPhase);
          const bX = h.x + Math.cos(bAngle) * bDist;
          const bY = h.y + Math.sin(bAngle) * bDist - bPhase * 16;
          const bSize = (1 - bPhase) * 3.5;
          if (bSize > 0.6) {
            ctx.fillStyle = '#fecdd3';
            ctx.beginPath();
            ctx.arc(bX, bY, bSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Clear Hazard Warning Boundary
        ctx.strokeStyle = 'rgba(251, 113, 133, 0.85)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -this.stats.raceTime * 12;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // High-Contrast Warning Badge
        ctx.fillStyle = '#ffe4e6';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ ACID pH 3.8 (-HP)', h.x, h.y + 4);
      } else if (h.type === 'spermicide') {
        // Spermicide Nonoxynol-9 chemical hazard with rotating warning perimeter
        const pulse = 1 + Math.sin(h.pulsePhase * 2 + this.stats.raceTime * 4) * 0.12;
        const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.radius * pulse);
        grad.addColorStop(0, 'rgba(251, 113, 133, 0.9)');
        grad.addColorStop(0.65, 'rgba(244, 63, 94, 0.6)');
        grad.addColorStop(1, 'rgba(159, 18, 57, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = this.stats.raceTime * 15;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('☠️ SPERMICIDE (TOXIC)', h.x, h.y + 3);
      } else if (h.type === 'mucus') {
        // Viscous Cervical Mucus Strand undulating like kelp in fluid current
        const strandWave = Math.sin(this.stats.raceTime * 4 + h.pulsePhase) * 12;
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(h.x - h.radius, h.y - 20);
        ctx.bezierCurveTo(h.x, h.y + 25 + strandWave, h.x, h.y - 25 - strandWave, h.x + h.radius, h.y + 20);
        ctx.stroke();

        ctx.fillStyle = '#a7f3d0';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🕸️ MUCUS WEB (SLOWS)', h.x, h.y);
      } else if (h.type === 'cilia_vortex') {
        // Swirling fluid current whirlpool
        const vortexAngle = this.stats.raceTime * 8;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, vortexAngle, vortexAngle + Math.PI * 1.5);
        ctx.stroke();

        ctx.fillStyle = '#7dd3fc';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🌀 CURRENT', h.x, h.y);
      } else if (h.type === 'crosscurrent') {
        // Transverse fluid jet arrows with moving wave lines
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 3.5;
        const dir = h.direction || 1;
        const waveOffset = Math.sin(this.stats.raceTime * 6) * 6;
        for (let offset = -20; offset <= 20; offset += 20) {
          ctx.beginPath();
          ctx.moveTo(-h.radius * 0.7, offset);
          ctx.lineTo(h.radius * 0.7, offset + dir * 15 + waveOffset);
          ctx.stroke();
        }
        ctx.fillStyle = '#e0f2fe';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🌊 JET CURRENT', 0, 0);
        ctx.restore();
      } else if (h.type === 'antibody_cloud') {
        // Sticky agglutination cloud with pulsing web
        const pulse = 1 + Math.sin(h.pulsePhase * 1.5 + this.stats.raceTime * 3) * 0.12;
        ctx.fillStyle = 'rgba(217, 70, 239, 0.45)';
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.strokeStyle = '#f0abfc';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -this.stats.raceTime * 14;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🛡️ ANTIBODIES (TRAP)', h.x, h.y + 3);
      } else if (h.type === 'macrophage') {
        // Gigantic White Blood Cell Amoeba with dynamically undulating pseudopods & spinning warning ring
        const r = h.radius;
        ctx.save();
        ctx.translate(h.x, h.y);

        // Explicit Red Dashed Detection Perimeter Circle (Rotating smoothly to indicate active sensing!)
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 8]);
        ctx.lineDashOffset = -this.stats.raceTime * 22;
        ctx.beginPath();
        ctx.arc(0, 0, r + 45, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Macrophage Cell Body (Smooth animated pseudopods undulation)
        ctx.fillStyle = 'rgba(139, 92, 246, 0.88)';
        ctx.shadowColor = '#8b5cf6';
        ctx.shadowBlur = 26;

        ctx.beginPath();
        const numPoints = 14;
        for (let i = 0; i <= numPoints; i++) {
          const theta = (i / numPoints) * Math.PI * 2;
          const wobble = Math.sin(this.stats.raceTime * 4 + i * 1.4) * 14;
          const px = Math.cos(theta) * (r + wobble);
          const py = Math.sin(theta) * (r + wobble);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Macrophage Nucleus (Breathing & pulsating)
        const nucleusPulse = 1 + Math.sin(this.stats.raceTime * 5) * 0.08;
        ctx.fillStyle = '#3b0764';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.45 * nucleusPulse, 0, Math.PI * 2);
        ctx.fill();

        // High-Contrast Explanatory Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ MACROPHAGE', 0, -4);
        ctx.fillStyle = '#f5d0fe';
        ctx.font = '600 8.5px monospace';
        ctx.fillText('(IMMUNE CELL)', 0, 8);

        // Health bar if damaged
        if (h.health !== undefined && h.maxHealth && h.health < h.maxHealth) {
          const hpW = 48;
          const hpH = 6;
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(-hpW / 2, -r - 14, hpW, hpH);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-hpW / 2, -r - 14, hpW * (h.health / h.maxHealth), hpH);
        }

        ctx.restore();
      } else if (h.type === 'cilia_conveyor') {
        // Dynamic Fallopian Cilia Conveyor Belt
        ctx.save();
        ctx.translate(h.x, h.y);
        const w = h.radius * 2.4;
        const hgt = 52;

        // Fluid speed stream channel
        const conveyorGrad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        conveyorGrad.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
        conveyorGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.40)');
        conveyorGrad.addColorStop(1, 'rgba(6, 182, 212, 0.15)');
        ctx.fillStyle = conveyorGrad;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -hgt / 2, w, hgt, 16);
        ctx.fill();

        // Undulating beating cilia hairs along top and bottom border
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2.2;
        const hairs = 16;
        for (let i = 0; i < hairs; i++) {
          const hairX = -w / 2 + (i / (hairs - 1)) * w;
          const hairPhase = h.pulsePhase * 4 + i * 0.45;
          const beatAngle = Math.sin(hairPhase) * 0.6 + 0.35; // Leaning and waving forward

          // Top cilia hair
          ctx.beginPath();
          ctx.moveTo(hairX, -hgt / 2);
          ctx.lineTo(hairX + Math.cos(beatAngle) * 12, -hgt / 2 + Math.sin(beatAngle) * 12);
          ctx.stroke();

          // Bottom cilia hair
          ctx.beginPath();
          ctx.moveTo(hairX, hgt / 2);
          ctx.lineTo(hairX + Math.cos(-beatAngle) * 12, hgt / 2 - Math.sin(-beatAngle) * 12);
          ctx.stroke();
        }

        // Fast forward motion chevrons & speed label
        ctx.fillStyle = '#67e8f9';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡ CILIA CONVEYOR (+30% SPEED) ⚡', 0, 0);
        ctx.restore();
      } else if (h.type === 'collagen_mesh') {
        // Woven Collagen & Fibrin Mesh Barrier
        ctx.save();
        ctx.translate(h.x, h.y);
        const r = h.radius;
        const pulse = 1 + Math.sin(h.pulsePhase * 2) * 0.05;

        // Translucent amber mesh backdrop
        ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
        ctx.beginPath();
        ctx.ellipse(0, 0, r * pulse, r * 0.75 * pulse, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cross-hatch diagonal protein filament grid
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
        ctx.lineWidth = 1.6;
        const step = 14;
        ctx.beginPath();
        for (let offset = -r; offset <= r; offset += step) {
          // Diagonal forward strands
          ctx.moveTo(offset, -r * 0.7);
          ctx.lineTo(offset + r * 0.6, r * 0.7);
          // Diagonal backward strands
          ctx.moveTo(offset, r * 0.7);
          ctx.lineTo(offset + r * 0.6, -r * 0.7);
        }
        ctx.stroke();

        // Mesh perimeter cord
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * pulse, r * 0.75 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Glowing protein junction nodes
        ctx.fillStyle = '#fef08a';
        for (let i = -2; i <= 2; i++) {
          for (let j = -1; j <= 1; j++) {
            ctx.beginPath();
            ctx.arc(i * 18, j * 16, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Warning label
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🕸️ COLLAGEN MESH (-55% SPD)', 0, 0);
        ctx.restore();
      } else if (h.type === 'bio_tar') {
        // Hyper-viscous Bubbling Bio-Tar Sludge Pit
        ctx.save();
        ctx.translate(h.x, h.y);
        const r = h.radius;

        // Viscous dark amber-brown sludge gradient
        const tarGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        tarGrad.addColorStop(0, '#291102');
        tarGrad.addColorStop(0.55, '#542306');
        tarGrad.addColorStop(0.88, '#9a3412');
        tarGrad.addColorStop(1, 'rgba(180, 83, 9, 0)');

        ctx.fillStyle = tarGrad;
        ctx.beginPath();
        // Undulating organic tar perimeter
        const points = 14;
        for (let i = 0; i <= points; i++) {
          const theta = (i / points) * Math.PI * 2;
          const wobble = Math.sin(h.pulsePhase * 2.5 + i * 1.6) * 6;
          const px = Math.cos(theta) * (r + wobble);
          const py = Math.sin(theta) * (r * 0.72 + wobble * 0.6);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Bubbling viscous blister droplets on top
        for (let b = 0; b < 4; b++) {
          const bAngle = b * (Math.PI / 2) + 0.4;
          const bDist = r * 0.42;
          const bSize = 3 + Math.sin(h.pulsePhase * 3 + b * 1.4) * 2;
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.arc(Math.cos(bAngle) * bDist, Math.sin(bAngle) * bDist * 0.7, Math.max(1, bSize), 0, Math.PI * 2);
          ctx.fill();
        }

        // Sludge warning label
        ctx.fillStyle = '#fed7aa';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🍯 BIO-TAR SLUDGE (-75% SPD)', 0, 0);
        ctx.restore();
      } else if (h.type === 'neutrophil_net') {
        // Neutrophil Extracellular Trap (NET): Luminous chromatin web net
        ctx.save();
        ctx.translate(h.x, h.y);
        const r = h.radius;
        const pulse = 1 + Math.sin(h.pulsePhase * 3) * 0.08;

        // Electrostatic energy glow
        ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
        ctx.beginPath();
        ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
        ctx.fill();

        // 8 Radiating chromatin web threads
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.85)';
        ctx.lineWidth = 1.6;
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        const rays = 8;
        for (let i = 0; i < rays; i++) {
          const angle = (i / rays) * Math.PI * 2;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * r * pulse, Math.sin(angle) * r * pulse);
        }
        ctx.stroke();

        // Concentric web rings
        for (let ring = 1; ring <= 3; ring++) {
          const ringRad = (r / 3) * ring * pulse;
          ctx.beginPath();
          for (let i = 0; i <= rays; i++) {
            const angle = (i / rays) * Math.PI * 2;
            const px = Math.cos(angle) * ringRad;
            const py = Math.sin(angle) * ringRad;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }

        // Central nucleoprotein core
        ctx.fillStyle = '#7e22ce';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e879f9';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // NET warning label
        ctx.fillStyle = '#f5d0fe';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡ NEUTROPHIL NET (-65% SPD)', 0, 16);
        ctx.restore();
      }

      // General hazard damage indicator for chemical obstacles (acid, spermicide, etc.)
      if (h.type !== 'macrophage' && h.health !== undefined && h.maxHealth && h.health < h.maxHealth) {
        const hpW = 32;
        const hpH = 4;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(h.x - hpW / 2, h.y - h.radius - 8, hpW, hpH);
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(h.x - hpW / 2, h.y - h.radius - 8, hpW * (h.health / h.maxHealth), hpH);
      }

      ctx.restore();
    });
  }

  private drawEgg(ctx: CanvasRenderingContext2D) {
    if (this.egg.x < this.cameraX - 600 || this.egg.x > this.cameraX + this.visibleWidth + 600) return;

    ctx.save();
    ctx.translate(this.egg.x, this.egg.y);

    // 1. Dynamic Radiant Corona Radiata (Surrounding revolving follicular cells)
    const coronaCount = 36;
    const rotAngle = this.egg.coronaAngle + this.stats.raceTime * 0.35;
    for (let i = 0; i < coronaCount; i++) {
      const angle = (i / coronaCount) * Math.PI * 2 + rotAngle;
      const dist = this.egg.radius + 38 + Math.sin(this.stats.raceTime * 2.5 + i) * 14;
      const cx = Math.cos(angle) * dist;
      const cy = Math.sin(angle) * dist;

      const fGlow = 0.25 + Math.sin(this.stats.raceTime * 4 + i * 0.8) * 0.15;
      ctx.fillStyle = `rgba(251, 191, 36, ${Math.max(0.1, fGlow)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Zona Pellucida (Thick protective outer shell with breathing pulsation)
    const eggPulse = Math.sin(this.stats.raceTime * 2.8) * 3;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 18;
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 35 + Math.sin(this.stats.raceTime * 3) * 10;
    ctx.beginPath();
    ctx.arc(0, 0, this.egg.radius + eggPulse, 0, Math.PI * 2);
    ctx.stroke();

    // 2.5. Punch Impact Zone: Membrane dent & cracking fissures under baby punch assault!
    if (this.state === 'fertilizing' || this.player.isPunching || this.player.drillProgress > 0) {
      const progress = this.player.drillProgress / 100;
      const punchDent = Math.sin(this.player.punchPhase || 0) * 4;

      // Membrane shock ripples where baby punches strike
      ctx.save();
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 15;
      [-18, 0, 18].forEach((offsetY, idx) => {
        const ripplePhase = ((this.player.punchPhase || 0) + idx * 1.5) % (Math.PI * 2);
        const rSize = 8 + (ripplePhase / (Math.PI * 2)) * 22;
        ctx.beginPath();
        ctx.arc(-this.egg.radius + 6, offsetY, rSize, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();
      });

      // Fissure cracks forming in the Zona Pellucida membrane as punch damage accumulates
      if (progress > 0.15) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.0;
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 10;
        ctx.beginPath();

        // Primary crack
        ctx.moveTo(-this.egg.radius, 0);
        ctx.lineTo(-this.egg.radius + 12 * Math.min(1, progress * 1.5), -6);
        ctx.lineTo(-this.egg.radius + 24 * Math.min(1, progress * 1.3), -2);
        if (progress > 0.4) {
          ctx.lineTo(-this.egg.radius + 38 * Math.min(1, progress * 1.1), -10);
        }

        // Secondary fork crack
        if (progress > 0.3) {
          ctx.moveTo(-this.egg.radius + 12, -6);
          ctx.lineTo(-this.egg.radius + 20, 8);
          ctx.lineTo(-this.egg.radius + 32, 14);
        }

        // Tertiary deep crack breaking into cytoplasm
        if (progress > 0.65) {
          ctx.moveTo(-this.egg.radius, 12);
          ctx.lineTo(-this.egg.radius + 18, 16);
          ctx.lineTo(-this.egg.radius + 36, 6);
          ctx.lineTo(-this.egg.radius + 48, 10);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Inner Ovum Core (Cytoplasm with animated swirling currents)
    const eggGrad = ctx.createRadialGradient(
      Math.cos(this.stats.raceTime) * 15,
      Math.sin(this.stats.raceTime) * 15,
      40,
      0,
      0,
      this.egg.radius
    );
    eggGrad.addColorStop(0, '#fef08a');
    eggGrad.addColorStop(0.4, '#fbbf24');
    eggGrad.addColorStop(0.8, '#d97706');
    eggGrad.addColorStop(1, '#92400e');

    ctx.fillStyle = eggGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.egg.radius - 8, 0, Math.PI * 2);
    ctx.fill();

    // 4. Female Pronucleus (Pulsing with maternal chromosomes)
    const nucX = 40 + Math.sin(this.stats.raceTime * 1.5) * 6;
    const nucY = -30 + Math.cos(this.stats.raceTime * 1.5) * 6;
    const nucPulse = 1 + Math.sin(this.stats.raceTime * 3) * 0.05;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.arc(nucX, nucY, 75 * nucPulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#451a03';
    ctx.font = 'bold 22px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('THE OVUM', 0, 0);

    ctx.font = '14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Zona Pellucida Membrane', 0, 30);

    // Punch breach progress ring if player is at the egg
    if (this.state === 'fertilizing') {
      const progress = this.player.drillProgress / 100;
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 14;
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, this.egg.radius + 16, Math.PI * 0.8, Math.PI * 0.8 + progress * Math.PI * 0.4);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawSwimmer(ctx: CanvasRenderingContext2D, swimmer: Swimmer) {
    if (swimmer.x < this.cameraX - 100 || swimmer.x > this.cameraX + this.visibleWidth + 100) return;

    ctx.save();

    // Scale player sperm bigger than AI rivals (1.5x larger head and tail for superior visibility!)
    const scale = swimmer.isPlayer ? 1.55 : 1.0;

    // 0. High-Visibility Player Beacon Reticle (Instantly locates player in dense crowds)
    if (swimmer.isPlayer && swimmer.health > 0) {
      ctx.save();
      const beaconPulse = 1 + Math.sin(this.stats.raceTime * 6) * 0.12;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(swimmer.x, swimmer.y, 32 * beaconPulse, 0, Math.PI * 2);
      ctx.stroke();

      // Targeting crosshair tick marks
      const r1 = 30 * beaconPulse;
      const r2 = 38 * beaconPulse;
      [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((a) => {
        ctx.beginPath();
        ctx.moveTo(swimmer.x + Math.cos(a) * r1, swimmer.y + Math.sin(a) * r1);
        ctx.lineTo(swimmer.x + Math.cos(a) * r2, swimmer.y + Math.sin(a) * r2);
        ctx.stroke();
      });
      ctx.restore();
    }

    // 1. Draw Luminous Runner Sprint Slipstream Wake
    if (swimmer.tailNodes.length > 1) {
      ctx.strokeStyle = swimmer.trailColor;
      ctx.lineWidth = swimmer.isPlayer ? 5.5 : 3.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      const wakeStartX = swimmer.x - Math.cos(swimmer.angle) * (swimmer.isPlayer ? 22 : 14);
      const wakeStartY = swimmer.y - Math.sin(swimmer.angle) * (swimmer.isPlayer ? 22 : 14);
      ctx.moveTo(wakeStartX, wakeStartY);
      for (let i = 0; i < swimmer.tailNodes.length; i++) {
        const node = swimmer.tailNodes[i];
        ctx.lineTo(node.x, node.y);
      }
      ctx.stroke();

      // Inner glowing streamline of the sprint wake
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = swimmer.isPlayer ? 2.0 : 1.2;
      ctx.beginPath();
      ctx.moveTo(wakeStartX, wakeStartY);
      for (let i = 0; i < Math.min(swimmer.tailNodes.length, 9); i++) {
        ctx.lineTo(swimmer.tailNodes[i].x, swimmer.tailNodes[i].y);
      }
      ctx.stroke();
    }

    // 2. Draw Actual Baby Running the Race
    ctx.translate(swimmer.x, swimmer.y);
    ctx.rotate(swimmer.angle);
    ctx.scale(scale, scale);

    // Glow aura
    ctx.shadowColor = swimmer.glowColor;
    ctx.shadowBlur = swimmer.isPlayer ? 24 : 8;

    const runPhase = swimmer.tailWigglePhase;
    const isEliminated = swimmer.health <= 0;
    const isBoosting = swimmer.boosting;

    // Determine if this baby has reached the egg to punch!
    const isAtEgg = !isEliminated && (
      (swimmer.isPlayer && this.state === 'fertilizing') ||
      Boolean(swimmer.isPunching) ||
      swimmer.drillProgress > 0 ||
      swimmer.x >= this.egg.x - this.egg.radius - 28
    );
    const punchPhase = swimmer.punchPhase ?? (this.stats.raceTime * 22);

    // Dynamic Procedural Gait calculations for baby runner
    const gait = swimmer.gait || this.calculateProceduralGait(swimmer, 0.016);

    // Athletic Toddler Running & Punching Cycle Angles
    const leg1Angle = isAtEgg ? Math.sin(punchPhase * 0.5) * 0.45 : Math.sin(runPhase) * (isEliminated ? 0 : gait.strideAmplitude);
    const leg2Angle = isAtEgg ? Math.sin(punchPhase * 0.5 + Math.PI) * 0.45 : Math.sin(runPhase + Math.PI) * (isEliminated ? 0 : gait.strideAmplitude);
    const arm1Angle = Math.sin(runPhase + Math.PI) * (isEliminated ? 0 : gait.armSwingTorque);
    const arm2Angle = Math.sin(runPhase) * (isEliminated ? 0 : gait.armSwingTorque);

    // Rhythmic running bob vs rapid boxer punch bounce
    const runBob = isEliminated ? 0 : isAtEgg ? Math.sin(punchPhase) * 2.2 : Math.sin(runPhase * 2) * (gait.gaitType === 'exhausted' ? 2.2 : 1.5);

    // Palette
    const skinTone = '#fed7aa';
    const skinShade = '#fba372';
    const diaperColor = '#ffffff';
    const onesieColor = swimmer.color || '#38bdf8';
    const tabColor = swimmer.chromosome === 'X' ? '#f472b6' : '#38bdf8';

    // Helper: Draw Baby Running Leg with Sneaker and Procedural Knee Lift & Heel Kick
    const drawRunningLeg = (hipX: number, hipY: number, legAngle: number, isBackLeg: boolean) => {
      ctx.save();
      ctx.translate(hipX, hipY + gait.shoulderDrop * 0.35);
      ctx.rotate(legAngle * 0.7);

      // Chubby Thigh
      ctx.fillStyle = skinTone;
      ctx.strokeStyle = skinShade;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(-3.5, 0, 5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Knee & Chubby Calf with procedural knee lift and heel kick
      ctx.save();
      ctx.translate(-6.5, 0);
      const rawBend = isBackLeg
        ? (legAngle < 0 ? -legAngle * gait.heelKick : legAngle * gait.kneeLift)
        : (legAngle > 0 ? legAngle * gait.kneeLift : -legAngle * gait.heelKick);
      const kneeBend = Math.max(0, rawBend);
      ctx.rotate(kneeBend);

      ctx.beginPath();
      ctx.ellipse(-3, 0, 4, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // White Ankle Sock
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.rect(-6, -2.5, 2.5, 5);
      ctx.fill();

      // Baby Running Sneaker (Chubby shoe with rubber sole & laces)
      ctx.save();
      ctx.translate(-7, 0);

      // Sneaker Upper Body
      ctx.fillStyle = onesieColor;
      ctx.beginPath();
      ctx.ellipse(-2.5, 0, 4.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rubber Sole
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-7, -2.8, 2.5, 5.6, 1.2);
      ctx.fill();

      // Tiny Sneaker Lace details
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-2, -1.8);
      ctx.lineTo(-2, 1.8);
      ctx.moveTo(-4, -1.8);
      ctx.lineTo(-4, 1.8);
      ctx.stroke();

      ctx.restore(); // Sneaker
      ctx.restore(); // Calf
      ctx.restore(); // Hip
    };

    // Helper: Draw Baby Pumping Arm with Clenched Running Fist
    const drawRunningArm = (shoulderX: number, shoulderY: number, armAngle: number) => {
      ctx.save();
      ctx.translate(shoulderX, shoulderY + gait.shoulderDrop);
      ctx.rotate(armAngle * 0.8);

      // Chubby Upper Arm
      ctx.fillStyle = skinTone;
      ctx.strokeStyle = skinShade;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(3, 0, 4.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Forearm & Clenched Fist
      ctx.save();
      ctx.translate(5.5, 0);
      const elbowAngle = gait.gaitType === 'sprint' ? -0.75 : (gait.gaitType === 'exhausted' ? -0.22 : -0.5);
      ctx.rotate(elbowAngle);

      ctx.beginPath();
      ctx.ellipse(3, 0, 3.5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Clenched Baby Fist with knuckles
      ctx.fillStyle = skinTone;
      ctx.beginPath();
      ctx.arc(6, 0, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Knuckle crease
      ctx.strokeStyle = skinShade;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(5.5, -1.5);
      ctx.lineTo(5.5, 1.5);
      ctx.stroke();

      ctx.restore(); // Forearm
      ctx.restore(); // Shoulder
    };

    // Helper: Draw Baby Punching Arm (rapid boxing jabs & hooks straight into the egg!)
    const drawPunchingArm = (shoulderX: number, shoulderY: number, punchCycle: number) => {
      ctx.save();
      ctx.translate(shoulderX, shoulderY);

      // Forward punching extension
      const sinVal = Math.sin(punchCycle);
      const extension = Math.max(0, sinVal); // 0 (retracted) to 1 (full forward extension)
      const forwardReach = extension * 17; // Long baby reach right into the egg membrane!
      const verticalOffset = Math.cos(punchCycle) * 1.8;

      // Chubby Upper Arm thrusting forward
      ctx.fillStyle = skinTone;
      ctx.strokeStyle = skinShade;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(2.5 + forwardReach * 0.35, verticalOffset * 0.3, 4.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Forearm & Clenched Punching Fist
      ctx.save();
      ctx.translate(5.5 + forwardReach * 0.7, verticalOffset * 0.6);

      ctx.beginPath();
      ctx.ellipse(3.5, 0, 4.2, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Clenched Boxing Baby Fist with tape wraps
      const fistX = 7.5;
      const fistY = 0;

      // Boxer white tape wrap
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.rect(fistX - 3.5, fistY - 3, 3.2, 6);
      ctx.fill();

      // Clenched baby boxing fist
      ctx.fillStyle = skinTone;
      ctx.strokeStyle = skinShade;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(fistX, fistY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Knuckle lines
      ctx.strokeStyle = skinShade;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(fistX - 0.5, fistY - 2.2);
      ctx.lineTo(fistX - 0.5, fistY + 2.2);
      ctx.moveTo(fistX + 1.2, fistY - 1.8);
      ctx.lineTo(fistX + 1.2, fistY + 1.8);
      ctx.stroke();

      // Motion speed streaks behind the punch when striking forward
      if (extension > 0.55) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(fistX - 12, fistY - 2);
        ctx.lineTo(fistX - 4, fistY - 2);
        ctx.moveTo(fistX - 15, fistY);
        ctx.lineTo(fistX - 4, fistY);
        ctx.moveTo(fistX - 11, fistY + 2);
        ctx.lineTo(fistX - 4, fistY + 2);
        ctx.stroke();
      }

      // Punch impact star right at the fist knuckle when fully extended!
      if (extension > 0.86) {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        const tipX = fistX + 4.2;
        const tipY = fistY;
        for (let s = 0; s < 5; s++) {
          const a = (s * Math.PI * 2) / 5;
          const r1 = 5.0;
          const r2 = 2.2;
          ctx.lineTo(tipX + Math.cos(a) * r1, tipY + Math.sin(a) * r1);
          ctx.lineTo(tipX + Math.cos(a + Math.PI / 5) * r2, tipY + Math.sin(a + Math.PI / 5) * r2);
        }
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore(); // Forearm
      ctx.restore(); // Shoulder
    };

    // LAYER 1: Back (Top) Leg (running or bracing for punches)
    drawRunningLeg(-8, -6, leg1Angle, true);

    // LAYER 2: Back (Top) Arm (pumping while running, or rapid jabs when at egg)
    if (isAtEgg) {
      drawPunchingArm(2, -4.5, punchPhase);
    } else {
      drawRunningArm(0, -6, arm1Angle);
    }

    // LAYER 3: Baby Torso & Puffy Diaper
    ctx.save();
    ctx.translate(runBob * 0.4, gait.shoulderDrop * 0.4);
    ctx.rotate(gait.torsoLean + gait.waddleRoll);

    // Chubby Torso / Tummy
    ctx.fillStyle = onesieColor;
    ctx.beginPath();
    ctx.ellipse(-2, 0, 9.5, 7.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sporty White Side Stripes on Runner Onesie
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-2, 0, 6.8, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();

    // Puffy White Diaper at Hips
    ctx.fillStyle = diaperColor;
    ctx.beginPath();
    ctx.moveTo(-4, -6.5);
    ctx.quadraticCurveTo(-14, -7.5, -16, 0);
    ctx.quadraticCurveTo(-14, 7.5, -4, 6.5);
    ctx.closePath();
    ctx.fill();

    // Diaper subtle 3D shadow crease
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-11, -5.5);
    ctx.quadraticCurveTo(-13.5, 0, -11, 5.5);
    ctx.stroke();

    // Diaper Pastel Tape Tabs
    ctx.fillStyle = tabColor;
    ctx.fillRect(-7, -6.8, 3.5, 1.8);
    ctx.fillRect(-7, 5.0, 3.5, 1.8);

    // Chest Racing Bib / Badge (#1 for Player, Chromosome for Rivals)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(1, 0, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = tabColor;
    ctx.lineWidth = 1.0;
    ctx.stroke();

    ctx.fillStyle = swimmer.isPlayer ? '#eab308' : '#0f172a';
    ctx.font = 'bold 6.5px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(swimmer.isPlayer ? '#1' : swimmer.chromosome, 1.2, 0.3);

    ctx.restore(); // Torso & Diaper

    // LAYER 4: Front (Bottom) Leg (running or bracing for punches)
    drawRunningLeg(-8, 6, leg2Angle, false);

    // LAYER 5: Front (Bottom) Arm (pumping while running, or rapid crosses when at egg)
    if (isAtEgg) {
      drawPunchingArm(2, 4.5, punchPhase + Math.PI);
    } else {
      drawRunningArm(0, 6, arm2Angle);
    }

    // LAYER 6: Chubby Baby Head & Expressions
    ctx.save();
    ctx.translate(8 + runBob * 0.6 + gait.headBobOffset.x, gait.shoulderDrop * 0.7 + gait.headBobOffset.y);
    ctx.rotate(gait.headTilt);

    // Base Chubby Head
    const headGrad = ctx.createRadialGradient(2, -1, 2, 0, 0, 10);
    headGrad.addColorStop(0, '#fff1e8');
    headGrad.addColorStop(0.65, skinTone);
    headGrad.addColorStop(1, '#fdba74');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9.5, 8.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rosy Blushing Cheeks (expand with panting breath if exhausted)
    const cheekPuff = (!isEliminated && gait.gaitType === 'exhausted') ? Math.sin(runPhase * 2.5) * 0.7 : 0;
    ctx.fillStyle = 'rgba(244, 63, 94, 0.45)';
    ctx.beginPath();
    ctx.ellipse(1, -5.2, 2.6 + cheekPuff, 1.9 + cheekPuff * 0.6, 0, 0, Math.PI * 2);
    ctx.ellipse(1, 5.2, 2.6 + cheekPuff, 1.9 + cheekPuff * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Athlete Runner Sweatband & Beanie
    ctx.fillStyle = onesieColor;
    ctx.beginPath();
    ctx.arc(-2.5, 0, 8.6, Math.PI * 0.52, Math.PI * 1.48);
    ctx.quadraticCurveTo(-1.5, 0, -2.5, 8.6 * Math.sin(Math.PI * 0.52));
    ctx.fill();

    // Crisp white sweatband stripe
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-2.5, 0, 8.6, Math.PI * 0.52, Math.PI * 1.48);
    ctx.stroke();

    // Beanie fluffy white pom-pom
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-11, 0, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Curly tuft of baby hair peeking over brow
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(2, -5.5, 2.2, 0.2, Math.PI * 1.3);
    ctx.stroke();

    // Expressive Baby Runner Eyes
    if (isEliminated) {
      // Knocked out / Eliminated: comical spiral X_X eyes
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.6;
      [-3.3, 3.3].forEach((eyeY) => {
        ctx.beginPath();
        ctx.moveTo(1.2, eyeY - 2);
        ctx.lineTo(4.5, eyeY + 2);
        ctx.moveTo(4.5, eyeY - 2);
        ctx.lineTo(1.2, eyeY + 2);
        ctx.stroke();
      });
    } else {
      // Living: Wide, fiercely determined anime baby runner eyes, dropping eyelid when fatigued/exhausted
      [-3.3, 3.3].forEach((eyeY) => {
        // Determined toddler runner brow angled forward (extra fierce combat angle when punching the egg, sad droop when exhausted!)
        ctx.strokeStyle = isAtEgg ? '#b91c1c' : (gait.gaitType === 'exhausted' ? '#78350f' : '#9a3412');
        ctx.lineWidth = isAtEgg ? 1.6 : 1.2;
        ctx.beginPath();
        if (isAtEgg) {
          // Fierce V-shaped boxing brow
          ctx.moveTo(0.8, eyeY - 3.4 * Math.sign(eyeY));
          ctx.lineTo(4.8, eyeY - 0.6 * Math.sign(eyeY));
        } else if (gait.gaitType === 'exhausted') {
          // Weary, drooped, tired brow
          ctx.moveTo(1.2, eyeY - 1.2 * Math.sign(eyeY));
          ctx.lineTo(4.2, eyeY - 2.8 * Math.sign(eyeY));
        } else {
          ctx.moveTo(1.2, eyeY - 2.8 * Math.sign(eyeY));
          ctx.lineTo(4.2, eyeY - 1.2 * Math.sign(eyeY));
        }
        ctx.stroke();

        // Big dark pupil
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(2.8, eyeY, 2.3, 0, Math.PI * 2);
        ctx.fill();

        // Big bright glossy highlight dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(3.6, eyeY - 0.7, 0.95, 0, Math.PI * 2);
        ctx.fill();

        // Secondary twinkle glint
        ctx.beginPath();
        ctx.arc(2.1, eyeY + 0.7, 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Heavy fatigue: droopy upper eyelid covering eye
        if (gait.eyeDroop > 0.15 && !isAtEgg) {
          ctx.fillStyle = skinTone;
          const droopCover = Math.min(2.8, gait.eyeDroop * 3.0);
          ctx.beginPath();
          ctx.rect(0.5, eyeY - 2.8, 5.0, droopCover);
          ctx.fill();
          // Eyelid fold line
          ctx.strokeStyle = '#9a3412';
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(0.8, eyeY - 2.8 + droopCover);
          ctx.lineTo(4.8, eyeY - 2.8 + droopCover);
          ctx.stroke();
        }
      });
    }

    // Baby Runner Pacifier / Acrosome Cap
    const pacifierColor = swimmer.isPlayer ? '#38bdf8' : swimmer.color;
    const pacifierBreathOffset = (!isEliminated && !isAtEgg && gait.gaitType === 'exhausted')
      ? Math.sin(runPhase * 2.5) * 1.0
      : 0;

    // Pacifier base shield
    ctx.fillStyle = pacifierColor;
    ctx.beginPath();
    ctx.ellipse(9.2 + pacifierBreathOffset, 0, 2.2, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pacifier button center
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(10.2 + pacifierBreathOffset, 0, 2.0, 0, Math.PI * 2);
    ctx.fill();

    // Pacifier handle loop (swinging playfully or vibrating with punches)
    ctx.strokeStyle = pacifierColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const handleWiggle = isAtEgg ? Math.sin(punchPhase * 2) * 1.2 : 0;
    ctx.arc(12.2 + pacifierBreathOffset, handleWiggle, 2.4, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    // Bioluminescent acrosome rim on pacifier (glows intensely when drilling / punching)
    if (swimmer.isPlayer) {
      const { accentR, accentG, accentB } = this.playerLight;
      ctx.strokeStyle = `rgba(${Math.round(accentR)}, ${Math.round(accentG)}, ${Math.round(accentB)}, 0.9)`;
      ctx.lineWidth = isAtEgg ? 2.2 : 1.6;
      ctx.beginPath();
      ctx.ellipse(9.2, 0, 2.6, 5.2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Flying cartoon sweat droplets when sprinting or furiously punching or heavily exhausted
    if (!isEliminated && (isBoosting || isAtEgg || gait.gaitType === 'exhausted')) {
      ctx.fillStyle = '#38bdf8';
      if (isAtEgg) {
        // Sweat droplets flying off both temples during rapid boxing punches
        const sw1Y = -9 - Math.abs(Math.sin(punchPhase)) * 3;
        const sw2Y = 9 + Math.abs(Math.cos(punchPhase)) * 3;
        ctx.beginPath();
        ctx.arc(0, sw1Y, 1.4, 0, Math.PI * 2);
        ctx.arc(-3, sw1Y - 2, 1.0, 0, Math.PI * 2);
        ctx.arc(0, sw2Y, 1.4, 0, Math.PI * 2);
        ctx.arc(-3, sw2Y + 2, 1.0, 0, Math.PI * 2);
        ctx.fill();
      } else if (gait.gaitType === 'exhausted') {
        // Heavy exhaustion sweat droplets dripping and flicking off brow
        const swLag = Math.sin(runPhase * 1.5) * 2;
        ctx.beginPath();
        ctx.arc(-2, -9 + swLag, 1.8, 0, Math.PI * 2);
        ctx.arc(3, -11 + swLag, 1.2, 0, Math.PI * 2);
        ctx.arc(-2, 9 - swLag, 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(-2, -9, 1.4, 0, Math.PI * 2);
        ctx.arc(-4, -11, 1.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore(); // Head

    // Active Power-Up Auras
    // 1. Shield Forcefield Bubble (if active)
    if (swimmer.shieldTimer > 0) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Capacitation Aura (Hyper-motile purple ring)
    if (swimmer.capacitationTimer && swimmer.capacitationTimer > 0) {
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Magnet Pull Aura (Cyan vortex ring)
    if (swimmer.magnetTimer && swimmer.magnetTimer > 0) {
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 4. Multiplier Aura (Golden spark)
    if (swimmer.scoreMultiplierTimer && swimmer.scoreMultiplierTimer > 0) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. Slipstream Drafting Wind Streamers
    if (swimmer.drafting) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      // Upper slipstream arc
      ctx.moveTo(-18, -14);
      ctx.quadraticCurveTo(0, -18, 16, -8);
      // Lower slipstream arc
      ctx.moveTo(-18, 14);
      ctx.quadraticCurveTo(0, 18, 16, 8);
      ctx.stroke();
    }

    // 6. Mitochondrial Overcharge Fiery Inferno Halo
    if (swimmer.overcharging) {
      const heat = swimmer.overchargeHeat || 1;
      ctx.save();
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 18 * heat;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.4 * heat;
      const jitter = (Math.random() - 0.5) * 2;
      ctx.beginPath();
      ctx.arc(0, 0, 24 + jitter, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 19 - jitter, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 7. Stumble Dizziness Orbiting Stars
    if ((swimmer.stumbleTimer ?? 0) > 0) {
      const phase = (performance.now() / 140);
      ctx.save();
      ctx.translate(6, -16);
      for (let s = 0; s < 3; s++) {
        const starAngle = phase + (s * Math.PI * 2) / 3;
        const starX = Math.cos(starAngle) * 9;
        const starY = Math.sin(starAngle) * 4;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(starX, starY, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 8. Sluggish Obstacle Sticky Slime & Snagged Threads
    if ((swimmer.slowTimer ?? 0) > 0) {
      ctx.save();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      // Tangled strands across body
      ctx.moveTo(-16, -9);
      ctx.quadraticCurveTo(-6, 0, -16, 9);
      ctx.moveTo(-10, -8);
      ctx.lineTo(8, 6);
      ctx.stroke();

      // Dripping sticky slime beads
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(-14, 10, 2.5, 0, Math.PI * 2);
      ctx.arc(2, 9, 2.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    // Name label & status above head (for player or prominent rivals)
    if (swimmer.isPlayer) {
      if (swimmer.health <= 0) {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💀 ELIMINATED', swimmer.x, swimmer.y - 28);
      } else {
        // High-Contrast "YOU" Downward Pointer Chevron & Floating Badge
        const chevronBob = Math.sin(this.stats.raceTime * 8) * 3;
        const tagY = swimmer.y - 42 + chevronBob;

        // Downward Arrow Pointer Chevron
        ctx.save();
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(swimmer.x, tagY + 16);
        ctx.lineTo(swimmer.x - 5, tagY + 10);
        ctx.lineTo(swimmer.x + 5, tagY + 10);
        ctx.closePath();
        ctx.fill();

        // "YOU" High-Contrast Badge Container
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(swimmer.x - 36, tagY - 6, 72, 16, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`★ YOU`, swimmer.x, tagY + 2);
        ctx.restore();

        // Dual Health & Stamina Mini-Meters with Crisp Frames
        const barW = 42;
        const barH = 4;
        const barX = swimmer.x - barW / 2;
        const meterY = swimmer.y - 18;

        // 1. Health Bar (Top mini-bar: Green/Red)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(barX, meterY - 6, barW, barH);
        ctx.fillStyle = swimmer.health > 40 ? '#22c55e' : '#ef4444';
        ctx.fillRect(barX, meterY - 6, barW * (swimmer.health / swimmer.maxHealth), barH);

        // 2. Stamina/ATP Bar (Bottom mini-bar: Cyan)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(barX, meterY, barW, barH);
        ctx.fillStyle = swimmer.stamina > 25 ? '#38bdf8' : '#f59e0b';
        ctx.fillRect(barX, meterY, barW * (swimmer.stamina / swimmer.maxStamina), barH);

        // Slowed warning pill above ATP bar
        if (swimmer.slowTimer && swimmer.slowTimer > 0) {
          const slowPct = Math.round((1 - (swimmer.slowFactor ?? 0.5)) * 100);
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`⚠️ SLOWED -${slowPct}% (${swimmer.slowReason || 'OBSTACLE'})`, swimmer.x, swimmer.y - 52);
        }
      }
    } else if (swimmer.health < swimmer.maxHealth) {
      // Rival health bar when damaged by shooter
      const barW = 28;
      const barH = 4;
      const barX = swimmer.x - barW / 2;
      const barY = swimmer.y - 18;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(barX, barY, barW * Math.max(0, swimmer.health / swimmer.maxHealth), barH);
    }
  }

  /**
   * Update the bioluminescent zone light that follows the player,
   * smoothly lerping its RGB colors and managing illuminated ambient motes.
   */
  private updatePlayerLight(dt: number) {
    if (!this.player) return;

    // Target color based on current zone
    const target = ZONE_LIGHT_PALETTES[this.currentZoneIndex] || ZONE_LIGHT_PALETTES[0];

    // Smooth organic lerp between zones (approx 0.6s smooth transition)
    const lerpSpeed = Math.min(1, dt * 3.5);
    this.playerLight.r += (target.r - this.playerLight.r) * lerpSpeed;
    this.playerLight.g += (target.g - this.playerLight.g) * lerpSpeed;
    this.playerLight.b += (target.b - this.playerLight.b) * lerpSpeed;
    this.playerLight.accentR += (target.accentR - this.playerLight.accentR) * lerpSpeed;
    this.playerLight.accentG += (target.accentG - this.playerLight.accentG) * lerpSpeed;
    this.playerLight.accentB += (target.accentB - this.playerLight.accentB) * lerpSpeed;

    // Flagellar motility speed drives the biological light breathing pulse
    const pulseRate = this.player.boosting ? 5.0 : 2.6;
    this.playerLight.pulsePhase += dt * pulseRate;

    // Harmonize player's own cellular glow aura with active zone light
    const cr = Math.round(this.playerLight.r);
    const cg = Math.round(this.playerLight.g);
    const cb = Math.round(this.playerLight.b);
    this.player.glowColor = `rgba(${cr}, ${cg}, ${cb}, 0.85)`;

    // Seed and manage floating biological motes in the illuminated halo
    if (this.playerLight.motes.length < 18) {
      this.playerLight.motes.push({
        x: this.player.x + (Math.random() - 0.5) * 220,
        y: this.player.y + (Math.random() - 0.5) * 220,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: 1.2 + Math.random() * 2.2,
        alpha: 0.35 + Math.random() * 0.45,
      });
    }

    const px = this.player.x;
    const py = this.player.y;
    for (const mote of this.playerLight.motes) {
      mote.x += mote.vx;
      mote.y += mote.vy;
      const d = Math.hypot(mote.x - px, mote.y - py);
      if (d > 260) {
        // Respawn near player along movement direction
        mote.x = px + (Math.random() - 0.5) * 160;
        mote.y = py + (Math.random() - 0.5) * 160;
        mote.vx = (Math.random() - 0.5) * 1.5;
        mote.vy = (Math.random() - 0.5) * 1.5;
      }
    }
  }

  /**
   * Renders the subtle glowing bioluminescent light following the player swimmer:
   * 1. Broad ambient colored illumination on the channel background, rugae folds & fluid
   * 2. Directional forward-projecting acrosome beam (cellular headlight)
   * 3. Floating luminous biological motes catching the player's aura
   * 4. Inner cellular corona embracing the sperm head & mitochondrial engine
   */
  private drawPlayerZoneLight(ctx: CanvasRenderingContext2D) {
    if (!this.player) return;

    const px = this.player.x;
    const py = this.player.y;
    const pAngle = this.player.angle;
    const { r, g, b, accentR, accentG, accentB, pulsePhase } = this.playerLight;
    const cr = Math.round(r);
    const cg = Math.round(g);
    const cb = Math.round(b);
    const ar = Math.round(accentR);
    const ag = Math.round(accentG);
    const ab = Math.round(accentB);

    // Boost and capacitation expand the light radius and luminance
    const boostBoost = this.player.boosting ? 1.25 : (this.player.capacitationTimer > 0 ? 1.2 : 1.0);
    const pulse = (1 + Math.sin(pulsePhase) * 0.08) * boostBoost;
    const ambientRadius = 260 * pulse;

    ctx.save();

    // 1. Broad Ambient Zone Bioluminescent Glow (illuminates biological canal, rugae folds & fluid)
    const ambientGrad = ctx.createRadialGradient(px, py, 15, px, py, ambientRadius);
    ambientGrad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${0.28 * boostBoost})`);
    ambientGrad.addColorStop(0.32, `rgba(${cr}, ${cg}, ${cb}, ${0.16 * boostBoost})`);
    ambientGrad.addColorStop(0.68, `rgba(${cr}, ${cg}, ${cb}, ${0.05 * boostBoost})`);
    ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = ambientGrad;
    ctx.beginPath();
    ctx.arc(px, py, ambientRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Directional Acrosome Illumination Cone (forward-projecting headlight into the canal)
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(pAngle);

    const beamDist = 72;
    const beamRadiusX = 135 * pulse;
    const beamRadiusY = 70 * pulse;
    const beamGrad = ctx.createRadialGradient(beamDist * 0.4, 0, 8, beamDist, 0, beamRadiusX);
    beamGrad.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, ${0.24 * boostBoost})`);
    beamGrad.addColorStop(0.45, `rgba(${cr}, ${cg}, ${cb}, ${0.12 * boostBoost})`);
    beamGrad.addColorStop(0.85, `rgba(${cr}, ${cg}, ${cb}, ${0.03 * boostBoost})`);
    beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.ellipse(beamDist, 0, beamRadiusX, beamRadiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Floating Bioluminescent Fluid Motes catching the player's zone light
    for (const mote of this.playerLight.motes) {
      const dist = Math.hypot(mote.x - px, mote.y - py);
      if (dist < ambientRadius) {
        const falloff = 1 - (dist / ambientRadius);
        ctx.fillStyle = `rgba(${ar}, ${ag}, ${ab}, ${mote.alpha * falloff * 0.85})`;
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Subtle Inner Cellular Bioluminescent Corona (hugging the sperm head & mitochondria)
    const coreRadius = 65 * pulse;
    const coreGrad = ctx.createRadialGradient(px, py, 6, px, py, coreRadius);
    coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.45 * boostBoost})`);
    coreGrad.addColorStop(0.35, `rgba(${ar}, ${ag}, ${ab}, ${0.32 * boostBoost})`);
    coreGrad.addColorStop(0.75, `rgba(${cr}, ${cg}, ${cb}, ${0.12 * boostBoost})`);
    coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(px, py, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D) {
    this.projectiles.forEach((proj) => {
      ctx.save();
      const pAngle = Math.atan2(proj.vy, proj.vx);
      ctx.translate(proj.x, proj.y);
      ctx.rotate(pAngle);

      // Outer plasma glow
      ctx.shadowColor = proj.glowColor;
      ctx.shadowBlur = 12;

      // Elongated aerodynamic dart shape
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.moveTo(proj.radius * 1.6, 0);
      ctx.lineTo(-proj.radius, -proj.radius * 0.6);
      ctx.lineTo(-proj.radius * 0.5, 0);
      ctx.lineTo(-proj.radius, proj.radius * 0.6);
      ctx.closePath();
      ctx.fill();

      // Bright inner core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(proj.radius * 0.2, 0, proj.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    this.particles.forEach((pt) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, pt.alpha));

      if (pt.type === 'punch_pow' && pt.text) {
        // Comic action burst with comic text (e.g. "POW!", "BAM!", "WHAM!")
        ctx.translate(pt.x, pt.y);
        const popScale = 1 + (1 - pt.alpha) * 0.45;
        ctx.scale(popScale, popScale);

        // Comic jagged starburst backdrop
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        const spikes = 10;
        const outerR = pt.size * 1.35;
        const innerR = pt.size * 0.72;
        for (let i = 0; i < spikes; i++) {
          const a = (i * Math.PI * 2) / spikes - Math.PI / 2;
          ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
          const a2 = a + Math.PI / spikes;
          ctx.lineTo(Math.cos(a2) * innerR, Math.sin(a2) * innerR);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Bold comic action text with thick outline
        ctx.font = '900 13px "Outfit", "Impact", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3.5;
        ctx.strokeText(pt.text, 0, 0);
        ctx.fillStyle = '#ef4444';
        ctx.fillText(pt.text, 0, 0);
      } else if (pt.type === 'punch_wave') {
        // Expanding punch shockwave ring
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = 3.0 * pt.alpha;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        const radX = (1 - pt.alpha) * 32 + 6;
        const radY = (1 - pt.alpha) * 22 + 4;
        ctx.ellipse(pt.x, pt.y, radX, radY, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (pt.type === 'bump_star') {
        // Comic 4-point star for crowd collisions
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate((1 - pt.alpha) * 4);
        ctx.fillStyle = pt.color;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        const rOuter = pt.size;
        const rInner = pt.size * 0.35;
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const r = i % 2 === 0 ? rOuter : rInner;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (pt.type === 'overcharge_flame') {
        // Blazing teardrop flame particle
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.fillStyle = pt.color;
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, pt.size * pt.alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (pt.type === 'cilia_streak') {
        // Hydrodynamic velocity streak
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = 1.8 * pt.alpha;
        ctx.beginPath();
        ctx.moveTo(pt.x - 12, pt.y);
        ctx.lineTo(pt.x + 4, pt.y);
        ctx.stroke();
      } else if (pt.type === 'slime_glob') {
        // Viscous dripping slime / sludge glob
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.fillStyle = pt.color;
        ctx.shadowColor = '#d97706';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.ellipse(0, 0, pt.size * pt.alpha, pt.size * 0.7 * pt.alpha, 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Shiny specular glint
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(-pt.size * 0.25, -pt.size * 0.2, pt.size * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (pt.type === 'mesh_strand') {
        // Snapped elastic collagen strand fragment
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = 1.8 * pt.alpha;
        ctx.beginPath();
        ctx.moveTo(-pt.size, -pt.size * 0.5);
        ctx.quadraticCurveTo(0, pt.size * 0.3, pt.size, pt.size * 0.6);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }
}
