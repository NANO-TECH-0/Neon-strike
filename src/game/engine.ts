/**
 * Core Game Engine for 2D Open World Airplane Shooter
 * Independent of React to maintain high performance loop
 */

import type { AttackId, GameProgressEvent, PlaneId, SkillId } from "./progression";
import { playAttackSound, playSound, startMusic, stopMusic } from "./audio";

type Position = { x: number; y: number };
type Velocity = { vx: number; vy: number };

const ENEMY_SPRITE = [
  "....A...A....",
  "....C...C....",
  "....B...B....",
  "..BBBBBBBBB..",
  ".BBBBBBBBBBB.",
  "BBBBCCCCCCBBB",
  "BBEEBBBBBEEBB",
  "BBEEBBBBBEEBB",
  "BBBBBBBBBBBBB",
  ".BWW.BBB.WWB.",
  "..B..BBB..B..",
  "..B..BBB..B..",
  "..B.......B.."
];

const ENEMY_COLORS: Record<string, string> = {
  A: "#ffc34d",
  B: "#0878e8",
  C: "#17b6f5",
  E: "#ffe49a",
  W: "#ffffff"
};

const MAP_ENEMY_SPRITES = [
  ENEMY_SPRITE,
  [
    ".....CCCC.....",
    "...CCCCCCCC...",
    "..CCCCCCCCCC..",
    ".CCCCCWWCCCCC.",
    ".CCCCCCCCCCCC.",
    "..CCCCCCCCCC..",
    "...CCBBBBCC...",
    "....BBBBBB....",
    "...BB.BB.BB...",
    "..BB..BB..BB..",
    "..B...BB...B..",
    "......BB......",
    ".....B..B....."
  ],
  [
    "......GG......",
    ".....GGGG.....",
    "....GGGGGG....",
    "...GYYYYYYG...",
    "..GGYYYYYYGG..",
    ".GGGGGGGGGGGG.",
    "GGGGWWGGWWGGGG",
    "GGGGGGGGGGGGGG",
    ".GGGGGGGGGGGG.",
    "..GGGGBBGGGG..",
    "...GG.BB.GG...",
    "....G.BB.G.....",
    ".....G..G......"
  ],
  [
    ".....RRRR.....",
    "....RRRRRR....",
    "...RROOORRR...",
    "..RROOOOOORR..",
    ".RRROOOOOORRR.",
    "RRRRWWRRWWRRRR",
    "RRRROOOOOORRRR",
    ".RRRRRRRRRRRR.",
    "..RRRBBBBRRR..",
    "...RRBBBBRR...",
    "....R.BB.R....",
    "...R..BB..R...",
    "..R...BB...R.."
  ]
];

const MAP_ENEMY_COLORS: Record<string, string>[] = [
  ENEMY_COLORS,
  { C: "#13bcd5", B: "#0876a8", W: "#fff3c4" },
  { G: "#39a85a", Y: "#b9ed69", W: "#fff0a8", B: "#795037" },
  { R: "#e34c32", O: "#ff9b36", W: "#ffe8a3", B: "#782b31" }
];

const BOSS_SPRITE = [
  "RR...........RR",
  "RRGG.......GGRR",
  ".RGGGG...GGGGR.",
  "..GGGGGGGGGGG..",
  ".GGGYYYYYYYGGG.",
  "GGGYYPPPPYYYGGG",
  "GGYYPPPPPPPYYGG",
  "GGYYPPKPPPKYYGG",
  "GGYYPPPPPPPYYGG",
  ".GGGYYYYYYYGGG.",
  "..GGGGBBGGGG...",
  "...GGGBBGGG....",
  "....GGBBGG.....",
  ".....GBBG......"
];

const BOSS_COLORS: Record<string, string> = {
  R: "#ff4b8b",
  G: "#6828bc",
  Y: "#ffcf48",
  P: "#f24eaa",
  K: "#24183d",
  B: "#35e6ff"
};

const MAP_BOSS_SPRITES = [
  BOSS_SPRITE,
  [
    "......CCCC......",
    "....CCCCCCCC....",
    "...CCWWCCCCWWCC...",
    "..CCCCCCCCCCCCCC..",
    ".CCCCCCCCCCCCCCCC.",
    "CCCCCCBBBBBBCCCCCC",
    "CCCCBBBBBBBBBBCCCC",
    "CCCCCBBBBBBBBCCCCC",
    ".CCCCCCBBBBCCCCCC.",
    "..CCCCCBBBBCCCC...",
    "...CCCCBBBBCC......",
    "....CC..BB..CC.....",
    ".......BBBB.........",
    "......BB..BB........"
  ],
  [
    ".......GG.........",
    "......GGGG........",
    ".....GGYYYYG......",
    "....GGGYYYYYG.....",
    "...GGGGGGGGGGG....",
    "..GGGGGGGGGGGGG...",
    ".GGGGWWGGGWWGGGG.",
    "GGGGGGGGGGGGGGGGG",
    ".GGGGGGGGGGGGGGG.",
    "..GGGGGGGGGGGGG..",
    "...GGGGGBBGGGG...",
    "....GGGGBBGGG.....",
    "...GG...BB...GG...",
    "..GG....BB....GG.."
  ],
  [
    "......RRRR......",
    ".....RRRRRR.....",
    "....RROOOORR....",
    "...RROOOOOORR...",
    "..RROOOOOOOORR..",
    ".RRRRRRRRRRRRRR.",
    "RRRRRWWRRRWWRRRRR",
    "RRRRRRRRRRRRRRRRR",
    ".RRRRRRRRRRRRRR.",
    "..RRRRBBBBRRRR..",
    "...RRRBBBBRRR...",
    "....RR.BB.RR.....",
    "...RR..BB..RR....",
    "..RR...BB...RR..."
  ]
];

const MAP_BOSS_COLORS: Record<string, string>[] = [
  BOSS_COLORS,
  { C: "#13cfe5", W: "#fff3c4", B: "#0876a8" },
  { G: "#278a49", Y: "#d3f36b", W: "#fff0a8", B: "#795037" },
  { R: "#dc3f30", O: "#ff9b36", W: "#ffe8a3", B: "#782b31" }
];

export const MAP_NAMES = ["COSMOS", "OCEANO", "BOSQUE", "VOLCAN", "GLACIAR", "METROPOLIS", "CASCADA", "NUCLEO"];

const PLAYER_SPRITE = [
  "...............K...............",
  "..............KOK..............",
  ".............KOROK.............",
  "............KORRRRK............",
  "...........KWWKKKWWK...........",
  "..........KWCWKKWCK..........",
  ".........KWCWWKKWWCK.........",
  "........KWWCCCCCCCCWWK........",
  ".......KRRRRRRRRRRRRRRK.......",
  "......KROOOORRRRRROOOORK......",
  ".....KRRYYOORRRRRROOYYRRK.....",
  "..KKKRRRYYOORRRRRROOYYRRRKKK..",
  "KKKKRRRYYOORRRRRROOYYRRRKKKK",
  ".....KYYOOOKRRRRKOOOYYK.....",
  "......KYYOOKRRRRRKOOYYK......",
  ".......KBBKRRRRRKBBK.......",
  "........KBBKRRRKBBK........",
  ".........KBBKRBK.........",
  "..........KBGK..........",
  "..........KGK.........."
];

const PLAYER_COLORS: Record<string, string> = {
  K: "#15191d",
  W: "#f5f7f5",
  C: "#20c9db",
  R: "#f04432",
  O: "#ff8d35",
  Y: "#ffbd3e",
  B: "#168ce0",
  G: "#626b6e"
};

const MAP_PLAYER_SPRITES_EXTRA = [
  [
    ".............K.............",
    "............KPK............",
    "...........KPPPK...........",
    "..........KPPPAPK..........",
    ".........KPPPPPPPK.........",
    "......KKKPPPPPPPKKK......",
    "...KKKPPPPPPPPPPPPKKK...",
    "..KPPPPPPPPPPPPPPPPPK..",
    ".....KPPPPPKKPPPPPK.....",
    "......KPPPPWWPPPPPK......",
    ".......KPPPPWWPPPPK.......",
    "........KBBBBBBK........",
    ".........KBBBBK.........",
    "..........KBBK..........",
    "..........KGK.........."
  ],
  [
    ".............K.............",
    "............KAK............",
    "...........KAAAAK...........",
    "..........KAAWAAK..........",
    ".........KAAAAAAAK.........",
    "......KKKAAAAAAAAKKK......",
    "...KKKAAAAAAAAAAAAAAKKK...",
    "..KAAAAAAAAAAAAAAAAAAAAK..",
    ".....KAAAAAAKKAAAAAAK.....",
    "......KAAAAAWWAAAAAK......",
    ".......KAAAAWWAAAAK.......",
    "........KBBBBBBK........",
    ".........KBBBBK.........",
    "..........KBBK..........",
    "..........KGK.........."
  ]
];

const MAP_PLAYER_COLORS_EXTRA: Record<string, string>[] = [
  { K: "#161d2c", P: "#8b5cf6", A: "#4cc9f0", W: "#dfe7ff", B: "#3b4a71", G: "#728aa0" },
  { K: "#1c1d1d", A: "#f59e0b", W: "#fff1b8", B: "#6b7280", G: "#7ca5b5" }
];

const MAP_PLAYER_SPRITES = [
  PLAYER_SPRITE,
  [
    ".............K.............",
    "............KCK............",
    "...........KCCCK...........",
    "..........KCCWCCK..........",
    ".........KCCCCCCCK.........",
    "......KKKCCCCCCCKKK......",
    "...KKKCCCCCCCCCCCCCCKKK...",
    "..KCCCCCCCCCCCCCCCCCCCK..",
    ".....KCCCCCCKKCCCCCCK.....",
    "......KCCCCCWWCCCCCK......",
    ".......KCCCCWWCCCK.......",
    "........KBBBBBBK........",
    ".........KBBBBK.........",
    "..........KBBK..........",
    "..........KGK.........."
  ],
  [
    ".............K.............",
    "............KGK............",
    "...........KGGGK...........",
    "..........KGGYGK..........",
    ".........KGGGGGGK.........",
    "......KKKGGGGGGGKKK......",
    "...KKKGGGGGGGGGGGGGKKK...",
    "..KGGGGGGGGGGGGGGGGGGGK..",
    ".....KGGGGGGKKGGGGGGK.....",
    "......KGGGGGYYGGGGGK......",
    ".......KGGGGYYGGGGK.......",
    "........KBBBBBBK........",
    ".........KBBBBK.........",
    "..........KBBK..........",
    "..........KGK.........."
  ],
  [
    ".............K.............",
    "............KOK............",
    "...........KOROK...........",
    "..........KORRRRK..........",
    ".........KORRRRRRK.........",
    "......KKKRRRRRRRRRKKK......",
    "...KKKRRRRROOOORRRRRKKK...",
    "..KRRRRRRRROOOORRRRRRRRK..",
    ".....KRRRRRRKKRRRRRRK.....",
    "......KRRRRRWWRRRRRK......",
    ".......KRRRRWWRRRRK.......",
    "........KBBBBBBK........",
    ".........KBBBBK.........",
    "..........KBBK..........",
    "..........KGK.........."
  ],
  ...MAP_PLAYER_SPRITES_EXTRA
];

const MAP_PLAYER_COLORS: Record<string, string>[] = [
  PLAYER_COLORS,
  { K: "#10232b", C: "#20d8e8", W: "#d9ffff", B: "#0876a8", G: "#718c8d" },
  { K: "#18251a", G: "#39924d", Y: "#d3e873", W: "#fff2c4", B: "#70523a" },
  { K: "#2a1718", R: "#e34a32", O: "#ff9a36", W: "#ffe8a3", B: "#67282c", G: "#52575a" },
  ...MAP_PLAYER_COLORS_EXTRA
];

