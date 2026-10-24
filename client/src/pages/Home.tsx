import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { GameEngine, MAP_NAMES } from "@/game/engine";
import {
  GAME_LEVELS,
  loadCampaignSave,
  saveCampaign,
  type CampaignSave
} from "@/game/levels";
import { ScoreFormDialog } from "@/components/ScoreFormDialog";
import { HangarDialog } from "@/components/HangarDialog";
import { AccountPanel } from "@/components/AccountPanel";
import {
  loadProgression,
  ensureMissionCycle,
  recordProgressEvent,
  saveProgression,
  type GameProgression
} from "@/game/progression";
import { Coins, Trophy, Play, Wrench, UserRound } from "lucide-react";

type GameMode = "free" | "levels";
type GameState = "MENU" | "PLAYING" | "BOSS_INTRO" | "LEVEL_COMPLETE" | "CAMPAIGN_COMPLETE" | "GAME_OVER";

interface AccountUser {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  provider: "google" | "facebook";
  countryCode: string | null;
  countryName: string | null;
  regionCode: string | null;
  regionName: string | null;
  cityName: string | null;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [, setLocation] = useLocation();
  
  const [gameState, setGameState] = useState<GameState>("MENU");
  const [gameMode, setGameMode] = useState<GameMode>("free");
  const gameModeRef = useRef<GameMode>("free");
  const [levelIndex, setLevelIndex] = useState(0);
  const levelIndexRef = useRef(0);
  const [levelProgress, setLevelProgress] = useState<number[]>([]);
  const levelProgressRef = useRef<number[]>([]);
  const campaignBossPendingRef = useRef(false);
  const levelAdvanceTimeoutRef = useRef<number | null>(null);
  const bossIntroTimeoutRef = useRef<number | null>(null);
  const bossWarningTimeoutRef = useRef<number | null>(null);
  const [campaignSave, setCampaignSave] = useState<CampaignSave>(() => loadCampaignSave());
  const [selectedCampaignLevel, setSelectedCampaignLevel] = useState(() => {
    const saved = loadCampaignSave();
    return saved.completed ? 0 : saved.levelIndex;
  });
  const [hasCompletedAccountStep, setHasCompletedAccountStep] = useState(false);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showHangar, setShowHangar] = useState(false);
  const [showLevelSelector, setShowLevelSelector] = useState(false);
  const [bossFightActive, setBossFightActive] = useState(false);
  const [bossAttackWarning, setBossAttackWarning] = useState(false);
  const [progression, setProgression] = useState<GameProgression>(() => loadProgression());
  const [accountUser, setAccountUser] = useState<AccountUser | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || gameState !== "PLAYING") return;

      if (isPaused) {
        engineRef.current?.resume();
        setIsPaused(false);
      } else {
        engineRef.current?.pause();
        setIsPaused(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, isPaused]);

  // Initialize engine on mount
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    engine.onScoreUpdate = (s) => setScore(s);
    engine.onBossAttackWarning = (active) => {
      if (bossWarningTimeoutRef.current !== null) {
        window.clearTimeout(bossWarningTimeoutRef.current);
        bossWarningTimeoutRef.current = null;
      }
      setBossAttackWarning(active);
      if (active) {
        bossWarningTimeoutRef.current = window.setTimeout(() => {
          setBossAttackWarning(false);
          bossWarningTimeoutRef.current = null;
        }, 1100);
      }
    };
    engine.onCampaignBossDefeated = () => {
      setBossFightActive(false);
      setBossAttackWarning(false);
      const savedCampaign = loadCampaignSave();
      const lastLevel = levelIndexRef.current === GAME_LEVELS.length - 1;
      if (levelIndexRef.current >= savedCampaign.levelIndex || lastLevel) {
        const nextSave: CampaignSave = {
          levelIndex: lastLevel
            ? levelIndexRef.current
            : Math.max(savedCampaign.levelIndex, levelIndexRef.current + 1),
          objectiveProgress: [],
          completed: savedCampaign.completed || lastLevel
        };
        saveCampaign(nextSave);
        setCampaignSave(nextSave);
        setSelectedCampaignLevel(lastLevel ? levelIndexRef.current : nextSave.levelIndex);
      }
      campaignBossPendingRef.current = false;
      setGameState(lastLevel ? "CAMPAIGN_COMPLETE" : "LEVEL_COMPLETE");
    };
    engine.onProgressEvent = (event, amount) => {
      if (gameModeRef.current === "levels") {
        const level = GAME_LEVELS[levelIndexRef.current];
        const nextProgress = level.objectives.map((objective, index) => {
          const currentProgress = levelProgressRef.current[index] ?? 0;
          return objective.event === event
            ? Math.min(objective.target, currentProgress + amount)
            : currentProgress;
        });
        const progressChanged = nextProgress.some((progress, index) => progress !== levelProgressRef.current[index]);
        if (progressChanged) {
          levelProgressRef.current = nextProgress;
          setLevelProgress(nextProgress);
          const savedCampaign = loadCampaignSave();
          if (!savedCampaign.completed && levelIndexRef.current === savedCampaign.levelIndex) {
            const nextSave: CampaignSave = {
              ...savedCampaign,
              objectiveProgress: nextProgress
            };
            saveCampaign(nextSave);
            setCampaignSave(nextSave);
          }
          const objectivesComplete = level.objectives.every(
            (objective, index) => nextProgress[index] >= objective.target
          );
          if (objectivesComplete && !campaignBossPendingRef.current) {
            campaignBossPendingRef.current = true;
            engine.beginCampaignBoss(levelIndexRef.current);
            setBossFightActive(true);
            setGameState("BOSS_INTRO");
          }
        }
      }
      setProgression(current => {
        const next = recordProgressEvent(current, event, amount);
        saveProgression(next);
        return next;
      });
    };
    engine.onGameOver = (finalScore) => {
      setBossFightActive(false);
      setBossAttackWarning(false);
      if (gameModeRef.current === "levels") {
        campaignBossPendingRef.current = false;
        const resetProgress = GAME_LEVELS[levelIndexRef.current].objectives.map(() => 0);
        levelProgressRef.current = resetProgress;
        setLevelProgress(resetProgress);
        const savedCampaign = loadCampaignSave();
        if (!savedCampaign.completed && levelIndexRef.current === savedCampaign.levelIndex) {
          const resetCampaign: CampaignSave = {
            ...savedCampaign,
            objectiveProgress: resetProgress
          };
          saveCampaign(resetCampaign);
          setCampaignSave(resetCampaign);
        }
      }
      setScore(finalScore);
      setGameState("GAME_OVER");
    };

    return () => {
      if (bossWarningTimeoutRef.current !== null) window.clearTimeout(bossWarningTimeoutRef.current);
      if (bossIntroTimeoutRef.current !== null) window.clearTimeout(bossIntroTimeoutRef.current);
      engine.cleanup();
    };
  }, []);

  useEffect(() => {
    const refreshMissionCycle = () => {
      setProgression(current => {
        const next = ensureMissionCycle(current);
        if (next === current) return current;
        saveProgression(next);
        return next;
      });
    };
    const interval = window.setInterval(refreshMissionCycle, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const startGame = (mode: GameMode = gameModeRef.current, requestedLevel?: number) => {
    gameModeRef.current = mode;
    setGameMode(mode);
    const savedCampaign = mode === "levels" ? loadCampaignSave() : null;
    const startLevel = mode === "levels"
      ? Math.max(0, Math.min(GAME_LEVELS.length - 1, requestedLevel ?? (savedCampaign?.completed ? 0 : savedCampaign!.levelIndex)))
      : 0;
    const startProgress = savedCampaign && !savedCampaign.completed && startLevel === savedCampaign.levelIndex
      ? GAME_LEVELS[startLevel].objectives.map((_, index) => savedCampaign.objectiveProgress[index] ?? 0)
      : GAME_LEVELS[startLevel].objectives.map(() => 0);
    levelIndexRef.current = startLevel;
    setLevelIndex(startLevel);
    levelProgressRef.current = startProgress;
    setLevelProgress(startProgress);
    campaignBossPendingRef.current = startProgress.every(
      (progress, index) => progress >= GAME_LEVELS[startLevel].objectives[index].target
    );
    if (savedCampaign) {
      setCampaignSave(savedCampaign);
      setSelectedCampaignLevel(startLevel);
    }
    engineRef.current?.setCampaignLevel(mode === "levels" ? startLevel : 0, mode === "levels");
    engineRef.current?.setLoadout(progression.selectedPlane, progression.selectedAttack, progression.unlockedSkills);
    const resumeBossEncounter = mode === "levels" && campaignBossPendingRef.current;
    setBossFightActive(resumeBossEncounter);
    setGameState(resumeBossEncounter ? "BOSS_INTRO" : "PLAYING");
    engineRef.current?.start();
    if (resumeBossEncounter) engineRef.current?.beginCampaignBoss(startLevel);
  };

  const advanceLevel = () => {
    if (levelAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(levelAdvanceTimeoutRef.current);
      levelAdvanceTimeoutRef.current = null;
    }
    const nextLevelIndex = levelIndexRef.current + 1;
    levelIndexRef.current = nextLevelIndex;
    setLevelIndex(nextLevelIndex);
    const resetProgress = GAME_LEVELS[nextLevelIndex].objectives.map(() => 0);
    levelProgressRef.current = resetProgress;
    setLevelProgress(resetProgress);
    campaignBossPendingRef.current = false;
    engineRef.current?.setCampaignLevel(nextLevelIndex, true);
    engineRef.current?.changeCampaignMap(nextLevelIndex);
    setGameState("PLAYING");
    engineRef.current?.resume();
  };

  useEffect(() => {
    if (gameState !== "LEVEL_COMPLETE") return;
    levelAdvanceTimeoutRef.current = window.setTimeout(advanceLevel, 2800);
    return () => {
      if (levelAdvanceTimeoutRef.current !== null) {
        window.clearTimeout(levelAdvanceTimeoutRef.current);
        levelAdvanceTimeoutRef.current = null;
      }
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState !== "BOSS_INTRO") return;
    bossIntroTimeoutRef.current = window.setTimeout(() => {
      bossIntroTimeoutRef.current = null;
      setGameState("PLAYING");
    }, 2600);
    return () => {
      if (bossIntroTimeoutRef.current !== null) {
        window.clearTimeout(bossIntroTimeoutRef.current);
        bossIntroTimeoutRef.current = null;
      }
    };
  }, [gameState]);

  const returnToMenu = () => {
    engineRef.current?.stop();
    setIsPaused(false);
    setGameState("MENU");
  };

  const retryGame = () => {
    startGame(
      gameModeRef.current,
      gameModeRef.current === "levels" ? levelIndexRef.current : undefined
    );
  };

  const updateProgression = (next: GameProgression) => {
    saveProgression(next);
    setProgression(next);
  };

  const handleScoreSubmitted = () => {
    setLocation("/leaderboard");
  };

  const handleAccountUserChange = (user: AccountUser | null) => {
    setAccountUser(user);
    if (user) setHasCompletedAccountStep(true);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">
      {/* Global scanline effect */}
      <div className="scanlines" />
      <div className="vignette" />

      {/* The Game Canvas */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair"
      />

      {/* Main Menu Overlay */}
      {gameState === "MENU" && !hasCompletedAccountStep && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto bg-background/85 p-4 backdrop-blur-sm sm:p-8">
          <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
          <div className="relative z-10 my-auto w-full max-w-2xl py-4 text-center">
            <h1 className="mb-3 font-display text-4xl text-transparent bg-clip-text bg-gradient-to-b from-primary to-secondary drop-shadow-[0_0_15px_rgba(255,0,255,0.8)] sm:text-6xl">
              NEON STRIKE
            </h1>
            <p className="mb-5 text-sm text-muted-foreground sm:text-base">
              Crea tu cuenta o inicia sesión para guardar tu progreso y competir en los rankings.
            </p>
            <AccountPanel
              progression={progression}
              onProgressionChange={updateProgression}
              onUserChange={handleAccountUserChange}
            />
            <button
              type="button"
              onClick={() => setHasCompletedAccountStep(true)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/60 bg-slate-900/90 px-5 py-3 text-sm font-bold text-cyan-100 transition hover:bg-cyan-900/40 sm:w-auto"
            >
              <UserRound className="h-4 w-4" />
              {accountUser ? "CONTINUAR AL MENÚ" : "CONTINUAR COMO INVITADO"}
            </button>
          </div>
        </div>
      )}

      {gameState === "MENU" && hasCompletedAccountStep && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
          
          <div className="relative z-10 flex max-h-full w-full max-w-3xl flex-col items-center overflow-y-auto p-5 text-center sm:p-8">
            <h1 className="text-5xl md:text-8xl font-display text-transparent bg-clip-text bg-gradient-to-b from-primary to-secondary mb-4 drop-shadow-[0_0_15px_rgba(255,0,255,0.8)] filter">
              NEON
              <br />
              STRIKE
            </h1>
            <p className="text-muted-foreground font-sans text-base md:text-xl mb-5 max-w-md">
              Sobrevive en la cuadrícula. Usa WASD para moverte y el mouse para apuntar y disparar.
            </p>

            <div className="mb-5 flex items-center gap-2 rounded-full border border-yellow-300/40 bg-black/50 px-5 py-2 font-display text-xs text-yellow-200">
              <Coins className="h-4 w-4" /> {progression.coins} MONEDAS
            </div>

            <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={() => startGame("free")}
                className="flex items-center justify-center gap-3 rounded-2xl bg-primary py-4 text-sm text-white transition-all hover:-translate-y-1 hover:bg-primary/90 hover:shadow-[0_0_30px_hsl(var(--primary))] active:translate-y-0 sm:text-base"
              >
                <Play className="h-5 w-5 fill-current" />
                MODO LIBRE
              </button>

              <button
                onClick={() => setShowLevelSelector(true)}
                className="flex items-center justify-center gap-3 rounded-2xl border-2 border-cyan-300 bg-slate-950/80 py-4 text-sm text-cyan-100 transition-all hover:-translate-y-1 hover:bg-cyan-500/10 hover:shadow-[0_0_30px_hsl(var(--secondary))] active:translate-y-0 sm:text-base"
              >
                <Play className="h-5 w-5" />
                JUGAR NIVELES
              </button>

              <button
                onClick={() => setShowHangar(true)}
                className="flex items-center justify-center gap-3 rounded-2xl border-2 border-fuchsia-400 bg-card py-4 text-sm text-fuchsia-200 transition-all hover:-translate-y-1 hover:bg-fuchsia-500/10 hover:shadow-[0_0_30px_hsl(var(--primary))] sm:text-base"
              >
                <Wrench className="h-5 w-5" />
                TIENDA
              </button>

              <Link
                href="/leaderboard"
                className="flex items-center justify-center gap-3 rounded-2xl border-2 border-secondary bg-card py-4 text-sm text-secondary transition-all hover:-translate-y-1 hover:bg-secondary/10 hover:shadow-[0_0_30px_hsl(var(--secondary))] active:translate-y-0 sm:text-base"
              >
                <Trophy className="h-5 w-5" />
                RANKING
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {accountUser ? (
                <span className="rounded-full border border-cyan-300/30 bg-black/40 px-4 py-2 text-xs text-cyan-100">
                  Cuenta: {accountUser.displayName}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setHasCompletedAccountStep(false)}
                  className="rounded-full border border-slate-600 px-4 py-2 text-xs text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-100"
                >
                  REGISTRO / INICIAR SESIÓN
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showLevelSelector && gameState === "MENU" && hasCompletedAccountStep && (
        <div className="absolute inset-0 z-[65] flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md">
          <section
            aria-labelledby="level-selector-title"
            aria-modal="true"
            role="dialog"
            className="my-auto w-full max-w-2xl rounded-2xl border border-cyan-300/60 bg-slate-950 p-5 text-white shadow-[0_0_40px_rgba(34,211,238,0.25)] sm:p-8"
          >
            <h2 id="level-selector-title" className="font-display text-lg text-cyan-200 sm:text-xl">
              SELECCIONA UN NIVEL
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              Elige cualquier nivel desbloqueado. El avance guardado se conserva.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GAME_LEVELS.map((level, index) => {
                const unlocked = index <= campaignSave.levelIndex || campaignSave.completed;
                const isSavedLevel = index === campaignSave.levelIndex && !campaignSave.completed;
                return (
                  <button
                    key={level.title}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => setSelectedCampaignLevel(index)}
                    aria-pressed={selectedCampaignLevel === index}
                    className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-35 ${
                      selectedCampaignLevel === index
                        ? "border-cyan-300 bg-cyan-500/20 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.2)]"
                        : "border-slate-600 bg-slate-900/80 text-slate-200 hover:border-cyan-300/60"
                    }`}
                  >
                    <span className="block text-[10px] font-bold tracking-wider">
                      NIVEL {index + 1}{isSavedLevel ? " · TU AVANCE" : ""}
                    </span>
                    <span className="mt-1 block text-xs">{level.title}</span>
                  </button>
                );
              })}
            </div>
            {(campaignSave.levelIndex > 0 ||
              campaignSave.objectiveProgress.some(progress => progress > 0) ||
              campaignSave.completed) && (
              <p className="mt-4 text-xs text-cyan-200">
                Avance guardado: {campaignSave.completed
                  ? "campaña completada · todos los niveles desbloqueados"
                  : `hasta el nivel ${campaignSave.levelIndex + 1}`}
              </p>
            )}
            {selectedCampaignLevel === campaignSave.levelIndex && !campaignSave.completed &&
              campaignSave.objectiveProgress.some(progress => progress > 0) && (
                <div className="mt-3 space-y-2 text-left">
                  {GAME_LEVELS[selectedCampaignLevel].objectives.map((objective, index) => (
                    <p key={objective.description} className="text-xs text-cyan-200">
                      {objective.description}: {campaignSave.objectiveProgress[index] ?? 0}/{objective.target}
                    </p>
                  ))}
                  <p className="text-xs text-cyan-200">Se conserva el progreso de cada objetivo.</p>
                </div>
              )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setShowLevelSelector(false);
                  startGame("levels", selectedCampaignLevel);
                }}
                className="flex-1 rounded-xl bg-cyan-400 py-3 font-bold text-slate-950 transition hover:bg-cyan-300"
              >
                JUGAR NIVEL {selectedCampaignLevel + 1}
              </button>
              <button
                type="button"
                onClick={() => setShowLevelSelector(false)}
                className="rounded-xl border border-slate-500 px-6 py-3 font-bold text-slate-200 transition hover:bg-white/10"
              >
                VOLVER
              </button>
            </div>
          </section>
        </div>
      )}

      {showHangar && (
        <HangarDialog
          progression={progression}
          onProgressionChange={updateProgression}
          onClose={() => setShowHangar(false)}
        />
      )}

      {(gameState === "PLAYING" || gameState === "BOSS_INTRO") && gameMode === "levels" && (
        <div className="pointer-events-none absolute right-4 top-4 z-40 w-64 rounded-xl border border-cyan-300/50 bg-slate-950/85 p-4 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.2)] sm:right-6 sm:top-6">
          <p className="text-xs font-bold tracking-widest text-cyan-300">
            NIVEL {levelIndex + 1} / {GAME_LEVELS.length}
          </p>
          <p className="mt-2 text-sm font-semibold">{GAME_LEVELS[levelIndex].title}</p>
          <div className="mt-3 space-y-3">
            {GAME_LEVELS[levelIndex].objectives.map((objective, index) => {
              const current = levelProgress[index] ?? 0;
              return (
                <div key={objective.description}>
                  <div className="mb-1 flex justify-between gap-2 text-[10px]">
                    <span>{objective.description}</span>
                    <span>{current.toLocaleString()} / {objective.target.toLocaleString()}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-cyan-300 transition-all"
                      style={{ width: `${(current / objective.target) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {gameState === "BOSS_INTRO" && (
        <div className="boss-intro-backdrop absolute inset-0 z-[60] flex items-center justify-center overflow-hidden bg-slate-950/75 p-4">
          <div className="boss-intro-scanlines pointer-events-none absolute inset-0" />
          <div className="boss-intro-card relative w-full max-w-xl border-y-2 border-red-400/80 bg-black/80 px-6 py-10 text-center shadow-[0_0_50px_rgba(248,113,113,0.35)] sm:px-12">
            <p className="text-xs font-bold tracking-[0.45em] text-red-300">ALERTA DE AMENAZA</p>
            <h2 className="mt-5 font-display text-3xl text-white text-glow-primary sm:text-5xl">JEFE FINAL</h2>
            <p className="mt-4 text-sm text-red-100">
              NIVEL {levelIndex + 1} · {GAME_LEVELS[levelIndex].title}
            </p>
            <p className="mt-2 text-xs tracking-widest text-cyan-200">
              ZONA DE COMBATE: {MAP_NAMES[(levelIndex + 1) % MAP_NAMES.length]}
            </p>
            <div className="boss-intro-progress mx-auto mt-7 h-1 w-full max-w-xs bg-red-400" />
            <p className="mt-4 text-xs text-slate-300">Prepárate para el enfrentamiento...</p>
          </div>
        </div>
      )}

      {bossFightActive && gameState === "PLAYING" && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-full border border-red-400/70 bg-red-950/80 px-5 py-2 text-xs font-bold tracking-[0.2em] text-red-100 shadow-[0_0_22px_rgba(248,113,113,0.3)]">
          JEFE FINAL · NO PUEDES AVANZAR HASTA DERROTARLO
        </div>
      )}

      {bossAttackWarning && gameState === "PLAYING" && (
        <div className="boss-attack-warning pointer-events-none absolute inset-x-0 top-1/3 z-50 flex justify-center px-4">
          <div className="rounded-lg border-2 border-red-400 bg-red-950/90 px-6 py-4 text-center text-sm font-black tracking-[0.2em] text-white shadow-[0_0_35px_rgba(248,113,113,0.8)] sm:text-base">
            ¡ATAQUE POTENTE! ¡ESQUÍVALO!
          </div>
        </div>
      )}

      {gameState === "LEVEL_COMPLETE" && (
        <div className="level-complete-backdrop absolute inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black/85 p-4 backdrop-blur-sm">
          <div className="level-complete-card relative w-full max-w-md rounded-2xl border border-cyan-300/60 bg-slate-950 p-8 text-center shadow-[0_0_45px_rgba(34,211,238,0.4)]">
            <div className="level-complete-rays pointer-events-none absolute inset-0" />
            <p className="relative text-xs font-bold tracking-[0.25em] text-cyan-300">
              ¡JEFE DERROTADO!
            </p>
            <h2 className="relative mt-4 text-xl text-white">NIVEL {levelIndex + 1}: {GAME_LEVELS[levelIndex].title}</h2>
            <p className="relative mt-3 text-sm text-slate-300">
              Nivel superado. Zona siguiente: {MAP_NAMES[(levelIndex + 1) % MAP_NAMES.length]}
            </p>
            <div className="relative mx-auto mt-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="level-complete-progress h-full rounded-full bg-cyan-300" />
            </div>
            <button
              type="button"
              onClick={advanceLevel}
              className="relative mt-6 w-full rounded-xl bg-cyan-400 py-4 font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              CAMBIAR DE ZONA AHORA
            </button>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {(gameState === "GAME_OVER" || gameState === "CAMPAIGN_COMPLETE") && (
        <ScoreFormDialog 
          score={score} 
          onSubmitted={handleScoreSubmitted} 
          onRetry={gameState === "CAMPAIGN_COMPLETE" ? returnToMenu : retryGame} 
          accountName={accountUser?.displayName}
          isVictory={gameState === "CAMPAIGN_COMPLETE"}
          retryLabel={gameState === "CAMPAIGN_COMPLETE" ? "VOLVER AL MENÚ" : undefined}
        />
      )}
    
        {/* Menú de Pausa */}
        {isPaused && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <div className="bg-slate-900 border border-cyan-500/50 p-8 rounded-xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full">
              <h2 className="text-3xl font-bold text-cyan-400 tracking-wider">JUEGO PAUSADO</h2>
              
              <div className="flex flex-col gap-4 w-full">
                <button 
                  onClick={() => {
                    engineRef.current?.resume();
                    setIsPaused(false);
                  }}
                  className="w-full py-3 bg-fuchsia-600 text-white font-bold rounded-lg hover:bg-fuchsia-500 transition shadow-lg cursor-pointer"
                >
                  REANUDAR
                </button>
                
                <button 
                  onClick={() => {
                    returnToMenu();
                    setHasCompletedAccountStep(true);
                  }}
                  className="w-full py-3 bg-slate-800 border border-cyan-500 text-cyan-400 font-bold rounded-lg hover:bg-cyan-950/30 transition cursor-pointer"
                >
                  SALIR AL MENÚ
                </button>
              </div>
            </div>
          </div>
        )}

      </div> 
    );
  }
  
