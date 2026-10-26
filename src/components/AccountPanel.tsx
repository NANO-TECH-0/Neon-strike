import { useEffect, useState, type FormEvent } from "react";
import { Check, Loader2, LogIn, LogOut, UserRound } from "lucide-react";
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
  provider: "password";
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

export function AccountPanel({ progression, onProgressionChange, onUserChange }: AccountPanelProps) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [location, setLocation] = useState<LocationSelection | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" }).then(async accountResponse => {
      if (!accountResponse.ok) {
        throw new Error("No se pudo comprobar la cuenta.");
      }
      const account = await accountResponse.json() as { user: AccountUser | null; progression?: unknown };
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

  const authenticate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password })
      });
      const body = await response.json() as {
        message?: string;
        user?: AccountUser;
        progression?: unknown;
      };
      if (!response.ok) throw new Error(body.message || "No se pudo acceder a la cuenta.");
      if (!body.user) throw new Error("El servidor no devolvió la cuenta iniciada.");
      const accountUser: AccountUser = {
        ...body.user,
        email: null,
        avatarUrl: null,
        provider: "password",
        countryCode: null,
        countryName: null,
        regionCode: null,
        regionName: null,
        cityName: null
      };
      const merged = mergeAccountProgression(progression, body.progression);
      saveProgression(merged);
      onProgressionChange(merged);
      setUser(accountUser);
      onUserChange(accountUser);
      setPassword("");
      setNotice(authMode === "register" ? "Cuenta creada. ¡Tu progreso ya se está guardando!" : "Sesión iniciada.");
    } catch (authError) {
      console.error("Could not authenticate player account.", authError);
      setError(authError instanceof Error ? authError.message : "No se pudo acceder a la cuenta.");
    } finally {
      setAuthBusy(false);
    }
  };

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
            <p className="mt-1 text-xs text-slate-400">Crea una cuenta o inicia sesión para guardar tu progreso.</p>
          )}
        </div>
        {user && (
          <button type="button" onClick={signOut} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-white/10">
            <LogOut className="h-4 w-4" /> Salir
          </button>
        )}
      </div>

      {!loading && !user && (
        <form onSubmit={authenticate} className="space-y-3">
          <label className="block text-xs text-slate-300">
            Usuario
            <input
              autoComplete="username"
              required
              minLength={3}
              maxLength={24}
              pattern="[A-Za-z0-9_]+"
              value={username}
              onChange={event => setUsername(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
              placeholder="3–24 letras, números o _"
            />
          </label>
          <label className="block text-xs text-slate-300">
            Contraseña
            <input
              autoComplete={authMode === "register" ? "new-password" : "current-password"}
              required
              minLength={8}
              maxLength={128}
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
              placeholder="Mínimo 8 caracteres"
            />
          </label>
          <button
            type="submit"
            disabled={authBusy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-60"
          >
            {authBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {authMode === "register" ? "Crear cuenta" : "Iniciar sesión"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode(authMode === "register" ? "login" : "register");
              setError("");
              setNotice("");
            }}
            className="w-full text-center text-xs text-cyan-200 hover:underline"
          >
            {authMode === "register" ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
          </button>
          <p className="text-xs text-slate-400">El usuario solo puede usar letras, números y guion bajo. La contraseña debe tener al menos 8 caracteres.</p>
        </form>
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
    </section>
  );
}