const PLANE_ORDER: PlaneId[] = ["viper", "manta", "wraith", "inferno", "phantom", "atlas"];

const METEORITE_COLORS = ["#bd6038", "#cc7042", "#d9824e", "#e38d58", "#a94a38"];
const METEORITE_CRATERS = [
  { x: -3, y: -2, width: 2.4, height: 1.7 },
  { x: 2, y: 1, width: 2.8, height: 2.2 },
  { x: -2, y: 4, width: 1.8, height: 1.4 },
  { x: 4, y: -4, width: 1.5, height: 1.4 },
  { x: -5, y: 2, width: 1.7, height: 1.3 }
];

interface Player extends Position, Velocity {
  radius: number;
  angle: number;
  speed: number;
  cooldown: number;
}

interface Bullet extends Position, Velocity {
  id: number;
  life: number;
  damage: number;
}

interface Coin extends Position {
  id: number;
  radius: number;
}

interface Enemy extends Position, Velocity {
  id: number;
  radius: number;
  hp: number;
  maxHp: number;
  type: number;
  cooldown: number;
  angle: number;
  isBoss: boolean;
  isCampaignBoss?: boolean;
  damageCooldown: number;
  attackWindup?: number;
  attackAimAngle?: number;
}

interface Obstacle extends Position {
  id: number;
  radius: number;
  color: string;
  vx: number;
  vy: number;
  explosive: boolean;
  directionChangeTimer: number;
}

interface PowerUp extends Position {
  id: number;
  type: 'speed' | 'shield' | 'bomb' | 'life';
  radius: number;
}

interface Particle extends Position, Velocity {
  id: number;
  life: number;
  maxLife: number;
  color: string;
}

interface EnemyBullet extends Position, Velocity {
  id: number;
  life: number;
  damage: number;
}

interface Portal extends Position {
  id: number;
  radius: number;
  targetMap: number;
}

interface PortalTransition {
  elapsed: number;
  duration: number;
  portal: Portal;
  mapChanged: boolean;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number = 0;
  
  // Game State
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private score: number = 0;
  private enemiesKilled: number = 0;
  private health: number = 200;
  private readonly MAX_HEALTH = 200;
  private lastDamageAmount = 0;
  private unlockedSkills = new Set<SkillId>();
  private laserEnergy: number = 0;
  private laserCooldown: number = 0;
  private waveCooldown: number = 0;
  private speedBoostActive: boolean = false;
  private speedBoostTime: number = 0;
  private shieldSkillCooldown: number = 0;
  private dashCooldown: number = 0;
  private barrageCooldown: number = 0;
  private readonly LASER_MAX_ENERGY = 100;
  private readonly LASER_COOLDOWN_TIME = 5; // seconds
  private readonly WAVE_COOLDOWN_TIME = 8; // seconds
  private shockwaves: { x: number, y: number, radius: number, life: number }[] = [];
  
  // Entities
  private player: Player;
  private bullets: Bullet[] = [];
  private coins: Coin[] = [];
  private enemyBullets: EnemyBullet[] = [];
  private enemies: Enemy[] = [];
  private obstacles: Obstacle[] = [];
  private portals: Portal[] = [];
  private portalTransition: PortalTransition | null = null;
  private powerUps: PowerUp[] = [];
  private particles: Particle[] = [];
  private deathAnimationTime: number | null = null;
  private readonly DEATH_ANIMATION_DURATION = 1.6;
  
  private mapIndex: number = 0;
  private campaignDifficulty = 0;
  private campaignMapIndex = 0;
  private campaignMode = false;
  private campaignBossActive = false;
  private bossIntroTime = 0;
  private pendingCampaignBossLevel: number | null = null;
  private shieldActive: boolean = false;
  private shieldTime: number = 0;
  private boostActive: boolean = false;
  private boostTime: number = 0;

  // Invincibility & hit feedback
  private invincibilityTime: number = 0;
  private readonly INVINCIBILITY_DURATION = 2.5; // seconds
  private hitFlashTimer: number = 0;
  private readonly HIT_FLASH_DURATION = 0.8;
  private damageTextTimer: number = 0;
  private nextHeartSpawn: number = 3; // separate fast heart spawn timer
  private pendingMegaBlast: boolean = false; // deferred blast after bullet loop
  
  // Input State
  private keys: Record<string, boolean> = {};
  private mousePos: Position = { x: 0, y: 0 };
  private isShooting: boolean = false;
  
  // World State
  private camera: Position = { x: 0, y: 0 };
  private width: number = 0;
  private height: number = 0;
  
  // Constants
  private readonly WORLD_BOUNDS = 10000;
  private PLAYER_SPEED = 400; // px per second
  private readonly BULLET_SPEED = 1000;
  private readonly ENEMY_SPEED = 200;
  private readonly FIRE_RATE = 0.15; // seconds
  private nextEnemySpawn = 1;
  private nextObstacleSpawn = 2;
  private nextPowerUpSpawn = 5;
  private nextPortalSpawn = 3;
  private nextPortalScore = 500;
  private enemyIdCounter = 0;
  private bossCount = 0;
  private nextBossScore = 500;
  private obstacleIdCounter = 0;
  private powerUpIdCounter = 0;
  private bulletIdCounter = 0;
  private particleIdCounter = 0;
  private portalIdCounter = 0;
  private coinIdCounter = 0;
  private coinsCollectedThisRun = 0;
  private selectedPlane: PlaneId = "viper";
  private selectedAttack: AttackId = "pulse";

  // Callbacks
  public onScoreUpdate?: (score: number) => void;
  public onGameOver?: (score: number) => void;
  public onProgressEvent?: (event: GameProgressEvent, amount: number) => void;
  public onCampaignBossDefeated?: () => void;
  public onBossAttackWarning?: (active: boolean) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2d context");
    this.ctx = ctx;

    this.player = {
      x: 0, y: 0, vx: 0, vy: 0,
      radius: 15, angle: 0, speed: this.PLAYER_SPEED, cooldown: 0
    };

