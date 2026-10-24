import type { GameProgressEvent } from "./progression";

export interface GameLevel {
  title: string;
  objectives: GameObjective[];
}

export interface GameObjective {
  description: string;
  event: GameProgressEvent;
  target: number;
}

export interface CampaignSave {
  levelIndex: number;
  objectiveProgress: number[];
  completed: boolean;
}

const CAMPAIGN_STORAGE_KEY = "neon-strike-campaign-v1";

export const GAME_LEVELS: GameLevel[] = [
  {
    title: "Primera patrulla",
    objectives: [
      { description: "Derrota enemigos", event: "enemy", target: 20 },
      { description: "Consigue puntos", event: "score", target: 350 }
    ]
  },
  {
    title: "Zona de combate",
    objectives: [
      { description: "Consigue puntos", event: "score", target: 1800 },
      { description: "Derrota enemigos", event: "enemy", target: 45 }
    ]
  },
  {
    title: "Salto dimensional",
    objectives: [
      { description: "Cruza portales", event: "portal", target: 2 },
      { description: "Derrota enemigos", event: "enemy", target: 35 }
    ]
  },
  {
    title: "As del escuadrón",
    objectives: [
      { description: "Derrota enemigos", event: "enemy", target: 65 },
      { description: "Consigue puntos", event: "score", target: 2200 }
    ]
  },
  {
    title: "Lluvia de meteoritos",
    objectives: [
      { description: "Consigue puntos", event: "score", target: 4000 },
      { description: "Cruza portales", event: "portal", target: 3 },
      { description: "Derrota enemigos", event: "enemy", target: 80 }
    ]
  },
  {
    title: "Última frontera",
    objectives: [
      { description: "Derrota enemigos", event: "enemy", target: 120 },
      { description: "Consigue puntos", event: "score", target: 5000 },
      { description: "Cruza portales", event: "portal", target: 4 }
    ]
  },
  {
    title: "Cascada estelar",
    objectives: [
      { description: "Derrota enemigos", event: "enemy", target: 145 },
      { description: "Consigue puntos", event: "score", target: 6200 },
      { description: "Cruza portales", event: "portal", target: 5 }
    ]
  },
  {
    title: "Núcleo vivo",
    objectives: [
      { description: "Derrota enemigos", event: "enemy", target: 170 },
      { description: "Consigue puntos", event: "score", target: 7800 },
      { description: "Cruza portales", event: "portal", target: 6 }
    ]
  }
];

export const DEFAULT_CAMPAIGN_SAVE: CampaignSave = {
  levelIndex: 0,
  objectiveProgress: [],
  completed: false
};

export function loadCampaignSave(): CampaignSave {
  try {
    const serialized = localStorage.getItem(CAMPAIGN_STORAGE_KEY);
    if (!serialized) return { ...DEFAULT_CAMPAIGN_SAVE };
    const saved = JSON.parse(serialized) as Partial<CampaignSave>;
    const levelIndex = Number.isInteger(saved.levelIndex)
      ? Math.max(0, Math.min(GAME_LEVELS.length - 1, saved.levelIndex!))
      : 0;
    const objectives = GAME_LEVELS[levelIndex].objectives;
    const savedProgress = Array.isArray(saved.objectiveProgress)
      ? saved.objectiveProgress
      : Number.isFinite(saved.objectiveProgress)
        ? [saved.objectiveProgress]
        : [];
    return {
      levelIndex,
      objectiveProgress: objectives.map((objective, index) => {
        const progress = savedProgress[index];
        return Number.isFinite(progress)
          ? Math.min(objective.target, Math.max(0, Math.floor(progress!)))
          : 0;
      }),
      completed: saved.completed === true
    };
  } catch (error) {
    console.error("No se pudo cargar el avance de la campaña.", error);
    return { ...DEFAULT_CAMPAIGN_SAVE };
  }
}

export function saveCampaign(save: CampaignSave): void {
  try {
    localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(save));
  } catch (error) {
    console.error("No se pudo guardar el avance de la campaña.", error);
  }
}
