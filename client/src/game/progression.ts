export type GameProgressEvent = "coin" | "enemy" | "portal" | "score";
export type AttackId = "pulse" | "spread" | "rapid" | "heavy" | "arc" | "meteor" | "pierce";
export type PlaneId = "viper" | "manta" | "wraith" | "inferno" | "phantom" | "atlas";
export type SkillId = "laser" | "nova" | "boost" | "shield" | "dash" | "barrage";

export interface ShopItem {
  id: PlaneId | AttackId | SkillId;
  name: string;
  description: string;
  cost: number;
}

export const PLANES: ShopItem[] = [
  { id: "viper", name: "Viper", description: "Caza equilibrado", cost: 0 },
  { id: "manta", name: "Manta", description: "Alas amplias y maniobrables", cost: 650 },
  { id: "wraith", name: "Wraith", description: "Nave táctica de bosque", cost: 1400 },
  { id: "inferno", name: "Inferno", description: "Blindaje para zonas volcánicas", cost: 2600 },
  { id: "phantom", name: "Phantom", description: "Diseño sigiloso con velocidad de reacción", cost: 3600 },
  { id: "atlas", name: "Atlas", description: "Nave de apoyo con escudos reforzados", cost: 5200 }
];

export const ATTACKS: ShopItem[] = [
  { id: "pulse", name: "Pulso", description: "Disparo preciso y equilibrado", cost: 0 },
  { id: "spread", name: "Dispersión", description: "Lanza tres proyectiles abiertos", cost: 800 },
  { id: "rapid", name: "Ráfaga", description: "Dispara rápidamente en línea recta", cost: 1500 },
  { id: "heavy", name: "Impacto", description: "Proyectil lento que inflige triple daño", cost: 2800 },
  { id: "arc", name: "Arco", description: "Fuego en abanico para cubrir más ángulo", cost: 3400 },
  { id: "meteor", name: "Meteoro", description: "Salva de proyectiles de alto impacto", cost: 4700 },
  { id: "pierce", name: "Puntera", description: "Balas veloces y perforantes con alcance largo", cost: 6200 }
];

export const SKILLS: ShopItem[] = [
  { id: "laser", name: "Láser", description: "Rayo continuo que daña enemigos · Tecla E", cost: 900 },
  { id: "nova", name: "Nova", description: "Onda expansiva contra enemigos cercanos · Tecla Q", cost: 1200 },
  { id: "boost", name: "Acelerón", description: "Aumenta la velocidad de la nave durante 3 segundos · Shift", cost: 700 },
  { id: "shield", name: "Escudo", description: "Genera un escudo temporal y absorbe daño · F", cost: 1700 },
  { id: "dash", name: "Impulso", description: "Desplazamiento turbo para entrar y salir del combate · Space", cost: 2100 },
  { id: "barrage", name: "Barrido", description: "Ráfaga radial que limpia a los enemigos cercanos · X", cost: 2800 }
];

export interface Mission {
  id: string;
  title: string;
  description: string;
  event: GameProgressEvent;
  target: number;
  reward: number;
}

interface MissionTemplate extends Omit<Mission, "id"> {
  key: string;
}

const MISSION_ROTATIONS: Record<GameProgressEvent, MissionTemplate[]> = {
  coin: [
    { key: "scavenger", title: "Cazatesoros", description: "Recoge monedas", event: "coin", target: 3, reward: 80 },
    { key: "gold-rush", title: "Fiebre del oro", description: "Recoge monedas", event: "coin", target: 5, reward: 100 },
    { key: "coin-hunter", title: "Coleccionista", description: "Recoge monedas", event: "coin", target: 8, reward: 130 },
    { key: "treasure-route", title: "Ruta del tesoro", description: "Recoge monedas", event: "coin", target: 12, reward: 160 }
  ],
  enemy: [
    { key: "patrol", title: "Patrulla", description: "Derrota enemigos", event: "enemy", target: 25, reward: 100 },
    { key: "ace", title: "As del combate", description: "Derrota enemigos", event: "enemy", target: 50, reward: 140 },
    { key: "hunter", title: "Cazador", description: "Derrota enemigos", event: "enemy", target: 80, reward: 180 },
    { key: "squadron", title: "Escuadrón enemigo", description: "Derrota enemigos", event: "enemy", target: 120, reward: 220 }
  ],
  portal: [
    { key: "first-jump", title: "Salto dimensional", description: "Cruza portales", event: "portal", target: 1, reward: 100 },
    { key: "wayfinder", title: "Navegante", description: "Cruza portales", event: "portal", target: 2, reward: 140 },
    { key: "explorer", title: "Explorador", description: "Cruza portales", event: "portal", target: 4, reward: 180 },
    { key: "dimension-hopper", title: "Viajero dimensional", description: "Cruza portales", event: "portal", target: 6, reward: 220 }
  ],
  score: [
    { key: "warmup", title: "Calentamiento", description: "Consigue puntos", event: "score", target: 2000, reward: 100 },
    { key: "veteran", title: "Piloto veterano", description: "Consigue puntos", event: "score", target: 4000, reward: 140 },
    { key: "high-score", title: "Puntuación alta", description: "Consigue puntos", event: "score", target: 7000, reward: 180 },
    { key: "ace-score", title: "As de la puntuación", description: "Consigue puntos", event: "score", target: 11000, reward: 220 }
  ]
};