    this.handleResize = this.handleResize.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    
    this.bindEvents();
    this.handleResize();
  }

  private bindEvents() {
    window.addEventListener("resize", this.handleResize);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("touchstart", this.handleTouchStart, { passive: false });
    this.canvas.addEventListener("touchmove", this.handleTouchMove, { passive: false });
    this.canvas.addEventListener("touchend", this.handleTouchEnd, { passive: false });
  }

  private handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    this.isShooting = true;
    this.updateTouchPos(e);
  }

  private handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    this.updateTouchPos(e);
  }

  private handleTouchEnd(e: TouchEvent) {
    e.preventDefault();
    this.isShooting = false;
  }

  private updateTouchPos(e: TouchEvent) {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      
      // On mobile, we also move toward the touch point
      const screenPlayerX = this.width / 2;
      const screenPlayerY = this.height / 2;
      const dx = this.mousePos.x - screenPlayerX;
      const dy = this.mousePos.y - screenPlayerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 20) {
        this.keys["KeyW"] = true; // Simulate forward movement
      } else if (this.mapIndex === 3) {
        this.keys["KeyW"] = false;
      }
    }
  }

  public cleanup() {
    this.stop();
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("touchstart", this.handleTouchStart);
    this.canvas.removeEventListener("touchmove", this.handleTouchMove);
    this.canvas.removeEventListener("touchend", this.handleTouchEnd);
  }

  private handleResize() {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  private handleKeyDown(e: KeyboardEvent) { this.keys[e.code] = true; }
  private handleKeyUp(e: KeyboardEvent) { this.keys[e.code] = false; }
  private handleMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  private handleMouseDown(e: MouseEvent) { 
    if (e.button === 0) this.isShooting = true; 
  }
  private handleMouseUp(e: MouseEvent) { 
    if (e.button === 0) this.isShooting = false; 
  }

  public start() {
    if (this.isRunning) return;
    playSound("start");
    startMusic();
    this.isRunning = true;
    this.score = 0;
    this.enemiesKilled = 0;
    this.health = this.MAX_HEALTH;
    this.laserEnergy = 0;
    this.laserCooldown = 0;
    this.waveCooldown = 0;
    this.shieldSkillCooldown = 0;
    this.dashCooldown = 0;
    this.barrageCooldown = 0;
    this.shockwaves = [];
    this.mapIndex = this.campaignMapIndex;
    this.invincibilityTime = 0;
    this.hitFlashTimer = 0;
    this.damageTextTimer = 0;
    this.nextHeartSpawn = 3;
    this.pendingMegaBlast = false;
    this.bossCount = 0;
    this.campaignBossActive = false;
    this.bossIntroTime = 0;
    this.pendingCampaignBossLevel = null;
    this.onBossAttackWarning?.(false);
    this.nextBossScore = 500;
    this.nextEnemySpawn = 1;
    this.nextObstacleSpawn = 2;
    this.nextPowerUpSpawn = 5;
    this.player.x = 0;
    this.player.y = 0;
    this.player.speed = 400;
    this.bullets = [];
    this.coins = [];
    this.coinsCollectedThisRun = 0;
    this.enemyBullets = [];
    this.enemies = [];
    this.obstacles = [];
    this.portals = [];
    this.portalTransition = null;
    this.deathAnimationTime = null;
    this.powerUps = [];
    this.particles = [];
    this.nextPortalSpawn = 3;
    this.nextPortalScore = 500;
    this.shieldActive = false;
    this.boostActive = false;
    this.speedBoostActive = false;
    this.speedBoostTime = 0;
    if (this.onScoreUpdate) this.onScoreUpdate(this.score);
    
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  public setLoadout(plane: PlaneId, attack: AttackId, skills: SkillId[] = []) {
    this.selectedPlane = plane;
    this.selectedAttack = attack;
    this.unlockedSkills = new Set(skills);
  }

  public setCampaignLevel(levelIndex: number, campaignMode = false) {
    this.campaignDifficulty = Math.max(0, levelIndex);
    this.campaignMapIndex = levelIndex % MAP_NAMES.length;
    this.campaignMode = campaignMode;
    this.campaignBossActive = false;
    this.bossIntroTime = 0;
    this.pendingCampaignBossLevel = null;
  }

  public beginCampaignBoss(levelIndex: number) {
    this.pendingCampaignBossLevel = Math.max(0, levelIndex);
    this.isShooting = false;
  }

  public changeCampaignMap(levelIndex: number) {
    this.mapIndex = levelIndex % MAP_NAMES.length;
    this.travelToMap();
  }

  public stop() {
    this.isRunning = false;
    stopMusic();
    cancelAnimationFrame(this.animationFrameId);
  }

  public pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    stopMusic();
    cancelAnimationFrame(this.animationFrameId);
  }

  public resume() {
    if (this.isRunning) return;
    this.isRunning = true;
    startMusic();
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  private loop(currentTime: number) {
    if (!this.isRunning) return;
    
    const dt = (currentTime - this.lastTime) / 1000; // delta time in seconds
    this.lastTime = currentTime;

    this.update(Math.min(dt, 0.1)); // Cap dt to prevent huge jumps
    this.draw();

    if (!this.isRunning) return;
    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  private takeDamage(particleColor: string = "white", damage = 20): boolean {
    // If invincible or shielded, ignore damage
    if (this.invincibilityTime > 0 || this.shieldActive) return false;
    playSound("damage");
    this.lastDamageAmount = Math.min(this.health, damage);
    this.health = Math.max(0, this.health - damage);
    this.invincibilityTime = this.INVINCIBILITY_DURATION;
    this.hitFlashTimer = this.HIT_FLASH_DURATION;
    this.damageTextTimer = 1.5;

    if (this.health <= 0) {
      playSound("death");
      stopMusic();
      this.spawnParticles(this.player.x, this.player.y, "white", 40);
      this.spawnParticles(this.player.x, this.player.y, "red", 30);
      this.spawnParticles(this.player.x, this.player.y, "#ff9d2e", 24);
      this.deathAnimationTime = 0;
      this.isShooting = false;
      return true; // dead
    }

    // Auto-shield for 4 seconds
    this.shieldActive = true;
    this.shieldTime = 4;

    // Schedule mega blast — executed AFTER current loop finishes (safe)
    this.pendingMegaBlast = true;

    return false;
  }

  // Executed safely outside of any entity iteration loop
  private executeMegaBlast() {
    const BLAST_RADIUS = 400;
    playSound("explosion");

    // 3 concentric shockwave rings
    this.shockwaves.push({ x: this.player.x, y: this.player.y, radius: 0, life: 1.8 });
    this.shockwaves.push({ x: this.player.x, y: this.player.y, radius: 0, life: 1.3 });
    this.shockwaves.push({ x: this.player.x, y: this.player.y, radius: 0, life: 0.9 });

    // Damage bosses and clear regular enemies within blast radius
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      if (Math.sqrt(dx * dx + dy * dy) < BLAST_RADIUS) {
        this.damageEnemy(i, e.isBoss ? 10 : 1, "orange");
      }
    }

    // Clear enemy bullets within blast radius
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      const dx = b.x - this.player.x;
      const dy = b.y - this.player.y;
      if (Math.sqrt(dx * dx + dy * dy) < BLAST_RADIUS) {
        this.enemyBullets.splice(i, 1);
      }
    }

    // Centered explosion particles
    this.spawnParticles(this.player.x, this.player.y, "orange", 25);
    this.spawnParticles(this.player.x, this.player.y, "white", 15);
    this.spawnParticles(this.player.x, this.player.y, "red", 15);
  }

  private spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 200 + 50;
      this.particles.push({
        id: this.particleIdCounter++,
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife: 1.0 + Math.random() * 0.5,
        color
      });
    }
  }

  private explodeMeteorite(meteorite: Obstacle) {
    playSound("meteor");
    this.shockwaves.push({ x: meteorite.x, y: meteorite.y, radius: 0, life: 0.6 });
    this.spawnParticles(meteorite.x, meteorite.y, "#ffb347", 18);
    this.spawnParticles(meteorite.x, meteorite.y, "#ed5938", 14);
    this.spawnParticles(meteorite.x, meteorite.y, "#fff0b3", 8);
  }

  private travelThroughPortal(portal: Portal) {
    this.mapIndex = portal.targetMap;
    this.nextPortalScore += 500;
    this.onProgressEvent?.("portal", 1);
    this.travelToMap();
  }

  private travelToMap() {
    this.portalTransition = null;
    this.player.x = 0;
    this.player.y = 0;
    this.camera.x = -this.width / 2;
    this.camera.y = -this.height / 2;
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.obstacles = [];
    this.powerUps = [];
    this.coins = [];
    this.portals = [];
    this.particles = [];
    this.shockwaves = [];
    this.nextPortalSpawn = 2;
    this.spawnParticles(this.player.x, this.player.y, "#63f7ff", 30);
    playSound("teleport");
  }

  private beginPortalTransition(portal: Portal) {
    playSound("portal");
    this.portalTransition = {
      elapsed: 0,
      duration: 1.4,
      portal: { ...portal },
      mapChanged: false
    };
    this.portals = [];
    this.isShooting = false;
  }

  private spawnBoss(isCampaignBoss = false) {
    playSound("bossIntro");
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.max(this.width, this.height) / 2 + 160;
    const level = this.bossCount + 1;
    const hp = 250 + (level - 1) * 150 + this.campaignDifficulty * 80;
    this.enemies.push({
      id: this.enemyIdCounter++,
      x: this.player.x + Math.cos(angle) * dist,
      y: this.player.y + Math.sin(angle) * dist,
      vx: 0,
      vy: 0,
      radius: 70 + Math.min(level * 4, 24),
      hp,
      maxHp: hp,
      type: level % 3,
      cooldown: 1.5,
      angle: 0,
      isBoss: true,
      isCampaignBoss,
      damageCooldown: 0
    });
    this.bossCount = level;
    this.nextBossScore += 500;
  }

  private fireEnemyAttack(enemy: Enemy, aimAngle: number) {
    playSound(enemy.isBoss ? "bossShot" : "enemyShot");
    const difficulty = this.campaignDifficulty;
    const bulletSpeed = 1 + difficulty * 0.08;
    if (this.mapIndex === 3) {
      enemy.angle = aimAngle;
      enemy.cooldown = (enemy.isBoss ? 3.1 : 2.5) / (1 + difficulty * 0.09);
    } else if (this.mapIndex === 2 || this.mapIndex === 4) {
      const bulletCount = enemy.isBoss ? 16 : 10;
      const speed = (enemy.isBoss ? 420 : 340) * bulletSpeed;
      for (let bullet = 0; bullet < bulletCount; bullet++) {
        const angle = (bullet / bulletCount) * Math.PI * 2;
        this.enemyBullets.push({
          id: this.bulletIdCounter++,
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 3,
          damage: enemy.isBoss ? 18 : 12
        });
      }
      enemy.cooldown = (enemy.isBoss ? 2.4 : 2.8) / (1 + difficulty * 0.09);
    } else {
      const spreadCount = this.mapIndex === 1
        ? enemy.isBoss ? 7 : 3
        : enemy.isBoss ? 3 : 1;
      const spread = this.mapIndex === 1 ? 0.2 : 0.15;
      const speed = (enemy.isBoss ? 520 : 480) * bulletSpeed;
      for (let bullet = 0; bullet < spreadCount; bullet++) {
        const offset = bullet - (spreadCount - 1) / 2;
        const angle = aimAngle + offset * spread;
        this.enemyBullets.push({
          id: this.bulletIdCounter++,
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 3,
          damage: enemy.isBoss ? 18 : 12
        });
      }
      enemy.cooldown = (enemy.isBoss ? 1.6 : 1.9) / (1 + difficulty * 0.09);
    }

    const secondAttackCount = enemy.isBoss ? 5 : 2;
    for (let bullet = 0; bullet < secondAttackCount; bullet++) {
      const offset = bullet - (secondAttackCount - 1) / 2;
      const angle = aimAngle + offset * 0.34 + Math.PI / 2;
      this.enemyBullets.push({
        id: this.bulletIdCounter++,
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * (enemy.isBoss ? 340 : 260) * bulletSpeed,
        vy: Math.sin(angle) * (enemy.isBoss ? 340 : 260) * bulletSpeed,
        life: 3,
        damage: enemy.isBoss ? 12 : 8
      });
    }
  }

  private damageEnemy(index: number, damage: number, particleColor: string, respectCooldown = false) {
    const enemy = this.enemies[index];
    if (!enemy) return;
    if (enemy.isBoss && respectCooldown && enemy.damageCooldown > 0) return;

    enemy.hp -= damage;
    if (enemy.isBoss && respectCooldown) enemy.damageCooldown = 0.2;
    playSound("impact");
    this.spawnParticles(enemy.x, enemy.y, particleColor, enemy.isBoss ? 4 : 10);

    if (enemy.hp > 0) return;

    this.enemies.splice(index, 1);
    playSound(enemy.isBoss ? "bossDefeat" : "explosion");
    if (enemy.isCampaignBoss) {
      this.campaignBossActive = false;
      this.onBossAttackWarning?.(false);
    }
    const points = enemy.isBoss ? 100 : 10;
    this.score += points;
    this.enemiesKilled++;
    this.onProgressEvent?.("enemy", 1);
    this.onProgressEvent?.("score", points);
    if (Math.random() < 0.03) {
      this.coins.push({
        id: this.coinIdCounter++,
        x: enemy.x,
        y: enemy.y,
        radius: 13
      });
    }
    this.spawnParticles(enemy.x, enemy.y, particleColor, enemy.isBoss ? 35 : 15);
    if (this.onScoreUpdate) this.onScoreUpdate(this.score);
    if (enemy.isCampaignBoss) this.onCampaignBossDefeated?.();
  }

  private update(dt: number) {
    if (this.deathAnimationTime !== null) {
      this.deathAnimationTime += dt;
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const particle = this.particles[i];
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.life -= dt;
        if (particle.life <= 0) this.particles.splice(i, 1);
      }
      if (this.deathAnimationTime >= this.DEATH_ANIMATION_DURATION) {
        this.deathAnimationTime = null;
        this.isRunning = false;
        this.onGameOver?.(this.score);
      }
      return;
    }

    if (this.portalTransition) {
      const transition = this.portalTransition;
      transition.elapsed += dt;
      if (!transition.mapChanged && transition.elapsed >= transition.duration / 2) {
        this.travelThroughPortal(transition.portal);
        transition.mapChanged = true;
      }
      if (transition.elapsed >= transition.duration) {
        this.portalTransition = null;
      }
      return;
    }

    if (this.pendingCampaignBossLevel !== null) {
      const levelIndex = this.pendingCampaignBossLevel;
      this.pendingCampaignBossLevel = null;
      this.campaignDifficulty = levelIndex;
      this.campaignBossActive = true;
      this.bossIntroTime = 2.6;
      this.mapIndex = (levelIndex + 1) % MAP_NAMES.length;
      this.travelToMap();
      this.enemyBullets = [];
      this.spawnBoss(true);
      return;
    }

    if (this.bossIntroTime > 0) {
      this.bossIntroTime = Math.max(0, this.bossIntroTime - dt);
      return;
    }

    // 1. Update Player
    for (const enemy of this.enemies) {
      if (enemy.damageCooldown > 0) enemy.damageCooldown -= dt;
    }

    let dx = 0;
    let dy = 0;
    if (this.keys["KeyW"] || this.keys["ArrowUp"]) dy -= 1;
    if (this.keys["KeyS"] || this.keys["ArrowDown"]) dy += 1;
    if (this.keys["KeyA"] || this.keys["ArrowLeft"]) dx -= 1;
    if (this.keys["KeyD"] || this.keys["ArrowRight"]) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    this.player.x += dx * this.player.speed * dt;
    this.player.y += dy * this.player.speed * dt;

    // Clamp player to world bounds
    this.player.x = Math.max(-this.WORLD_BOUNDS, Math.min(this.WORLD_BOUNDS, this.player.x));
    this.player.y = Math.max(-this.WORLD_BOUNDS, Math.min(this.WORLD_BOUNDS, this.player.y));

    // Update Camera to follow player
    this.camera.x = this.player.x - this.width / 2;
    this.camera.y = this.player.y - this.height / 2;

    // Player Aim Angle
    const screenPlayerX = this.width / 2;
    const screenPlayerY = this.height / 2;
    this.player.angle = Math.atan2(this.mousePos.y - screenPlayerY, this.mousePos.x - screenPlayerX);

    // Normal Shooting
    if (this.player.cooldown > 0) this.player.cooldown -= dt;
    if (this.isShooting && this.player.cooldown <= 0) {
      const legacyMultiplier = this.score >= 1000 ? 7 : this.score >= 500 ? 5 : this.enemiesKilled >= 15 ? 3 : 1;
      const bulletCount = this.selectedAttack === "spread"
        ? 3
        : this.selectedAttack === "pulse"
          ? legacyMultiplier
          : this.selectedAttack === "arc"
            ? 5
            : this.selectedAttack === "meteor"
              ? 7
              : this.selectedAttack === "pierce"
                ? 2
                : 1;
      const spread = this.selectedAttack === "spread"
        ? 0.22
        : this.selectedAttack === "pulse"
          ? 0.1
          : this.selectedAttack === "arc"
            ? 0.32
            : this.selectedAttack === "meteor"
              ? 0.4
              : this.selectedAttack === "pierce"
                ? 0.08
                : 0;
      const bulletSpeed = this.selectedAttack === "heavy"
        ? 620
        : this.selectedAttack === "rapid"
          ? 900
          : this.selectedAttack === "meteor"
            ? 720
            : this.selectedAttack === "pierce"
              ? 980
              : this.selectedAttack === "arc"
                ? 760
                : 800;
      const damage = this.selectedAttack === "heavy" ? 3 : this.selectedAttack === "meteor" ? 2 : this.selectedAttack === "pierce" ? 2 : 1;
      
      for (let i = 0; i < bulletCount; i++) {
        const offset = (i - (bulletCount - 1) / 2) * spread;
        const playerAngle = this.player.angle;
        const angle = playerAngle + offset;
  
        this.bullets.push({
          id: this.bulletIdCounter++,
          x: this.player.x + Math.cos(playerAngle) * 20,
          y: this.player.y + Math.sin(playerAngle) * 20,
          vx: Math.cos(angle) * bulletSpeed,
          vy: Math.sin(angle) * bulletSpeed,
          life: this.selectedAttack === "pierce" ? 1.3 : 1.0,
          damage
        });
      }
      playAttackSound(this.selectedAttack);
      this.player.cooldown = this.selectedAttack === "rapid"
        ? 0.07
        : this.selectedAttack === "heavy"
          ? 0.48
          : this.selectedAttack === "spread"
            ? 0.32
            : this.selectedAttack === "arc"
              ? 0.18
              : this.selectedAttack === "meteor"
                ? 0.38
                : this.selectedAttack === "pierce"
                  ? 0.12
                  : 0.15;
    }

    // Special Abilities Inputs
    if (this.unlockedSkills.has("laser") && this.keys["KeyE"] && this.laserCooldown <= 0) {
      this.laserEnergy = this.LASER_MAX_ENERGY;
      this.laserCooldown = this.LASER_COOLDOWN_TIME;
      playSound("laser");
      this.spawnParticles(this.player.x, this.player.y, "cyan", 20);
    }
    if (this.unlockedSkills.has("nova") && this.keys["KeyQ"] && this.waveCooldown <= 0) {
      this.shockwaves.push({ x: this.player.x, y: this.player.y, radius: 0, life: 1.5 });
      this.waveCooldown = this.WAVE_COOLDOWN_TIME;
      playSound("nova");
    }
    if (this.unlockedSkills.has("boost") && this.keys["ShiftLeft"] && !this.speedBoostActive) {
      this.speedBoostActive = true;
      this.speedBoostTime = 3;
      playSound("boost");
      this.spawnParticles(this.player.x, this.player.y, "#63f7ff", 24);
    }
    if (this.unlockedSkills.has("shield") && this.keys["KeyF"] && this.shieldSkillCooldown <= 0) {
      this.shieldSkillCooldown = 10;
      this.shieldActive = true;
      this.shieldTime = 6;
      playSound("shield");
      this.spawnParticles(this.player.x, this.player.y, "#7dd3fc", 26);
    }
    if (this.unlockedSkills.has("dash") && this.keys["Space"] && this.dashCooldown <= 0) {
      this.dashCooldown = 5;
      this.boostActive = true;
      this.boostTime = 1.4;
      this.player.speed = 900;
      playSound("dash");
      this.spawnParticles(this.player.x, this.player.y, "#facc15", 20);
    }
    if (this.unlockedSkills.has("barrage") && this.keys["KeyX"] && this.barrageCooldown <= 0) {
      this.barrageCooldown = 7;
      for (let i = 0; i < 8; i++) {
        const angle = this.player.angle + (i - 3.5) * 0.24;
        this.bullets.push({
          id: this.bulletIdCounter++,
          x: this.player.x + Math.cos(this.player.angle) * 18,
          y: this.player.y + Math.sin(this.player.angle) * 18,
          vx: Math.cos(angle) * 760,
          vy: Math.sin(angle) * 760,
          life: 0.9,
          damage: 2
        });
      }
      playSound("barrage");
      this.spawnParticles(this.player.x, this.player.y, "#f472b6", 28);
    }

    // Update Special Abilities
    if (this.laserCooldown > 0) this.laserCooldown -= dt;
    if (this.laserEnergy > 0) {
      this.laserEnergy -= dt * 50; // Lasts 2 seconds
      // Laser Collision
      const laserAngle = this.player.angle;
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pAngle = Math.atan2(dy, dx);
        const angleDiff = Math.abs(laserAngle - pAngle);
        if ((angleDiff < 0.1 || angleDiff > Math.PI * 2 - 0.1) && dist < 1000) {
          this.damageEnemy(i, 1, "white", true);
        }
      }
    }

    if (this.waveCooldown > 0) this.waveCooldown -= dt;
    if (this.shieldSkillCooldown > 0) this.shieldSkillCooldown -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.barrageCooldown > 0) this.barrageCooldown -= dt;
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += 500 * dt;
      s.life -= dt;
      // Wave Collision
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        const dx = e.x - s.x;
        const dy = e.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (Math.abs(dist - s.radius) < 50) {
          this.damageEnemy(j, e.isBoss ? 3 : 1, "orange", true);
        }
      }
      if (s.life <= 0) this.shockwaves.splice(i, 1);
    }

    if (this.speedBoostTime > 0) {
      this.speedBoostTime -= dt;
      this.player.speed = 800;
      if (this.speedBoostTime <= 0) {
        this.speedBoostActive = false;
        this.player.speed = 400;
      }
    }

    // Power-up effects
    if (this.shieldActive) {
      this.shieldTime -= dt;
      if (this.shieldTime <= 0) this.shieldActive = false;
    }
    if (this.boostActive) {
      this.boostTime -= dt;
      this.player.speed = 600;
      if (this.boostTime <= 0) {
        this.boostActive = false;
        this.player.speed = 400;
      }
    }

    // Invincibility & hit flash timers
    if (this.invincibilityTime > 0) this.invincibilityTime -= dt;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
    if (this.damageTextTimer > 0) this.damageTextTimer -= dt;

    // 2. Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) this.bullets.splice(i, 1);
    }

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      
      const dx = this.player.x - b.x;
      const dy = this.player.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.player.radius + 5) {
        if (!this.shieldActive) {
          this.enemyBullets.splice(i, 1);
          if (this.takeDamage("white", b.damage)) return;
        }
      }
      if (b.life <= 0) this.enemyBullets.splice(i, 1);
    }

    // 3. Spawning
    this.nextEnemySpawn -= dt;
    if (this.nextEnemySpawn <= 0) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.max(this.width, this.height) / 2 + 100;
      this.enemies.push({
        id: this.enemyIdCounter++,
        x: this.player.x + Math.cos(angle) * dist,
        y: this.player.y + Math.sin(angle) * dist,
        vx: 0, vy: 0,
        radius: 18,
        hp: 1 + Math.floor(this.campaignDifficulty / 3),
        maxHp: 1 + Math.floor(this.campaignDifficulty / 3),
        type: Math.floor(this.score / 500) % 3,
        cooldown: 2,
        angle: 0,
        isBoss: false,
        damageCooldown: 0
      });
      this.nextEnemySpawn = Math.max(0.28, (1.5 - (this.score * 0.005)) /
        (1 + this.campaignDifficulty * 0.1));
    }

    if (!this.campaignMode && this.score >= this.nextBossScore && !this.enemies.some(enemy => enemy.isBoss)) {
      this.spawnBoss();
    }

    this.nextPortalSpawn -= dt;
    if (
      this.portals.length === 0 &&
      !this.campaignBossActive &&
      this.nextPortalSpawn <= 0 &&
      this.score >= this.nextPortalScore
    ) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 420 + Math.random() * 180;
      const portalX = this.player.x + Math.cos(angle) * distance;
      const portalY = this.player.y + Math.sin(angle) * distance;
      this.portals.push({
        id: this.portalIdCounter++,
        x: Math.max(-this.WORLD_BOUNDS + 60, Math.min(this.WORLD_BOUNDS - 60, portalX)),
        y: Math.max(-this.WORLD_BOUNDS + 60, Math.min(this.WORLD_BOUNDS - 60, portalY)),
        radius: 76,
        targetMap: (this.mapIndex + 1) % MAP_NAMES.length
      });
    }

    for (const portal of this.portals) {
      const dx = this.player.x - portal.x;
      const dy = this.player.y - portal.y;
      if (Math.sqrt(dx * dx + dy * dy) < this.player.radius + portal.radius * 0.55) {
        this.beginPortalTransition(portal);
        break;
      }
    }
    if (this.portalTransition) return;

    this.nextObstacleSpawn -= dt;
    if (this.nextObstacleSpawn <= 0) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.max(this.width, this.height) / 2 + 200;
      const explosive = Math.random() < 0.3;
      const speed = explosive ? 100 + Math.random() * 100 : 0;
      const movementAngle = Math.random() * Math.PI * 2;
      this.obstacles.push({
        id: this.obstacleIdCounter++,
        x: this.player.x + Math.cos(angle) * dist,
        y: this.player.y + Math.sin(angle) * dist,
        radius: 30 + Math.random() * 40,
        color: `hsl(${this.mapIndex * 90}, 70%, 50%)`,
        vx: Math.cos(movementAngle) * speed,
        vy: Math.sin(movementAngle) * speed,
        explosive,
        directionChangeTimer: 0.2 + Math.random() * 0.6
      });
      this.nextObstacleSpawn = 2 + Math.random() * 3;
    }

    this.nextPowerUpSpawn -= dt;
    if (this.nextPowerUpSpawn <= 0) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.max(this.width, this.height) / 2 + 150;
      // life appears ~50% of the time in the general pool
      const types: ('speed' | 'shield' | 'bomb' | 'life')[] = ['speed', 'shield', 'bomb', 'life', 'life', 'life'];
      this.powerUps.push({
        id: this.powerUpIdCounter++,
        x: this.player.x + Math.cos(angle) * dist,
        y: this.player.y + Math.sin(angle) * dist,
        type: types[Math.floor(Math.random() * types.length)],
        radius: 15
      });
      this.nextPowerUpSpawn = 7 + Math.random() * 6;
    }

    // Dedicated heart spawner — very frequent
    this.nextHeartSpawn -= dt;
    if (this.nextHeartSpawn <= 0) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 300 + Math.random() * 500; // closer range so player can find them easily
      this.powerUps.push({
        id: this.powerUpIdCounter++,
        x: this.player.x + Math.cos(angle) * dist,
        y: this.player.y + Math.sin(angle) * dist,
        type: 'life',
        radius: 15
      });
      this.nextHeartSpawn = 5 + Math.random() * 5;
    }

    // 4. Update Entities & Collisions
    // Obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      if (o.explosive) {
        o.directionChangeTimer -= dt;
        if (o.directionChangeTimer <= 0) {
          const movementAngle = Math.random() * Math.PI * 2;
          const speed = 100 + Math.random() * 100;
          o.vx = Math.cos(movementAngle) * speed;
          o.vy = Math.sin(movementAngle) * speed;
          o.directionChangeTimer = 0.2 + Math.random() * 0.6;
        }
      }
      o.x += o.vx * dt;
      o.y += o.vy * dt;

      const dx = this.player.x - o.x;
      const dy = this.player.y - o.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.player.radius + o.radius) {
        if (o.explosive) {
          this.explodeMeteorite(o);
          this.obstacles.splice(i, 1);
          if (!this.shieldActive && this.takeDamage(o.color)) return;
          continue;
        }
        if (!this.shieldActive) {
          this.obstacles.splice(i, 1);
          if (this.takeDamage(o.color)) return;
        }
      }
      if (dist > 2000) {
        this.obstacles.splice(i, 1);
        continue;
      }

      if (o.explosive) {
        for (let j = this.bullets.length - 1; j >= 0; j--) {
          const bullet = this.bullets[j];
          const bulletDx = bullet.x - o.x;
          const bulletDy = bullet.y - o.y;
          if (Math.sqrt(bulletDx * bulletDx + bulletDy * bulletDy) < o.radius + 5) {
            this.bullets.splice(j, 1);
            this.obstacles.splice(i, 1);
            this.explodeMeteorite(o);
            this.score += 5;
            this.onProgressEvent?.("score", 5);
            if (this.onScoreUpdate) this.onScoreUpdate(this.score);
            break;
          }
        }
      }
    }

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      const dx = this.player.x - coin.x;
      const dy = this.player.y - coin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < this.player.radius + coin.radius) {
        this.coins.splice(i, 1);
        this.onProgressEvent?.("coin", 1);
        this.coinsCollectedThisRun++;
        playSound("coin");
        this.spawnParticles(coin.x, coin.y, "#ffd54a", 12);
        continue;
      }
      if (distance > 2000) this.coins.splice(i, 1);
    }

    // Power-ups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      const dx = this.player.x - p.x;
      const dy = this.player.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.player.radius + p.radius) {
        playSound("powerUp");
        if (p.type === 'shield') { this.shieldActive = true; this.shieldTime = 8; }
        if (p.type === 'speed') { this.boostActive = true; this.boostTime = 5; }
        if (p.type === 'life') { this.health = Math.min(this.MAX_HEALTH, this.health + 35); }
        if (p.type === 'bomb') {
          for (let j = this.enemies.length - 1; j >= 0; j--) {
            const enemy = this.enemies[j];
            this.damageEnemy(j, enemy.isBoss ? 10 : 1, "red");
          }
        }
        this.powerUps.splice(i, 1);
        continue;
      }
      if (dist > 2000) this.powerUps.splice(i, 1);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const ex = this.player.x - e.x;
      const ey = this.player.y - e.y;
      const dist = Math.sqrt(ex * ex + ey * ey);
      const enemySpeed = (e.isBoss ? this.ENEMY_SPEED * 0.6 : this.ENEMY_SPEED) *
        (1 + this.campaignDifficulty * 0.07);
      
      // Enemies avoid obstacles
      for (const o of this.obstacles) {
        const ox = o.x - e.x;
        const oy = o.y - e.y;
        const oDist = Math.sqrt(ox * ox + oy * oy);
        if (oDist < o.radius + 50) {
          e.x -= (ox / oDist) * enemySpeed * dt;
          e.y -= (oy / oDist) * enemySpeed * dt;
        }
      }

      if (dist > 0) {
        e.x += (ex / dist) * enemySpeed * dt;
        e.y += (ey / dist) * enemySpeed * dt;
      }

      // Enemy attacks vary by map, while sprite colors and shapes remain consistent.
      e.cooldown -= dt;
      const attackRange = e.isBoss ? 900 : 600;
      if (e.attackWindup !== undefined) {
        e.attackWindup -= dt;
        if (e.attackWindup <= 0) {
          const attackAngle = e.attackAimAngle ?? Math.atan2(ey, ex);
          delete e.attackWindup;
          delete e.attackAimAngle;
          this.onBossAttackWarning?.(false);
          this.fireEnemyAttack(e, attackAngle);
        }
      } else if (e.cooldown <= 0 && dist < attackRange) {
        const aimAngle = Math.atan2(ey, ex);
        if (e.isBoss) {
          e.attackAimAngle = aimAngle;
          e.attackWindup = 1.05;
          e.angle = aimAngle;
          e.cooldown = 1.05;
          playSound("bossWarning");
          this.onBossAttackWarning?.(true);
        } else {
          this.fireEnemyAttack(e, aimAngle);
        }
      }

      // Volcano map laser attack
      if (
        this.mapIndex === 3 &&
        e.cooldown > 2 / (1 + this.campaignDifficulty * 0.09)
      ) {
        const laserAngle = e.angle;
        const dx = this.player.x - e.x;
        const dy = this.player.y - e.y;
        const pAngle = Math.atan2(dy, dx);
        const angleDiff = Math.abs(laserAngle - pAngle);
        if ((angleDiff < 0.05 || angleDiff > Math.PI * 2 - 0.05) && dist < 800) {
          e.cooldown = 0; // Stop laser regardless
          if (this.takeDamage("purple", e.isBoss ? 35 : 25)) return;
        }
      }

      if (dist < this.player.radius + e.radius) {
        if (e.isBoss) {
          if (!this.shieldActive && this.takeDamage("hsl(300, 100%, 50%)", e.isBoss ? 30 : 20)) return;
          continue;
        }
        if (this.shieldActive) {
          playSound("impact");
          this.enemies.splice(i, 1);
          this.score += 10;
          this.enemiesKilled += 1;
          this.onProgressEvent?.("enemy", 1);
          this.onProgressEvent?.("score", 10);
          if (Math.random() < 0.03) {
            this.coins.push({ id: this.coinIdCounter++, x: e.x, y: e.y, radius: 13 });
          }
          if (this.onScoreUpdate) this.onScoreUpdate(this.score);
          continue;
        }
        this.enemies.splice(i, 1);
        if (this.takeDamage("hsl(300, 100%, 50%)", 20)) return;
        continue;
      }

      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const b = this.bullets[j];
        const bx = b.x - e.x;
        const by = b.y - e.y;
        const bDist = Math.sqrt(bx * bx + by * by);
        
        if (bDist < e.radius + 5) {
          this.bullets.splice(j, 1);
          this.damageEnemy(i, b.damage, "hsl(0, 100%, 50%)");
          break;
        }
      }
    }

    // Execute deferred mega blast safely (all entity loops are done)
    if (this.pendingMegaBlast) {
      this.pendingMegaBlast = false;
      this.executeMegaBlast();
    }

    // 5. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  private drawPixelLaser(length: number, width: number, glowColor: string, colors: readonly string[]) {
    this.ctx.save();
    this.ctx.shadowColor = glowColor;
    this.ctx.shadowBlur = 18;
    this.ctx.fillStyle = glowColor;
    this.ctx.globalAlpha = 0.35;
    this.ctx.fillRect(0, -width / 2, length, width);
    this.ctx.globalAlpha = 1;
    this.ctx.shadowBlur = 0;

    const segmentWidth = 32;
    for (let x = 0, segment = 0; x < length; x += segmentWidth, segment++) {
      this.ctx.fillStyle = colors[segment % colors.length];
      this.ctx.fillRect(x, -width / 2, Math.min(segmentWidth, length - x), width);
    }

    this.ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    this.ctx.fillRect(0, -2, length, 4);
    this.ctx.restore();
  }

  private draw() {
    const zoneColors = [
      ["#07081e", "#101744"],
      ["#032331", "#075071"],
      ["#061d18", "#123b25"],
      ["#220d12", "#511b18"],
      ["#07192b", "#17476c"],
      ["#160d2b", "#3a1853"],
      ["#0a1b2f", "#1b6a88"],
      ["#1b0e1f", "#4a1d3d"]
    ];
    const gridColors = [
      "hsl(300, 100%, 50%, 0.2)",
      "hsl(180, 100%, 50%, 0.2)",
      "hsl(120, 100%, 50%, 0.2)",
      "hsl(0, 100%, 50%, 0.2)",
      "hsl(195, 100%, 75%, 0.2)",
      "hsl(280, 100%, 70%, 0.2)",
      "hsl(200, 100%, 70%, 0.2)",
      "hsl(330, 100%, 70%, 0.2)"
    ];
    const textureColors = [
      ["rgba(102, 112, 226, 0.15)", "rgba(178, 133, 240, 0.12)", "rgba(205, 216, 255, 0.1)"],
      ["rgba(35, 143, 174, 0.18)", "rgba(64, 192, 196, 0.14)", "rgba(145, 227, 220, 0.12)"],
      ["rgba(37, 113, 61, 0.2)", "rgba(75, 153, 77, 0.16)", "rgba(143, 189, 87, 0.13)"],
      ["rgba(156, 49, 37, 0.2)", "rgba(212, 83, 39, 0.17)", "rgba(245, 145, 53, 0.14)"],
      ["rgba(105, 196, 239, 0.2)", "rgba(190, 232, 255, 0.17)", "rgba(123, 160, 231, 0.14)"],
      ["rgba(177, 93, 225, 0.2)", "rgba(82, 181, 232, 0.17)", "rgba(238, 119, 220, 0.14)"],
      ["rgba(73, 167, 192, 0.21)", "rgba(125, 219, 236, 0.17)", "rgba(186, 240, 255, 0.12)"],
      ["rgba(213, 114, 175, 0.21)", "rgba(134, 94, 228, 0.17)", "rgba(255, 204, 229, 0.12)"]
    ];

    // Clear screen
    const background = this.ctx.createLinearGradient(0, 0, 0, this.height);
    background.addColorStop(0, zoneColors[this.mapIndex][0]);
    background.addColorStop(1, zoneColors[this.mapIndex][1]);
    this.ctx.fillStyle = background;
    this.ctx.fillRect(0, 0, this.width, this.height);

    const deathProgress = this.deathAnimationTime === null
      ? 0
      : Math.min(this.deathAnimationTime / this.DEATH_ANIMATION_DURATION, 1);
    const deathZoom = 1 + deathProgress * 1.8;
    this.ctx.save();
    this.ctx.translate(this.width / 2, this.height / 2);
    this.ctx.scale(deathZoom, deathZoom);
    this.ctx.translate(-this.width / 2, -this.height / 2);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // Draw Grid
    this.ctx.strokeStyle = gridColors[this.mapIndex];
    this.ctx.lineWidth = 1;
    const gridSize = 100;
    const startX = Math.floor(this.camera.x / gridSize) * gridSize;
    const startY = Math.floor(this.camera.y / gridSize) * gridSize;

    const textureCellSize = 32;
    const textureStartX = Math.floor(this.camera.x / textureCellSize) * textureCellSize;
    const textureStartY = Math.floor(this.camera.y / textureCellSize) * textureCellSize;
    for (let x = textureStartX; x < this.camera.x + this.width + textureCellSize; x += textureCellSize) {
      for (let y = textureStartY; y < this.camera.y + this.height + textureCellSize; y += textureCellSize) {
        const seed = Math.abs(Math.sin(x * 12.9898 + y * 78.233 + this.mapIndex * 37.719)) * 43758.5453;
        const variation = seed - Math.floor(seed);
        if (variation < 0.34) continue;

        const offsetX = Math.floor((variation * 17) % 20);
        const offsetY = Math.floor((variation * 29) % 20);
        const pixelSize = 5 + Math.floor((variation * 41) % 9);
        const palette = textureColors[this.mapIndex];
        this.ctx.fillStyle = palette[Math.floor((variation * 13) % palette.length)];
        this.ctx.fillRect(x + offsetX, y + offsetY, pixelSize, pixelSize);

        const clusterSeed = Math.abs(Math.sin(x * 5.398 + y * 19.19 + this.mapIndex * 11.7)) * 24634.6345;
        const clusterVariation = clusterSeed - Math.floor(clusterSeed);
        this.ctx.fillStyle = palette[Math.floor((clusterVariation * 17) % palette.length)];
        this.ctx.fillRect(
          x + Math.floor((clusterVariation * 23) % 21),
          y + Math.floor((clusterVariation * 31) % 21),
          5 + Math.floor((clusterVariation * 19) % 9),
          5 + Math.floor((clusterVariation * 29) % 9)
        );

        if (clusterVariation > 0.38) {
          const fleckSeed = Math.abs(Math.sin(x * 2.71 + y * 9.13 + this.mapIndex * 4.91)) * 9631.417;
          const fleck = fleckSeed - Math.floor(fleckSeed);
          this.ctx.fillStyle = palette[Math.floor((fleck * 11) % palette.length)];
          this.ctx.fillRect(
            x + Math.floor((fleck * 19) % 28),
            y + Math.floor((fleck * 27) % 28),
            3 + Math.floor((fleck * 13) % 6),
            3 + Math.floor((fleck * 17) % 6)
          );
        }
      }
    }

    const landmarkSize = 280;
    const landmarkStartX = Math.floor(this.camera.x / landmarkSize) * landmarkSize;
    const landmarkStartY = Math.floor(this.camera.y / landmarkSize) * landmarkSize;
    for (let x = landmarkStartX - landmarkSize; x < this.camera.x + this.width + landmarkSize; x += landmarkSize) {
      for (let y = landmarkStartY - landmarkSize; y < this.camera.y + this.height + landmarkSize; y += landmarkSize) {
        const seed = Math.abs(Math.sin(x * 0.013 + y * 0.021));
        const detail = Math.abs(Math.sin(x * 0.031 - y * 0.017));
        const landmarkX = x + seed * landmarkSize;
        const landmarkY = y + (1 - seed) * landmarkSize;
        if (this.mapIndex === 0) {
          const nebula = this.ctx.createRadialGradient(landmarkX, landmarkY, 2, landmarkX, landmarkY, 48 + detail * 36);
          nebula.addColorStop(0, "rgba(105, 104, 255, 0.12)");
          nebula.addColorStop(1, "rgba(105, 104, 255, 0)");
          this.ctx.fillStyle = nebula;
          this.ctx.fillRect(landmarkX - 90, landmarkY - 90, 180, 180);
          this.ctx.fillStyle = "rgba(210, 222, 255, 0.7)";
          this.ctx.beginPath();
          this.ctx.arc(landmarkX, landmarkY, 1 + seed * 2.5, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.strokeStyle = "rgba(191, 202, 255, 0.36)";
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(landmarkX - 7, landmarkY);
          this.ctx.lineTo(landmarkX + 7, landmarkY);
          this.ctx.moveTo(landmarkX, landmarkY - 7);
          this.ctx.lineTo(landmarkX, landmarkY + 7);
          this.ctx.stroke();
        } else if (this.mapIndex === 1) {
          this.ctx.strokeStyle = "rgba(67, 205, 224, 0.18)";
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.ellipse(landmarkX, landmarkY, 70 + seed * 45, 18 + seed * 12, seed, 0, Math.PI * 2);
          this.ctx.ellipse(landmarkX + 20, landmarkY + 16, 48 + detail * 22, 12 + seed * 8, -seed, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.fillStyle = "rgba(107, 231, 235, 0.3)";
          for (let bubble = 0; bubble < 3; bubble++) {
            const bubbleX = landmarkX - 22 + bubble * 18;
            const bubbleY = landmarkY + 28 - bubble * 14;
            this.ctx.beginPath();
            this.ctx.arc(bubbleX, bubbleY, 2 + detail * 3, 0, Math.PI * 2);
            this.ctx.fill();
          }
        } else if (this.mapIndex === 2) {
          this.ctx.fillStyle = "rgba(55, 139, 77, 0.2)";
          this.ctx.beginPath();
          this.ctx.moveTo(landmarkX, landmarkY - 48);
          this.ctx.lineTo(landmarkX - 28, landmarkY + 20);
          this.ctx.lineTo(landmarkX + 28, landmarkY + 20);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.fillStyle = "rgba(107, 73, 43, 0.28)";
          this.ctx.fillRect(landmarkX - 4, landmarkY + 12, 8, 26);
          this.ctx.fillStyle = "rgba(93, 171, 91, 0.18)";
          this.ctx.beginPath();
          this.ctx.arc(landmarkX - 18, landmarkY + 20, 12 + detail * 8, 0, Math.PI * 2);
          this.ctx.arc(landmarkX + 18, landmarkY + 20, 12 + seed * 8, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (this.mapIndex === 3) {
          this.ctx.strokeStyle = "rgba(255, 93, 45, 0.24)";
          this.ctx.lineWidth = 5;
          this.ctx.beginPath();
          this.ctx.moveTo(landmarkX - 45, landmarkY - 25);
          this.ctx.lineTo(landmarkX - 12, landmarkY - 5);
          this.ctx.lineTo(landmarkX + 10, landmarkY - 35);
          this.ctx.lineTo(landmarkX + 40, landmarkY + 22);
          this.ctx.stroke();
          this.ctx.strokeStyle = "rgba(255, 180, 65, 0.14)";
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.moveTo(landmarkX - 20, landmarkY + 40);
          this.ctx.lineTo(landmarkX - 3, landmarkY + 14);
          this.ctx.lineTo(landmarkX + 8, landmarkY + 24);
          this.ctx.lineTo(landmarkX + 28, landmarkY - 4);
          this.ctx.stroke();
          this.ctx.fillStyle = "rgba(255, 105, 35, 0.2)";
          this.ctx.beginPath();
          this.ctx.arc(landmarkX + 35, landmarkY - 28, 4 + detail * 6, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (this.mapIndex === 4) {
          this.ctx.fillStyle = "rgba(164, 220, 255, 0.18)";
          this.ctx.beginPath();
          this.ctx.moveTo(landmarkX, landmarkY - 58 - detail * 24);
          this.ctx.lineTo(landmarkX - 22, landmarkY + 34);
          this.ctx.lineTo(landmarkX + 24, landmarkY + 34);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.strokeStyle = "rgba(205, 241, 255, 0.26)";
          this.ctx.lineWidth = 3;
          this.ctx.stroke();
        } else {
          this.ctx.fillStyle = "rgba(107, 93, 177, 0.2)";
          this.ctx.fillRect(landmarkX - 32, landmarkY - 48, 64, 88);
          this.ctx.fillStyle = "rgba(113, 220, 255, 0.3)";
          for (let windowRow = 0; windowRow < 3; windowRow++) {
            for (let windowColumn = 0; windowColumn < 2; windowColumn++) {
              this.ctx.fillRect(
                landmarkX - 20 + windowColumn * 22,
                landmarkY - 34 + windowRow * 22,
                8,
                10
              );
            }
          }
        }
      }
    }
    
    // Draw decorative background textures
    this.ctx.fillStyle = gridColors[this.mapIndex].replace('0.2', '0.05');
    for (let x = startX - gridSize; x < startX + this.width + gridSize; x += gridSize * 2) {
      for (let y = startY - gridSize; y < startY + this.height + gridSize; y += gridSize * 2) {
        this.ctx.beginPath();
        this.ctx.arc(x + gridSize, y + gridSize, 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    this.ctx.beginPath();
    for (let x = startX - gridSize; x < startX + this.width + gridSize; x += gridSize) {
      this.ctx.moveTo(x, this.camera.y - gridSize);
      this.ctx.lineTo(x, this.camera.y + this.height + gridSize);
    }
    for (let y = startY - gridSize; y < startY + this.height + gridSize; y += gridSize) {
      this.ctx.moveTo(this.camera.x - gridSize, y);
      this.ctx.lineTo(this.camera.x + this.width + gridSize, y);
    }
    this.ctx.stroke();

    for (const portal of this.portals) {
      const pulse = 1 + Math.sin(performance.now() / 250 + portal.id) * 0.08;
      const glowColors = ["#78eaff", "#32d8ff", "#a5f27a", "#ff754f"];
      const glowColor = glowColors[portal.targetMap] ?? glowColors[0];
      this.ctx.save();
      this.ctx.translate(portal.x, portal.y);
      this.ctx.scale(pulse, pulse);
      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = portal.radius * 0.42;
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      this.ctx.beginPath();
      this.ctx.ellipse(0, portal.radius * 0.12, portal.radius * 1.08, portal.radius * 1.43, 0, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = "#201c2b";
      this.ctx.strokeStyle = "#11121b";
      this.ctx.lineWidth = portal.radius * 0.12;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, portal.radius * 0.88, portal.radius * 1.2, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      for (let rock = 0; rock < 12; rock++) {
        const angle = (rock / 12) * Math.PI * 2;
        const variation = Math.abs(Math.sin((rock + 1) * 12.43 + portal.id * 8.17));
        const rockSize = portal.radius * (0.13 + variation * 0.06);
        const rockX = Math.cos(angle) * portal.radius * 0.78;
        const rockY = Math.sin(angle) * portal.radius * 1.08;
        this.ctx.save();
        this.ctx.translate(rockX, rockY);
        this.ctx.rotate(angle);
        this.ctx.fillStyle = rock % 2 === 0 ? "#514858" : "#393743";
        this.ctx.beginPath();
        this.ctx.moveTo(-rockSize, -rockSize * 0.42);
        this.ctx.lineTo(-rockSize * 0.5, -rockSize);
        this.ctx.lineTo(rockSize * 0.54, -rockSize * 0.82);
        this.ctx.lineTo(rockSize, -rockSize * 0.1);
        this.ctx.lineTo(rockSize * 0.55, rockSize * 0.82);
        this.ctx.lineTo(-rockSize * 0.62, rockSize * 0.7);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.fillStyle = "#817887";
        this.ctx.fillRect(-rockSize * 0.42, -rockSize * 0.52, rockSize * 0.7, rockSize * 0.2);
        this.ctx.restore();
      }

      const opening = portal.radius * 0.58;
      const interior = this.ctx.createRadialGradient(0, 0, opening * 0.08, 0, 0, opening * 1.65);
      interior.addColorStop(0, "#080817");
      interior.addColorStop(0.58, "#11152c");
      interior.addColorStop(1, glowColor);
      this.ctx.fillStyle = interior;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, opening, portal.radius * 0.84, 0, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, opening * 0.97, portal.radius * 0.81, 0, 0, Math.PI * 2);
      this.ctx.clip();
      this.ctx.translate(0, 0);
      this.ctx.rotate(performance.now() / 1400);
      this.ctx.globalAlpha = 0.7;
      this.ctx.strokeStyle = glowColor;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, opening * 0.52, portal.radius * 0.48, 0, 0, Math.PI * 1.6);
      this.ctx.stroke();
      this.ctx.strokeStyle = "#d9fbff";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, opening * 0.26, portal.radius * 0.27, 0, Math.PI * 0.3, Math.PI * 1.75);
      this.ctx.stroke();
      this.ctx.restore();

      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = 14;
      this.ctx.strokeStyle = glowColor;
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, opening, portal.radius * 0.84, 0, Math.PI * 1.08, Math.PI * 1.92);
      this.ctx.stroke();
      this.ctx.restore();
    }

    for (const coin of this.coins) {
      const pulse = 1 + Math.sin(performance.now() / 180 + coin.id) * 0.12;
      this.ctx.save();
      this.ctx.translate(coin.x, coin.y);
      this.ctx.scale(pulse, 1);
      this.ctx.shadowColor = "#ffd54a";
      this.ctx.shadowBlur = 18;
      this.ctx.fillStyle = "#ffd54a";
      this.ctx.beginPath();
      this.ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = "#a85b16";
      this.ctx.font = "bold 16px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText("$", 0, 1);
      this.ctx.restore();
    }

    // Obstacles
    for (const o of this.obstacles) {
      if (o.explosive) {
        this.ctx.save();
        this.ctx.strokeStyle = "rgba(255, 132, 52, 0.6)";
        this.ctx.shadowColor = "#ff6338";
        this.ctx.shadowBlur = 12;
        this.ctx.lineWidth = Math.max(3, o.radius * 0.12);
        this.ctx.beginPath();
        this.ctx.moveTo(o.x, o.y);
        this.ctx.lineTo(o.x - o.vx * 0.2, o.y - o.vy * 0.2);
        this.ctx.stroke();
        this.ctx.restore();
      }

      const pixelCount = 15;
      const halfPixels = Math.floor(pixelCount / 2);
      const pixelSize = (o.radius * 2) / pixelCount;

      for (let row = 0; row < pixelCount; row++) {
        for (let column = 0; column < pixelCount; column++) {
          const pixelX = column - halfPixels;
          const pixelY = row - halfPixels;
          if (pixelX * pixelX + pixelY * pixelY > halfPixels * halfPixels + 2) continue;

          const crater = METEORITE_CRATERS.find(({ x, y, width, height }) => (
            ((pixelX - x) / width) ** 2 + ((pixelY - y) / height) ** 2 < 1
          ));
          const variation = Math.abs(Math.sin(o.id * 37.7 + row * 12.3 + column * 4.7));
          this.ctx.fillStyle = crater
            ? variation > 0.65 ? "#9e2930" : "#b33c38"
            : METEORITE_COLORS[Math.floor(variation * METEORITE_COLORS.length)];
          this.ctx.fillRect(
            o.x + pixelX * pixelSize - pixelSize / 2,
            o.y + pixelY * pixelSize - pixelSize / 2,
            pixelSize,
            pixelSize
          );
        }
      }
    }

    // Power-ups
    for (const p of this.powerUps) {
      this.ctx.fillStyle = p.type === 'speed' ? 'yellow' : p.type === 'shield' ? 'cyan' : p.type === 'life' ? 'pink' : 'red';
      this.ctx.beginPath();
      if (p.type === 'life') {
        // Heart shape for life powerup
        const x = p.x;
        const y = p.y;
        const r = p.radius;
        this.ctx.moveTo(x, y + r / 4);
        this.ctx.quadraticCurveTo(x, y - r, x + r, y - r);
        this.ctx.quadraticCurveTo(x + r * 1.5, y, x, y + r * 1.5);
        this.ctx.quadraticCurveTo(x - r * 1.5, y, x - r, y - r);
        this.ctx.quadraticCurveTo(x, y - r, x, y + r / 4);
      } else {
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      }
      this.ctx.fill();
      this.ctx.stroke();
    }

    // Draw bounds warning (if close)
    this.ctx.strokeStyle = "hsl(0, 100%, 50%, 0.5)";
    this.ctx.lineWidth = 10;
    this.ctx.strokeRect(-this.WORLD_BOUNDS, -this.WORLD_BOUNDS, this.WORLD_BOUNDS * 2, this.WORLD_BOUNDS * 2);

    // Draw Enemies
    for (const e of this.enemies) {
      this.ctx.save();
      this.ctx.translate(e.x, e.y);
      
      // Laser effect
      if (
        this.mapIndex === 3 &&
        (e.attackWindup !== undefined || e.cooldown > 2 / (1 + this.campaignDifficulty * 0.09))
      ) {
        this.ctx.save();
        this.ctx.rotate(e.angle);
        this.drawPixelLaser(
          e.isBoss ? 950 : 800,
          e.isBoss ? 18 : 12,
          "#c83cff",
          ["#7900a8", "#bd2de0", "#ed9bff"]
        );
        this.ctx.restore();
      }

      const spriteMapIndex = this.mapIndex % MAP_ENEMY_SPRITES.length;
      const sprite = e.isBoss ? MAP_BOSS_SPRITES[spriteMapIndex] : MAP_ENEMY_SPRITES[spriteMapIndex];
      const colors = e.isBoss ? MAP_BOSS_COLORS[spriteMapIndex] : MAP_ENEMY_COLORS[spriteMapIndex];
      const pixelSize = e.isBoss ? 8 : 3;
      const spriteSize = Math.max(...sprite.map(row => row.length)) * pixelSize;
      this.ctx.shadowColor = e.isBoss ? "#ff3bf5" : "#17b6f5";
      this.ctx.shadowBlur = e.isBoss ? 22 : 12;
      for (let row = 0; row < sprite.length; row++) {
        for (let column = 0; column < sprite[row].length; column++) {
          const pixel = sprite[row][column];
          if (pixel === ".") continue;
          this.ctx.fillStyle = colors[pixel];
          this.ctx.fillRect(
            (column - (sprite[row].length - 1) / 2) * pixelSize,
            row * pixelSize - spriteSize / 2,
            pixelSize,
            pixelSize
          );
        }
      }
      if (e.isBoss) {
        this.ctx.strokeStyle = "#ff3bf5";
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(-spriteSize / 2 - 7, -spriteSize / 2 - 7, spriteSize + 14, spriteSize + 14);
      }
      this.ctx.restore();

      if (e.isBoss) {
        const barWidth = e.radius * 2 + 20;
        const barY = e.y - e.radius - 18;
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        this.ctx.fillRect(e.x - barWidth / 2, barY, barWidth, 8);
        this.ctx.fillStyle = "#ff3bf5";
        this.ctx.fillRect(e.x - barWidth / 2, barY, barWidth * Math.max(0, e.hp / e.maxHp), 8);
      }
    }

    // Draw Bullets (Neon Yellow lines)
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = "hsl(60, 100%, 50%)";
    this.ctx.strokeStyle = "hsl(60, 100%, 50%)";
    this.ctx.lineWidth = 4;
    for (const b of this.bullets) {
      this.ctx.beginPath();
      this.ctx.moveTo(b.x, b.y);
      this.ctx.lineTo(b.x - (b.vx * 0.05), b.y - (b.vy * 0.05)); // trail
      this.ctx.stroke();
    }

    // Draw Enemy Bullets
    this.ctx.shadowColor = "white";
    this.ctx.strokeStyle = "white";
    this.ctx.lineWidth = 3;
    for (const b of this.enemyBullets) {
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    for (const particle of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      this.ctx.fillStyle = particle.color;
      this.ctx.shadowColor = particle.color;
      this.ctx.shadowBlur = 10;
      const size = 3 + this.ctx.globalAlpha * 4;
      this.ctx.fillRect(particle.x - size / 2, particle.y - size / 2, size, size);
      this.ctx.restore();
    }

    // Draw Player (blink when invincible)
    const shouldBlink = this.invincibilityTime > 0 && Math.floor(this.invincibilityTime * 8) % 2 === 0;
    if (this.isRunning && !shouldBlink) {
      // Laser Beam Effect
      if (this.laserEnergy > 0) {
        this.ctx.save();
        this.ctx.translate(this.player.x, this.player.y);
        this.ctx.rotate(this.player.angle);
        this.drawPixelLaser(1000, 20, "#00cfff", ["#0865d6", "#078fe8", "#20dcff"]);
        this.ctx.restore();
      }

      const hue = this.score >= 1000 ? 280 : this.score >= 500 ? 60 : 180;
      this.ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
      this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      this.ctx.save();
      this.ctx.translate(this.player.x, this.player.y);
      this.ctx.rotate(this.player.angle);
      
      this.ctx.rotate(Math.PI / 2);
      this.ctx.shadowBlur = 8;
      const planeIndex = PLANE_ORDER.indexOf(this.selectedPlane);
      const playerSprite = MAP_PLAYER_SPRITES[planeIndex] ?? MAP_PLAYER_SPRITES[0];
      const playerColors = MAP_PLAYER_COLORS[planeIndex] ?? MAP_PLAYER_COLORS[0];
      if (this.deathAnimationTime !== null) {
        const progress = Math.min(this.deathAnimationTime / this.DEATH_ANIMATION_DURATION, 1);
        this.ctx.rotate(progress * Math.PI * 5);
        this.ctx.scale(1 + progress * 1.8, 1 + progress * 1.8);
        this.ctx.globalAlpha = Math.max(0, 1 - progress * 0.75);
      }

      if (this.speedBoostActive) {
        const pulse = (Math.sin(performance.now() / 45) + 1) / 2;
        this.ctx.save();
        this.ctx.lineCap = "round";
        this.ctx.shadowColor = "#46edff";
        this.ctx.shadowBlur = 14 + pulse * 12;
        this.ctx.strokeStyle = `rgba(90, 245, 255, ${0.55 + pulse * 0.4})`;
        this.ctx.lineWidth = 2 + pulse * 2;
        for (let streak = -2; streak <= 2; streak++) {
          const length = 30 + ((streak + 2) % 3) * 12 + pulse * 18;
          this.ctx.beginPath();
          this.ctx.moveTo(streak * 5, 12);
          this.ctx.lineTo(streak * 7, 12 + length);
          this.ctx.stroke();
        }
        this.ctx.fillStyle = "#eaffff";
        this.ctx.shadowBlur = 18 + pulse * 12;
        this.ctx.beginPath();
        this.ctx.moveTo(-5, 17);
        this.ctx.lineTo(0, 35 + pulse * 16);
        this.ctx.lineTo(5, 17);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
      }

      if (this.keys["KeyW"] || this.keys["ArrowUp"] || this.keys["KeyA"] || this.keys["KeyS"] || this.keys["KeyD"]) {
        this.ctx.fillStyle = "#ff8d35";
        this.ctx.beginPath();
        this.ctx.moveTo(-3, 18);
        this.ctx.lineTo(0, 28 + Math.random() * 8);
        this.ctx.lineTo(3, 18);
        this.ctx.closePath();
        this.ctx.fill();
      }

      const pixelSize = 2;
      const spriteHeight = playerSprite.length * pixelSize;
      for (let rowIndex = 0; rowIndex < playerSprite.length; rowIndex++) {
        const row = playerSprite[rowIndex];
        for (let column = 0; column < row.length; column++) {
          const pixel = row[column];
          if (pixel === ".") continue;
          this.ctx.fillStyle = playerColors[pixel];
          this.ctx.fillRect(
            (column - (row.length - 1) / 2) * pixelSize,
            rowIndex * pixelSize - spriteHeight / 2,
            pixelSize,
            pixelSize
          );
        }
      }

      if (this.shieldActive) {
        this.ctx.strokeStyle = "cyan";
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 40, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      this.ctx.restore();

      // Draw Shockwaves (world space — we are already inside the camera transform)
      for (const s of this.shockwaves) {
        const alpha = Math.max(0, s.life * 0.6);
        this.ctx.save();
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = `rgba(255, 165, 0, ${alpha})`;
        this.ctx.strokeStyle = `rgba(255, 165, 0, ${alpha})`;
        this.ctx.lineWidth = 6;
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        this.ctx.stroke();
        // Inner glow ring
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, s.radius * 0.85, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    this.ctx.restore(); // remove camera transform

    // Draw HUD
    this.ctx.shadowBlur = 0;
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";
    const panelWidth = Math.min(230, this.width - 32);
    const panelX = 16;
    const drawPanel = (x: number, y: number, height: number) => {
      this.ctx.fillStyle = "rgba(3, 8, 24, 0.82)";
      this.ctx.fillRect(x, y, panelWidth, height);
      this.ctx.strokeStyle = "rgba(120, 244, 255, 0.5)";
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, y, panelWidth, height);
    };

    drawPanel(panelX, 16, 158);
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "11px 'Press Start 2P'";
    this.ctx.fillText(`PUNTOS  ${this.score}`, panelX + 12, 28);
    this.ctx.fillStyle = "#ffd54a";
    this.ctx.font = "8px 'Press Start 2P'";
    this.ctx.fillText(`MONEDAS  ${this.coinsCollectedThisRun}`, panelX + 12, 50);
    this.ctx.fillStyle = "#78f4ff";
    this.ctx.font = "8px 'Press Start 2P'";
    this.ctx.fillText(`MAPA  ${MAP_NAMES[this.mapIndex]}`, panelX + 12, 70);

    const portal = this.portals[0];
    if (portal) {
      const dx = portal.x - this.player.x;
      const dy = portal.y - this.player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      this.ctx.save();
      this.ctx.translate(panelX + 18, 103);
      this.ctx.rotate(Math.atan2(dy, dx));
      this.ctx.fillStyle = "#8afaff";
      this.ctx.shadowColor = "#55f5ff";
      this.ctx.shadowBlur = 12;
      this.ctx.beginPath();
      this.ctx.moveTo(8, 0);
      this.ctx.lineTo(-6, -5);
      this.ctx.lineTo(-4, 0);
      this.ctx.lineTo(-6, 5);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
      this.ctx.fillStyle = "#8afaff";
      this.ctx.font = "7px 'Press Start 2P'";
      this.ctx.fillText(`PORTAL ${MAP_NAMES[portal.targetMap]} ${Math.round(distance)}m`, panelX + 30, 99);
    } else {
      this.ctx.fillStyle = "#8afaff";
      this.ctx.font = "7px 'Press Start 2P'";
      this.ctx.fillText(`PORTAL EN ${Math.max(0, this.nextPortalScore - this.score)} PTS`, panelX + 12, 99);
    }

    const healthRatio = Math.max(0, this.health / this.MAX_HEALTH);
    this.ctx.fillStyle = "white";
    this.ctx.font = "7px 'Press Start 2P'";
    this.ctx.fillText(`VIDA  ${this.health}/${this.MAX_HEALTH}`, panelX + 12, 121);
    const healthX = panelX + 12;
    const healthY = 137;
    const healthWidth = panelWidth - 24;
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    this.ctx.fillRect(healthX, healthY, healthWidth, 14);
    this.ctx.fillStyle = healthRatio > 0.5 ? "#35f28b" : healthRatio > 0.25 ? "#ffd447" : "#ff3b5c";
    this.ctx.fillRect(healthX + 2, healthY + 2, (healthWidth - 4) * healthRatio, 10);
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.strokeRect(healthX, healthY, healthWidth, 14);

    const abilityPanelY = this.width < 520 ? 184 : 16;
    const abilityPanelX = this.width < 520 ? panelX : Math.max(16, this.width - panelWidth - 16);
    drawPanel(abilityPanelX, abilityPanelY, 198);
    this.ctx.font = "8px 'Press Start 2P'";
    this.ctx.fillStyle = this.unlockedSkills.has("laser") ? (this.laserCooldown <= 0 ? "cyan" : "#9aa4b5") : "#697386";
    this.ctx.fillText(`E  LASER  ${!this.unlockedSkills.has("laser") ? "BLOQUEADO" : (this.laserCooldown <= 0 ? "LISTO" : `${Math.ceil(this.laserCooldown)}s`)}`, abilityPanelX + 12, abilityPanelY + 16);
    this.ctx.fillStyle = this.unlockedSkills.has("nova") ? (this.waveCooldown <= 0 ? "orange" : "#9aa4b5") : "#697386";
    this.ctx.fillText(`Q  NOVA  ${!this.unlockedSkills.has("nova") ? "BLOQUEADA" : (this.waveCooldown <= 0 ? "LISTA" : `${Math.ceil(this.waveCooldown)}s`)}`, abilityPanelX + 12, abilityPanelY + 40);
    this.ctx.fillStyle = this.unlockedSkills.has("boost") ? (this.speedBoostActive ? "yellow" : "white") : "#697386";
    this.ctx.fillText(`SHIFT  ACELERON  ${!this.unlockedSkills.has("boost") ? "BLOQUEADO" : (this.speedBoostActive ? "ACTIVO" : "LISTO")}`, abilityPanelX + 12, abilityPanelY + 64);
    this.ctx.fillStyle = this.unlockedSkills.has("shield") ? (this.shieldActive ? "cyan" : "white") : "#697386";
    this.ctx.fillText(`F  ESCUDO  ${!this.unlockedSkills.has("shield") ? "BLOQUEADO" : (this.shieldActive ? `ACTIVO ${Math.ceil(this.shieldTime)}s` : (this.shieldSkillCooldown > 0 ? `${Math.ceil(this.shieldSkillCooldown)}s` : "LISTO"))}`, abilityPanelX + 12, abilityPanelY + 88);
    this.ctx.fillStyle = this.unlockedSkills.has("dash") ? (this.boostActive ? "yellow" : "white") : "#697386";
    this.ctx.fillText(`SP  IMPULSO  ${!this.unlockedSkills.has("dash") ? "BLOQUEADO" : (this.boostActive ? `ACTIVO ${Math.ceil(this.boostTime)}s` : (this.dashCooldown > 0 ? `${Math.ceil(this.dashCooldown)}s` : "LISTO"))}`, abilityPanelX + 12, abilityPanelY + 112);
    this.ctx.fillStyle = this.unlockedSkills.has("barrage") ? "#f9a8d4" : "#697386";
    this.ctx.fillText(`X  BARRIDO  ${!this.unlockedSkills.has("barrage") ? "BLOQUEADO" : (this.barrageCooldown > 0 ? `${Math.ceil(this.barrageCooldown)}s` : "LISTO")}`, abilityPanelX + 12, abilityPanelY + 136);

    const attackName: Record<AttackId, string> = {
      pulse: "PULSO",
      spread: "DISPERSION",
      rapid: "RAFAGA",
      heavy: "IMPACTO",
      arc: "ARCO",
      meteor: "METEORO",
      pierce: "PUNTERA"
    };
    const legacyMultiplier = this.score >= 1000 ? 7 : this.score >= 500 ? 5 : this.enemiesKilled >= 15 ? 3 : 1;
    this.ctx.fillStyle = "#ffd54a";
    this.ctx.font = "7px 'Press Start 2P'";
    const attackStatus = this.selectedAttack !== "pulse"
      ? `${attackName[this.selectedAttack]} ACTIVO`
      : legacyMultiplier > 1 ? `${legacyMultiplier}x DISPARO` : "DISPARO PULSO";
    this.ctx.fillText(attackStatus, abilityPanelX + 12, abilityPanelY + 94);
    this.ctx.fillStyle = this.shieldActive ? "#67e8f9" : "#64748b";
    this.ctx.fillText(this.shieldActive ? `ESCUDO  ${Math.ceil(this.shieldTime)}s` : "ESCUDO  INACTIVO", abilityPanelX + 12, abilityPanelY + 118);
    this.ctx.fillStyle = this.boostActive ? "#facc15" : "#64748b";
    this.ctx.fillText(this.boostActive ? `IMPULSO  ${Math.ceil(this.boostTime)}s` : "IMPULSO  INACTIVO", abilityPanelX + 12, abilityPanelY + 138);

    const boss = this.enemies.find(enemy => enemy.isBoss);
    if (boss) {
      const bossBarWidth = Math.max(120, Math.min(320, this.width - 40));
      const bossBarX = (this.width - bossBarWidth) / 2;
      const bossBarY = this.height - 42;
      this.ctx.textAlign = "center";
      this.ctx.font = "10px 'Press Start 2P'";
      this.ctx.fillStyle = "#ff7cff";
      this.ctx.fillText(
        boss.isCampaignBoss ? "JEFE FINAL" : `BOSS ${this.bossCount}`,
        this.width / 2,
        bossBarY - 18
      );
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      this.ctx.fillRect(bossBarX, bossBarY, bossBarWidth, 12);
      this.ctx.fillStyle = "#ff3bf5";
      this.ctx.fillRect(bossBarX, bossBarY, bossBarWidth * Math.max(0, boss.hp / boss.maxHp), 12);
      this.ctx.strokeStyle = "#ffffff";
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(bossBarX, bossBarY, bossBarWidth, 12);
      this.ctx.textAlign = "left";
    }
    
    // Hit flash overlay (white → red pulse)
    if (this.hitFlashTimer > 0) {
      const progress = this.hitFlashTimer / this.HIT_FLASH_DURATION;
      const flashPhase = Math.floor(progress * 6) % 2; // alternates 0/1
      const alpha = progress * 0.55;
      if (flashPhase === 0) {
        this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      } else {
        this.ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
      }
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // Damage text (stays on screen longer than flash)
    if (this.damageTextTimer > 0) {
      const textProgress = this.damageTextTimer / 1.5;
      const textAlpha = Math.min(1, textProgress * 2);
      const textY = this.height / 2 - 80 + (1 - textProgress) * 50;
      this.ctx.save();
      this.ctx.globalAlpha = textAlpha;
      this.ctx.fillStyle = "white";
      this.ctx.strokeStyle = "red";
      this.ctx.lineWidth = 3;
      this.ctx.font = "36px 'Press Start 2P'";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.strokeText(`-${this.lastDamageAmount} VIDA!`, this.width / 2, textY);
      this.ctx.fillText(`-${this.lastDamageAmount} VIDA!`, this.width / 2, textY);
      this.ctx.restore();
    }

    if (this.deathAnimationTime !== null) {
      const progress = Math.min(this.deathAnimationTime / this.DEATH_ANIMATION_DURATION, 1);
      const pulse = 0.5 + Math.sin(this.deathAnimationTime * 32) * 0.5;
      this.ctx.save();
      this.ctx.globalAlpha = (1 - progress) * (0.12 + pulse * 0.18);
      this.ctx.fillStyle = "#ff254f";
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
    }

    // Invincibility indicator
    if (this.invincibilityTime > 0) {
      this.ctx.save();
      this.ctx.font = "10px 'Press Start 2P'";
      this.ctx.fillStyle = `rgba(255,255,100,${0.5 + Math.sin(Date.now() * 0.01) * 0.5})`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "top";
      this.ctx.fillText(`INVINCIBLE ${Math.ceil(this.invincibilityTime)}s`, this.width / 2, 15);
      this.ctx.restore();
    }

    // Draw crosshair
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.mousePos.x - 10, this.mousePos.y);
    this.ctx.lineTo(this.mousePos.x + 10, this.mousePos.y);
    this.ctx.moveTo(this.mousePos.x, this.mousePos.y - 10);
    this.ctx.lineTo(this.mousePos.x, this.mousePos.y + 10);
    this.ctx.stroke();

    if (this.portalTransition) {
      this.drawPortalTransition(this.portalTransition);
    }
  }

  private drawPortalTransition(transition: PortalTransition) {
    const progress = Math.min(transition.elapsed / transition.duration, 1);
    const switched = progress >= 0.5;
    const phaseProgress = switched ? (progress - 0.5) * 2 : progress * 2;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const maxRadius = Math.hypot(this.width, this.height);
    const glowColors = ["#78eaff", "#32d8ff", "#a5f27a", "#ff754f"];
    const glowColor = glowColors[transition.portal.targetMap] ?? glowColors[0];

    this.ctx.save();
    if (!switched) {
      const radius = 12 + maxRadius * phaseProgress;
      const fade = Math.min(0.9, phaseProgress * 1.2);
      this.ctx.fillStyle = `rgba(2, 4, 18, ${fade})`;
      this.ctx.fillRect(0, 0, this.width, this.height);

      this.ctx.translate(centerX, centerY);
      this.ctx.globalAlpha = 0.35 + phaseProgress * 0.65;
      this.ctx.strokeStyle = glowColor;
      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = 18;
      for (let ray = 0; ray < 28; ray++) {
        const angle = (ray / 28) * Math.PI * 2;
        const innerRadius = Math.max(8, radius * (0.18 + ((ray * 17) % 11) / 20));
        const outerRadius = maxRadius;
        this.ctx.lineWidth = ray % 3 === 0 ? 3 : 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
        this.ctx.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
        this.ctx.stroke();
      }

      const vortex = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      vortex.addColorStop(0, "#02030b");
      vortex.addColorStop(0.72, "#080b1d");
      vortex.addColorStop(0.9, glowColor);
      vortex.addColorStop(1, "rgba(0, 0, 0, 0)");
      this.ctx.fillStyle = vortex;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      const fade = Math.max(0, 1 - phaseProgress * 1.8);
      this.ctx.fillStyle = `rgba(2, 4, 18, ${fade})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.globalAlpha = (1 - phaseProgress) * 0.45;
      this.ctx.strokeStyle = glowColor;
      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = 20;
      this.ctx.lineWidth = 4;
      for (let ring = 0; ring < 4; ring++) {
        const radius = (phaseProgress * 1.4 + ring * 0.22) * maxRadius * 0.55;
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY, radius, radius * 0.58, 0, 0, Math.PI * 2);
        this.ctx.stroke();
      }
    }
    this.ctx.restore();
  }
}
