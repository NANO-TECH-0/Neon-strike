import { useState } from "react";
import { Check, Coins, Crosshair, Plane, X, Zap } from "lucide-react";
import {
  ATTACKS,
  buyOrEquipItem,
  getDailyMissions,
  getMissionDifficultyTier,
  PLANES,
  SKILLS,
  type SkillId,
  type GameProgression,
  type ShopItem
} from "@/game/progression";

interface HangarDialogProps {
  progression: GameProgression;
  onProgressionChange: (next: GameProgression) => void;
  onClose: () => void;
}

type HangarTab = "planes" | "attacks" | "skills" | "missions";

export function HangarDialog({ progression, onProgressionChange, onClose }: HangarDialogProps) {
  const [tab, setTab] = useState<HangarTab>("planes");
  const missions = getDailyMissions(progression);
  const difficultyTier = getMissionDifficultyTier(progression);

  const renderShopItem = (item: ShopItem, category: "plane" | "attack" | "skill") => {
    const unlocked = category === "plane"
      ? progression.unlockedPlanes.includes(item.id as GameProgression["selectedPlane"])
      : category === "attack"
        ? progression.unlockedAttacks.includes(item.id as GameProgression["selectedAttack"])
        : (progression.unlockedSkills ?? []).includes(item.id as SkillId);
    const selected = category === "plane"
      ? progression.selectedPlane === item.id
      : category === "attack" && progression.selectedAttack === item.id;
    const affordable = progression.coins >= item.cost;

    return (
      <article key={item.id} className="rounded-xl border border-cyan-400/30 bg-slate-950/80 p-4 text-left">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm text-white">{item.name}</h3>
          {selected && <Check className="h-5 w-5 text-emerald-300" aria-label="Equipado" />}
        </div>
        <p className="mt-2 min-h-10 text-sm text-slate-300">{item.description}</p>
        <button
          type="button"
          disabled={selected || (category === "skill" && unlocked) || (!unlocked && !affordable)}
          onClick={() => {
            const next = buyOrEquipItem(progression, item, category);
            if (next) onProgressionChange(next);
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-fuchsia-400/60 px-3 py-2 text-xs font-bold text-fuchsia-100 transition hover:bg-fuchsia-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {selected ? "EQUIPADO" : category === "skill" && unlocked ? "COMPRADA" : unlocked ? "EQUIPAR" : (
            <><Coins className="h-4 w-4 text-yellow-300" />{item.cost} COMPRAR</>
          )}
        </button>
      </article>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md">
      <section
        aria-labelledby="hangar-title"
        aria-modal="true"
        role="dialog"
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-cyan-400/60 bg-slate-950 text-white shadow-[0_0_40px_rgba(34,211,238,0.2)]"
      >
        <header className="flex items-center justify-between border-b border-cyan-400/20 p-5">
          <div>
            <h2 id="hangar-title" className="font-display text-xl text-cyan-200">HANGAR</h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-yellow-200">
              <Coins className="h-4 w-4" /> {progression.coins} monedas
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar hangar" className="rounded-lg p-2 text-slate-300 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </header>

        <nav className="grid grid-cols-4 gap-2 border-b border-cyan-400/20 p-3">
          {([
            ["planes", "AVIONES", Plane],
            ["attacks", "ATAQUES", Crosshair],
            ["skills", "HABILIDADES", Zap],
            ["missions", "MISIONES", Check]
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center justify-center gap-2 rounded-lg py-3 text-xs font-bold transition ${
                tab === id ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-300/60" : "text-slate-400 hover:bg-white/5"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>

        <div className="overflow-y-auto p-4 sm:p-5">
          {tab === "planes" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {PLANES.map(item => renderShopItem(item, "plane"))}
            </div>
          )}
          {tab === "attacks" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {ATTACKS.map(item => renderShopItem(item, "attack"))}
            </div>
          )}
          {tab === "skills" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {SKILLS.map(item => renderShopItem(item, "skill"))}
            </div>
          )}
          {tab === "missions" && (
            <div className="space-y-3">
              <div className="rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 p-3 text-center text-xs text-fuchsia-100">
                MISIÓN DIARIA · CICLO {difficultyTier + 1}
                <span className="mt-1 block text-slate-300">La dificultad aumenta cada 7 días. Las misiones y el progreso se renuevan diariamente.</span>
              </div>
              {missions.map(mission => {
                const current = Math.min(progression.stats[mission.event], mission.target);
                const complete = progression.claimedMissions.includes(mission.id);
                return (
                  <article key={mission.id} className="rounded-xl border border-cyan-400/25 bg-slate-900/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-cyan-100">{mission.title}</h3>
                        <p className="mt-1 text-sm text-slate-300">{mission.description}</p>
                      </div>
                      <span className="flex items-center gap-1 text-sm text-yellow-200">
                        <Coins className="h-4 w-4" /> +{mission.reward}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" style={{ width: `${(current / mission.target) * 100}%` }} />
                    </div>
                    <p className="mt-2 text-right text-xs text-slate-400">
                      {complete ? "RECOMPENSA COBRADA" : `${current.toLocaleString()} / ${mission.target.toLocaleString()}`}
                    </p>
                  </article>
                );
              })}
              <p className="text-center text-xs text-slate-400">Las monedas aparecen con 3 % de probabilidad al derrotar enemigos. Las recompensas se acreditan automáticamente al completar la misión.</p>
            </div>
          )}
        </div>

        <footer className="border-t border-cyan-400/20 p-4 text-center text-xs text-slate-400">
          Reúne monedas durante las partidas para desbloquear mejoras.
        </footer>
      </section>
    </div>
  );
}