const MISSION_EVENTS: GameProgressEvent[] = ["coin", "enemy", "portal", "score"];
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface GameProgression {
  coins: number;
  unlockedPlanes: PlaneId[];
  selectedPlane: PlaneId;
  unlockedAttacks: AttackId[];
  selectedAttack: AttackId;
  unlockedSkills: SkillId[];
  stats: Record<GameProgressEvent, number>;
  claimedMissions: string[];
  missionDay: string;
  progressionStartedAt: string;
}

const STORAGE_KEY = "neon-strike-progression-v1";
const PLANE_IDS = PLANES.map(({ id }) => id) as PlaneId[];
const ATTACK_IDS = ATTACKS.map(({ id }) => id) as AttackId[];
const SKILL_IDS = SKILLS.map(({ id }) => id) as SkillId[];

export const DEFAULT_PROGRESSION: GameProgression = {
  coins: 0,
  unlockedPlanes: ["viper"],
  selectedPlane: "viper",
  unlockedAttacks: ["pulse"],
  selectedAttack: "pulse",
  unlockedSkills: [],
  stats: { coin: 0, enemy: 0, portal: 0, score: 0 },
  claimedMissions: [],
  missionDay: "",
  progressionStartedAt: ""
};

function getUtcDay(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function getDayIndex(startedAt: string, now: number): number {
  const startedAtTimestamp = Date.parse(startedAt);
  if (!Number.isFinite(startedAtTimestamp)) return 0;
  const start = Date.parse(`${getUtcDay(startedAtTimestamp)}T00:00:00.000Z`);
  const today = Date.parse(`${getUtcDay(now)}T00:00:00.000Z`);
  return Math.max(0, Math.floor((today - start) / DAY_IN_MS));
}

export function ensureMissionCycle(progression: GameProgression, now = Date.now()): GameProgression {
  const missionDay = getUtcDay(now);
  const hasValidStartDate = Number.isFinite(Date.parse(progression.progressionStartedAt));
  if (progression.missionDay === missionDay && hasValidStartDate) return progression;
  return {
    ...progression,
    missionDay,
    progressionStartedAt: hasValidStartDate ? progression.progressionStartedAt : new Date(now).toISOString(),
    stats: { coin: 0, enemy: 0, portal: 0, score: 0 },
    claimedMissions: []
  };
}

export function getDailyMissions(progression: GameProgression, now = Date.now()): Mission[] {
  const current = ensureMissionCycle(progression, now);
  const dayIndex = getDayIndex(current.progressionStartedAt, now);
  const difficultyTier = Math.floor(dayIndex / 7);
  return MISSION_EVENTS.map((event, eventIndex) => {
    const templates = MISSION_ROTATIONS[event];
    const template = templates[(dayIndex + eventIndex) % templates.length];
    const target = Math.ceil(template.target * (1 + difficultyTier * 0.35));
    return {
      id: `${current.missionDay}-${template.key}`,
      title: template.title,
      description: `${template.description} ${target.toLocaleString()}`,
      event,
      target,
      reward: Math.floor(template.reward * (1 + difficultyTier * 0.1))
    };
  });
}

export function getMissionDifficultyTier(progression: GameProgression, now = Date.now()): number {
  const current = ensureMissionCycle(progression, now);
  return Math.floor(getDayIndex(current.progressionStartedAt, now) / 7);
}

export function loadProgression(): GameProgression {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      return ensureMissionCycle({ ...DEFAULT_PROGRESSION, stats: { ...DEFAULT_PROGRESSION.stats } });
    }
    const saved = JSON.parse(serialized) as Partial<GameProgression>;
    const unlockedPlanes = Array.isArray(saved.unlockedPlanes)
      ? saved.unlockedPlanes.filter((id): id is PlaneId => PLANE_IDS.includes(id as PlaneId))
      : [];
    const unlockedAttacks = Array.isArray(saved.unlockedAttacks)
      ? saved.unlockedAttacks.filter((id): id is AttackId => ATTACK_IDS.includes(id as AttackId))
      : [];
    const unlockedSkills = Array.isArray(saved.unlockedSkills)
      ? saved.unlockedSkills.filter((id): id is SkillId => SKILL_IDS.includes(id as SkillId))
      : [];
    const stats = saved.stats && typeof saved.stats === "object" ? saved.stats : DEFAULT_PROGRESSION.stats;
    const loaded: GameProgression = {
      coins: Number.isFinite(saved.coins) ? Math.max(0, Math.floor(saved.coins!)) : 0,
      unlockedPlanes: Array.from(new Set(["viper" as PlaneId, ...unlockedPlanes])),
      selectedPlane: unlockedPlanes.includes(saved.selectedPlane as PlaneId) ? saved.selectedPlane as PlaneId : "viper",
      unlockedAttacks: Array.from(new Set(["pulse" as AttackId, ...unlockedAttacks])),
      selectedAttack: unlockedAttacks.includes(saved.selectedAttack as AttackId) ? saved.selectedAttack as AttackId : "pulse",
      unlockedSkills: Array.from(new Set(unlockedSkills)),
      stats: {
        coin: Number.isFinite(stats.coin) ? Math.max(0, Math.floor(stats.coin)) : 0,
        enemy: Number.isFinite(stats.enemy) ? Math.max(0, Math.floor(stats.enemy)) : 0,
        portal: Number.isFinite(stats.portal) ? Math.max(0, Math.floor(stats.portal)) : 0,
        score: Number.isFinite(stats.score) ? Math.max(0, Math.floor(stats.score)) : 0
      },
      claimedMissions: Array.isArray(saved.claimedMissions)
        ? saved.claimedMissions.filter((id): id is string => typeof id === "string")
        : [],
      missionDay: typeof saved.missionDay === "string" ? saved.missionDay : "",
      progressionStartedAt: typeof saved.progressionStartedAt === "string" ? saved.progressionStartedAt : ""
    };
    return ensureMissionCycle(loaded);
  } catch (error) {
    console.error("No se pudo cargar el progreso guardado del juego.", error);
    return ensureMissionCycle({ ...DEFAULT_PROGRESSION, stats: { ...DEFAULT_PROGRESSION.stats } });
  }
}

