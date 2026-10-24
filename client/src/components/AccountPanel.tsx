import { useEffect, useState } from "react";
import { Check, Facebook, Loader2, LogOut, UserRound } from "lucide-react";
import { LocationSelector, type LocationSelection } from "@/components/LocationSelector";
import {
  mergeAccountProgression,
  saveProgression,
  type GameProgression
} from "@/game/progression";

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

interface AccountPanelProps {
  progression: GameProgression;
  onProgressionChange: (progression: GameProgression) => void;
  onUserChange: (user: AccountUser | null) => void;
}

interface Providers {
  google: boolean;
  facebook: boolean;
}

export function AccountPanel({ progression, onProgressionChange, onUserChange }: AccountPanelProps) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [providers, setProviders] = useState<Providers>({ google: false, facebook: false });
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<LocationSelection | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const authError = new URLSearchParams(window.location.search).get("authError");
    if (authError) {
      setError(authError === "provider_not_configured"
        ? "Ese proveedor no está configurado todavía."
        : "No se pudo iniciar sesión. Inténtalo otra vez.");
      window.history.replaceState({}, "", window.location.pathname);
    }

    Promise.all([
      fetch("/api/auth/providers", { credentials: "include" }),
      fetch("/api/auth/me", { credentials: "include" })
    ]).then(async ([providersResponse, accountResponse]) => {
      if (!providersResponse.ok || !accountResponse.ok) {
        throw new Error("No se pudo comprobar la cuenta.");
      }
      const available = await providersResponse.json() as Providers;
      const account = await accountResponse.json() as { user: AccountUser | null; progression?: unknown };
      setProviders(available);
      if (account.user) {
        const merged = mergeAccountProgression(progression, account.progression);
        saveProgression(merged);
        onProgressionChange(merged);
        setUser(account.user);
        onUserChange(account.user);
      }
    }).catch(loadError => {
      console.error("Could not load account status.", loadError);
      setError("No se pudo comprobar la cuenta. Puedes seguir jugando como invitado.");
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user || loading) return;
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/auth/progression", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(progression)
        });
        if (!response.ok) throw new Error(`Progress sync failed (${response.status}).`);
      } catch (syncError) {
        console.error("Could not sync player progression.", syncError);
        setError("No se pudo sincronizar tu progreso. Intenta iniciar sesión otra vez.");
      }
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [progression, user, loading]);

  useEffect(() => {
    if (user?.countryCode && user.countryName && user.regionCode && user.regionName && user.cityName) {
      setLocation({
        countryCode: user.countryCode,
        countryName: user.countryName,
        regionCode: user.regionCode,
        regionName: user.regionName,
        cityName: user.cityName
      });
    } else {
      setLocation(null);
    }
  }, [user]);

  const signOut = async () => {
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error(`Sign out failed (${response.status}).`);
      setUser(null);
      onUserChange(null);
      setNotice("Sesión cerrada. Puedes continuar jugando como invitado.");
    } catch (signOutError) {
      console.error("Could not sign out.", signOutError);
      setError("No se pudo cerrar la sesión.");
    }
  };

  const saveLocation = async () => {
    if (!location) return;
    setSavingLocation(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/location", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          countryCode: location.countryCode,
          regionCode: location.regionCode,
          cityName: location.cityName
        })
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message || `Location save failed (${response.status}).`);
      const updated = {
        ...user!,
        countryCode: location.countryCode,
        countryName: location.countryName,
        regionCode: location.regionCode,
        regionName: location.regionName,
        cityName: location.cityName
      };
      setUser(updated);
      onUserChange(updated);
      setNotice("Ubicación guardada. Tus próximas puntuaciones aparecerán en sus rankings.");
    } catch (saveError) {
      console.error("Could not save account location.", saveError);
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la ubicación.");
    } finally {
      setSavingLocation(false);
    }
  };

  const socialButton = (provider: "google" | "facebook", enabled: boolean) => (
    <a
      href={enabled ? `/api/auth/${provider}` : undefined}
      aria-disabled={!enabled}
      className={`flex items-center justify-center gap-3 rounded-xl border px-4 py-3 font-semibold transition ${
        enabled
          ? "border-cyan-300/50 bg-slate-900 text-white hover:bg-cyan-900/40"
          : "cursor-not-allowed border-slate-600 bg-slate-900/50 text-slate-500"
      }`}
    >
      {provider === "google" ? <span className="font-bold text-lg">G</span> : <Facebook className="h-5 w-5" />}
      {enabled ? `Continuar con ${provider === "google" ? "Google" : "Facebook"}` : `${provider === "google" ? "Google" : "Facebook"} no configurado`}
    </a>
  );

  return (
    <section className="w-full rounded-2xl border border-cyan-300/30 bg-slate-950/85 p-4 text-left sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full border border-cyan-300/40 object-cover" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-200">
            <UserRound className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xs text-cyan-100">
            {user ? "CUENTA Y PROGRESO" : "REGISTRO / INICIO DE SESIÓN"}
          </h2>
          {loading ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Loader2 className="h-3 w-3 animate-spin" /> Comprobando sesión…</p>
          ) : user ? (
            <p className="mt-1 truncate text-sm text-white">{user.displayName}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-400">Invitado · inicia sesión para sincronizar y competir.</p>
          )}
        </div>
        {user && (
          <button type="button" onClick={signOut} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-white/10">
            <LogOut className="h-4 w-4" /> Salir
          </button>
        )}
      </div>

      {!loading && !user && (
        <div className="grid gap-2 sm:grid-cols-2">
          {socialButton("google", providers.google)}
          {socialButton("facebook", providers.facebook)}
        </div>
      )}

      {user && (
        <div className="space-y-3">
          <p className="text-xs text-slate-300">Elige dónde participar en los rankings regionales:</p>
          <LocationSelector
            value={{
              countryCode: user.countryCode ?? "",
              countryName: user.countryName ?? "",
              regionCode: user.regionCode ?? "",
              regionName: user.regionName ?? "",
              cityName: user.cityName ?? ""
            }}
            onChange={setLocation}
          />
          <button
            type="button"
            onClick={saveLocation}
            disabled={!location || savingLocation}
            className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar ubicación
          </button>
          {user.cityName && <p className="text-xs text-emerald-200">Ubicación actual: {user.cityName}, {user.regionName}, {user.countryName}</p>}
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
      {notice && <p role="status" className="mt-3 text-xs text-emerald-200">{notice}</p>}
      {!loading && !user && !providers.google && !providers.facebook && (
        <p className="mt-3 text-xs text-amber-200">El administrador debe configurar credenciales OAuth en el servidor. El modo invitado sigue disponible.</p>
      )}
    </section>
  );
}
