import { useState } from "react";
import { Link } from "wouter";
import { LocationSelector, type LocationSelection } from "@/components/LocationSelector";
import { useScores, type LeaderboardFilter } from "@/hooks/use-scores";
import { Trophy, ChevronLeft, Loader2, AlertCircle, Search } from "lucide-react";

const RANKS: { id: LeaderboardFilter["scope"]; label: string }[] = [
  { id: "global", label: "GLOBAL" },
  { id: "national", label: "PAÍS" },
  { id: "regional", label: "REGIÓN" },
  { id: "city", label: "CIUDAD" }
];

export default function Leaderboard() {
  const [scope, setScope] = useState<LeaderboardFilter["scope"]>("global");
  const [location, setLocation] = useState<LocationSelection | null>(null);
  const [filter, setFilter] = useState<LeaderboardFilter>({ scope: "global" });
  const { data: scores, isLoading, error, isFetching } = useScores(filter);
  const needsLocation = scope !== "global";
  const canSearch = !needsLocation || Boolean(location);

  const search = () => {
    if (!canSearch) return;
    setFilter({
      scope,
      ...(location ? {
        countryCode: location.countryCode,
        regionCode: location.regionCode,
        cityName: location.cityName
      } : {})
    });
  };

  const scopeTitle = filter.scope === "global"
    ? "RANKING GLOBAL"
    : filter.scope === "national"
      ? `RANKING NACIONAL · ${location?.countryName ?? "PAÍS"}`
      : filter.scope === "regional"
        ? `RANKING REGIONAL · ${location?.regionName ?? "REGIÓN"}`
        : `RANKING CIUDAD · ${location?.cityName ?? "CIUDAD"}`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background p-4 sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-10" />
      <div className="scanlines" />
      <div className="vignette" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col pt-4 sm:pt-8">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="Volver al menú"
            className="rounded-xl border-2 border-secondary bg-card p-3 text-secondary transition-all hover:-translate-x-1 hover:bg-secondary/20 box-glow-secondary"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <Trophy className="h-7 w-7 text-accent text-glow-secondary sm:h-8 sm:w-8" />
            <h1 className="font-display text-xl text-white text-glow-primary sm:text-4xl">HALL OF FAME</h1>
          </div>
          <div className="h-12 w-12" />
        </div>

        <section className="mb-5 space-y-4 rounded-2xl border border-cyan-300/30 bg-slate-950/90 p-4 sm:p-6">
          <h2 className="font-display text-sm text-cyan-100">ELIGE EL RANKING</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RANKS.map(rank => (
              <button
                key={rank.id}
                type="button"
                onClick={() => setScope(rank.id)}
                className={`rounded-lg border px-3 py-3 text-xs font-bold tracking-wider transition ${
                  scope === rank.id
                    ? "border-cyan-300 bg-cyan-400/20 text-cyan-100"
                    : "border-slate-700 text-slate-300 hover:border-cyan-300/50"
                }`}
              >
                {rank.label}
              </button>
            ))}
          </div>
          {needsLocation && (
            <>
              <p className="text-sm text-slate-300">Selecciona país, región y ciudad para buscar entre las puntuaciones guardadas en esa ubicación.</p>
              <LocationSelector onChange={setLocation} />
            </>
          )}
          <button
            type="button"
            disabled={!canSearch || isFetching}
            onClick={search}
            className="flex items-center justify-center gap-2 rounded-lg bg-fuchsia-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Search className="h-4 w-4" /> MOSTRAR RANKING
          </button>
        </section>

        <div className="flex-1 rounded-3xl border border-primary/30 bg-card/80 p-4 shadow-[0_0_50px_rgba(255,0,255,0.15)] backdrop-blur-md sm:p-8">
          <h2 className="mb-5 text-center font-display text-sm text-white sm:text-base">{scopeTitle}</h2>
          {needsLocation && !location ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Trophy className="h-12 w-12 opacity-30" />
              <p className="text-center text-sm">Selecciona la ubicación para consultar este ranking.</p>
            </div>
          ) : isLoading || isFetching ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4 text-primary">
              <Loader2 className="h-12 w-12 animate-spin" />
              <p className="font-display text-xs animate-pulse">CARGANDO RANKING…</p>
            </div>
          ) : error ? (
            <div role="alert" className="flex h-64 flex-col items-center justify-center gap-4 text-destructive">
              <AlertCircle className="h-16 w-16" />
              <p className="font-display text-sm">NO SE PUDO CARGAR EL RANKING</p>
            </div>
          ) : !scores || scores.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4 text-muted-foreground">
              <Trophy className="h-16 w-16 opacity-20" />
              <p className="font-display text-center text-xs">TODAVÍA NO HAY PUNTUACIONES EN ESTA UBICACIÓN</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-2 border-b-2 border-primary/20 px-3 py-4 font-display text-[10px] uppercase tracking-widest text-secondary sm:gap-4 sm:px-6 sm:text-xs">
                <div className="col-span-2 text-center">RANK</div>
                <div className="col-span-6">PILOTO</div>
                <div className="col-span-4 text-right">PUNTOS</div>
              </div>
              <div className="custom-scrollbar max-h-[55vh] space-y-3 overflow-y-auto pr-1 sm:pr-2">
                {scores.slice(0, 100).map((score, index) => (
                  <div
                    key={score.id}
                    className={`grid grid-cols-12 items-center gap-2 rounded-xl border px-3 py-4 font-display text-xs transition-all sm:gap-4 sm:px-6 sm:py-5 sm:text-sm ${
                      index === 0
                        ? "border-accent bg-accent/10 text-accent box-glow-secondary"
                        : index === 1
                          ? "border-secondary bg-secondary/10 text-secondary"
                          : index === 2
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/20 bg-input text-foreground"
                    }`}
                  >
                    <div className="col-span-2 text-center opacity-70">#{index + 1}</div>
                    <div className="col-span-6 min-w-0 truncate">
                      <span>{score.playerName}</span>
                      {score.cityName && (
                        <span className="mt-1 block truncate font-sans text-[10px] text-slate-400">
                          {score.cityName}, {score.regionCode}, {score.countryCode}
                        </span>
                      )}
                    </div>
                    <div className="col-span-4 text-right tracking-wider">{score.score.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: hsl(var(--card)); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--primary)); border-radius: 4px; }
      `}</style>
    </div>
  );
}