export function saveProgression(progression: GameProgression): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progression));
  } catch (error) {
    console.error("No se pudo guardar el progreso del juego.", error);
  }
}

export function mergeAccountProgression(local: GameProgression, remote: unknown): GameProgression {
  if (typeof remote !== "object" || remote === null) return ensureMissionCycle(local);
  const saved = remote as Partial<GameProgression>;
  if (!Number.isFinite(saved.coins)) return ensureMissionCycle(local);
  const remotePlanes = Array.isArray(saved.unlockedPlanes)
    ? saved.unlockedPlanes.filter((id): id is PlaneId => PLANE_IDS.includes(id as PlaneId))
    : [];
  const remoteAttacks = Array.isArray(saved.unlockedAttacks)
    ? saved.unlockedAttacks.filter((id): id is AttackId => ATTACK_IDS.includes(id as AttackId))
    : [];
  const remoteSkills = Array.isArray(saved.unlockedSkills)
    ? saved.unlockedSkills.filter((id): id is SkillId => SKILL_IDS.includes(id as SkillId))
    : [];
  const unlockedPlanes = Array.from(new Set([...local.unlockedPlanes, ...remotePlanes, "viper" as PlaneId]));
  const unlockedAttacks = Array.from(new Set([...local.unlockedAttacks, ...remoteAttacks, "pulse" as AttackId]));
  const unlockedSkills = Array.from(new Set([...(local.unlockedSkills ?? []), ...remoteSkills]));
  const sameMissionDay = Boolean(local.missionDay && local.missionDay === saved.missionDay);
  const remoteStats = saved.stats && typeof saved.stats === "object" ? saved.stats : DEFAULT_PROGRESSION.stats;
  const localMissionCycle = ensureMissionCycle(local);
  return ensureMissionCycle({
    ...localMissionCycle,
    coins: Math.max(local.coins, Math.floor(saved.coins!)),
    unlockedPlanes,
    selectedPlane: unlockedPlanes.includes(saved.selectedPlane as PlaneId)
      ? saved.selectedPlane as PlaneId
      : local.selectedPlane,
    unlockedAttacks,
    unlockedSkills,
    selectedAttack: unlockedAttacks.includes(saved.selectedAttack as AttackId)
      ? saved.selectedAttack as AttackId
      : local.selectedAttack,
    stats: sameMissionDay ? {
      coin: Math.max(local.stats.coin, Number.isFinite(remoteStats.coin) ? remoteStats.coin : 0),
      enemy: Math.max(local.stats.enemy, Number.isFinite(remoteStats.enemy) ? remoteStats.enemy : 0),
      portal: Math.max(local.stats.portal, Number.isFinite(remoteStats.portal) ? remoteStats.portal : 0),
      score: Math.max(local.stats.score, Number.isFinite(remoteStats.score) ? remoteStats.score : 0)
    } : localMissionCycle.stats,
    claimedMissions: sameMissionDay && Array.isArray(saved.claimedMissions)
      ? Array.from(new Set([...local.claimedMissions, ...saved.claimedMissions.filter((id): id is string => typeof id === "string")]))
      : localMissionCycle.claimedMissions,
    missionDay: localMissionCycle.missionDay,
    progressionStartedAt: localMissionCycle.progressionStartedAt
  });
}

export function recordProgressEvent(
  progression: GameProgression,
  event: GameProgressEvent,
  amount = 1
): GameProgression {
  progression = ensureMissionCycle(progression);
  const next = {
    ...progression,
    stats: { ...progression.stats },
    unlockedPlanes: [...progression.unlockedPlanes],
    unlockedAttacks: [...progression.unlockedAttacks],
    unlockedSkills: [...(progression.unlockedSkills ?? [])],
    claimedMissions: [...progression.claimedMissions]
  };
  const increment = Math.max(0, Math.floor(amount));
  next.stats[event] += increment;
  if (event === "coin") next.coins += increment * 25;

  for (const mission of getDailyMissions(next)) {
    if (
      mission.event === event &&
      next.stats[event] >= mission.target &&
      !next.claimedMissions.includes(mission.id)
    ) {
      next.coins += mission.reward;
      next.claimedMissions.push(mission.id);
    }
  }
  return next;
}

export function buyOrEquipItem(
  progression: GameProgression,
  item: ShopItem,
  category: "plane" | "attack" | "skill"
): GameProgression | null {
  const unlocked = category === "plane"
    ? progression.unlockedPlanes.includes(item.id as PlaneId)
    : category === "attack"
      ? progression.unlockedAttacks.includes(item.id as AttackId)
      : (progression.unlockedSkills ?? []).includes(item.id as SkillId);
  if (!unlocked && progression.coins < item.cost) return null;

  const next: GameProgression = {
    ...progression,
    coins: progression.coins - (unlocked ? 0 : item.cost),
    unlockedPlanes: [...progression.unlockedPlanes],
    unlockedAttacks: [...progression.unlockedAttacks],
    unlockedSkills: [...(progression.unlockedSkills ?? [])],
    stats: { ...progression.stats },
    claimedMissions: [...progression.claimedMissions]
  };
  if (category === "plane") {
    const id = item.id as PlaneId;
    if (!unlocked) next.unlockedPlanes.push(id);
    next.selectedPlane = id;
  } else if (category === "attack") {
    const id = item.id as AttackId;
    if (!unlocked) next.unlockedAttacks.push(id);
    next.selectedAttack = id;
  } else if (!unlocked) {
    next.unlockedSkills.push(item.id as SkillId);
  }
  return next;
}
